<?php
/**
 * ITBoost lead proxy — OPT-IN (used when the site is built with PUBLIC_LEAD_MODE=proxy).
 *
 * Browser → POST /api/lead.php (JSON) → Telegram Bot API. The bot token never reaches the client.
 *
 * Secrets (never commit them, never put them in public_html):
 *   1. Environment: ITBOOST_TG_TOKEN, ITBOOST_TG_CHAT_ID   (e.g. SetEnv in the vhost), or
 *   2. A PHP file OUTSIDE the web root: ~/itboost-lead-config.php  (one level above public_html):
 *        <?php return ['token' => '123456:ABC…', 'chat_id' => '123456789'];
 *
 * Request  (application/json): { name, phone, service, message, lang, page, company }
 * Response (application/json): { "ok": true } | { "ok": false, "error": "<code>" }
 *   400 invalid_json / invalid_field   403 forbidden_origin   405 method_not_allowed
 *   413 payload_too_large   415 unsupported_media_type   429 rate_limited
 *   500 not_configured   502 upstream_failed
 *
 * Compatible with PHP 7.4+. Message format must match src/lib/lead.ts → formatLeadMessage().
 * This file could not be executed in the dev environment (no local PHP) — test it on the host
 * (see docs/DEPLOY.md, "Testing the proxy").
 */

declare(strict_types=1);

const ALLOWED_ORIGINS = ['https://itboost.uz', 'https://www.itboost.uz'];
const ALLOWED_SERVICES = [
    'Web Development', 'Internet Shop', 'Platform', 'iOS-Android',
    'Telegram Bot', 'AI Automation', 'UI/UX Design', 'DevOps',
];
const MAX_BODY_BYTES = 16384;
const RATE_LIMIT_MAX = 5;          // requests …
const RATE_LIMIT_WINDOW = 600;     // … per 10 minutes per IP
const UPSTREAM_TIMEOUT = 10;       // seconds

// Warnings must never corrupt the JSON body (they still go to the error log).
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

/** Sends a JSON response and stops. */
function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $code): void
{
    respond($status, ['ok' => false, 'error' => $code]);
}

function str_len(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

/** Trims, normalises newlines and strips control characters (keeps \n). */
function clean_text($value, bool $multiline = false): string
{
    if (!is_string($value)) {
        return '';
    }
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[^\P{C}\n]/u', '', $value) ?? '';
    if (!$multiline) {
        $value = preg_replace('/\s+/u', ' ', $value) ?? '';
    }
    return trim($value);
}

function client_ip(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    // Behind Engintron (nginx → Apache on the same box) REMOTE_ADDR may be loopback when
    // mod_remoteip is not configured. Only then trust the proxy's header.
    if (in_array($ip, ['127.0.0.1', '::1'], true) && !empty($_SERVER['HTTP_X_REAL_IP'])) {
        $candidate = trim((string) $_SERVER['HTTP_X_REAL_IP']);
        if (filter_var($candidate, FILTER_VALIDATE_IP)) {
            $ip = $candidate;
        }
    }
    return $ip;
}

/** File-based sliding window. Returns false when the IP is over the limit. */
function rate_limit_ok(string $ip): bool
{
    $dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'itboost-lead-rl';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        error_log('[itboost-lead] rate limit dir not writable; limit skipped');
        return true; // fail open: never block real leads because of a tmp problem
    }
    $file = $dir . DIRECTORY_SEPARATOR . hash('sha256', $ip . '|itboost') . '.json';
    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        return true;
    }
    $allowed = true;
    if (flock($handle, LOCK_EX)) {
        $now = time();
        $raw = stream_get_contents($handle);
        $hits = json_decode($raw === false ? '' : $raw, true);
        $hits = is_array($hits) ? array_values(array_filter($hits, function ($t) use ($now) {
            return is_int($t) && $t > $now - RATE_LIMIT_WINDOW;
        })) : [];
        if (count($hits) >= RATE_LIMIT_MAX) {
            $allowed = false;
        } else {
            $hits[] = $now;
        }
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($hits));
        fflush($handle);
        flock($handle, LOCK_UN);
    }
    fclose($handle);
    return $allowed;
}

/** @return array{token: string, chat_id: string}|null */
function load_config(): ?array
{
    $token = getenv('TG_BOT_TOKEN') ?: getenv('ITBOOST_TG_TOKEN');
    $chat = getenv('TG_CHAT_ID') ?: getenv('ITBOOST_TG_CHAT_ID');
    if (is_string($token) && $token !== '' && is_string($chat) && $chat !== '') {
        return ['token' => $token, 'chat_id' => $chat];
    }
    // public_html/api/lead.php → ~/itboost-lead-config.php (outside the web root)
    $file = dirname(__DIR__, 2) . '/itboost-lead-config.php';
    if (is_readable($file)) {
        $config = require $file;
        if (is_array($config)
            && isset($config['token'], $config['chat_id'])
            && is_string($config['token']) && $config['token'] !== ''
            && (is_string($config['chat_id']) || is_int($config['chat_id']))
        ) {
            return ['token' => $config['token'], 'chat_id' => (string) $config['chat_id']];
        }
    }
    return null;
}

/** @return bool true when Telegram answered { ok: true } */
function send_to_telegram(string $token, string $chatId, string $text): bool
{
    $url = 'https://api.telegram.org/bot' . $token . '/sendMessage';
    $body = http_build_query(['chat_id' => $chatId, 'text' => $text, 'disable_web_page_preview' => 'true']);
    $response = false;
    $status = 0;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => UPSTREAM_TIMEOUT,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        ]);
        $response = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($response === false) {
            error_log('[itboost-lead] curl error: ' . curl_error($ch));
        }
        if (PHP_VERSION_ID < 80000) {
            curl_close($ch); // no-op (and deprecated) since PHP 8
        }
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => $body,
                'timeout' => UPSTREAM_TIMEOUT,
                'ignore_errors' => true,
            ],
        ]);
        $response = @file_get_contents($url, false, $context);
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
            $status = (int) $m[1];
        }
    }

    if (!is_string($response)) {
        return false;
    }
    $decoded = json_decode($response, true);
    $ok = is_array($decoded) && ($decoded['ok'] ?? false) === true;
    if (!$ok) {
        // Telegram's description never contains the token; no lead data is logged.
        $description = is_array($decoded) && isset($decoded['description']) ? (string) $decoded['description'] : 'no body';
        error_log('[itboost-lead] telegram rejected (HTTP ' . $status . '): ' . substr($description, 0, 200));
    }
    return $ok;
}

/* ---------------------------------------------------------------------------
 * Request handling
 * ------------------------------------------------------------------------- */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    fail(405, 'method_not_allowed');
}

// Same-origin check: browsers always send Origin on POST; fall back to Referer.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === '' && !empty($_SERVER['HTTP_REFERER'])) {
    $parts = parse_url((string) $_SERVER['HTTP_REFERER']);
    if (is_array($parts) && isset($parts['scheme'], $parts['host'])) {
        $origin = $parts['scheme'] . '://' . $parts['host'];
    }
}
if (!in_array($origin, ALLOWED_ORIGINS, true)) {
    fail(403, 'forbidden_origin');
}

$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
if (strpos($contentType, 'application/json') !== 0) {
    fail(415, 'unsupported_media_type');
}

$raw = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
if (!is_string($raw) || $raw === '') {
    fail(400, 'invalid_json');
}
if (strlen($raw) > MAX_BODY_BYTES) {
    fail(413, 'payload_too_large');
}

$data = json_decode($raw, true);
if (!is_array($data)) {
    fail(400, 'invalid_json');
}

// Honeypot: pretend success, send nothing.
if (clean_text($data['company'] ?? '') !== '') {
    respond(200, ['ok' => true]);
}

if (!rate_limit_ok(client_ip())) {
    header('Retry-After: ' . RATE_LIMIT_WINDOW);
    fail(429, 'rate_limited');
}

$name = clean_text($data['name'] ?? '');
$phone = clean_text($data['phone'] ?? '');
$service = clean_text($data['service'] ?? '');
$message = clean_text($data['message'] ?? '', true);
$lang = clean_text($data['lang'] ?? '');
$page = clean_text($data['page'] ?? '');

$phoneDigits = strlen((string) preg_replace('/\D/', '', $phone));
$valid =
    str_len($name) >= 2 && str_len($name) <= 80
    && preg_match('/^[+\d\s().-]{6,32}$/', $phone) === 1 && $phoneDigits >= 9 && $phoneDigits <= 15
    && in_array($service, ALLOWED_SERVICES, true)
    && str_len($message) >= 2 && str_len($message) <= 2000
    && in_array($lang, ['ru', 'uz'], true);

if (!$valid) {
    fail(400, 'invalid_field');
}

// Only keep a page URL that belongs to the site.
$pageOk = false;
foreach (ALLOWED_ORIGINS as $allowed) {
    if (strpos($page, $allowed . '/') === 0 || $page === $allowed) {
        $pageOk = true;
        break;
    }
}
if (!$pageOk || strlen($page) > 300) {
    $page = '—';
}

$config = load_config();
if ($config === null) {
    error_log('[itboost-lead] not configured: set ITBOOST_TG_TOKEN/ITBOOST_TG_CHAT_ID or ~/itboost-lead-config.php');
    fail(500, 'not_configured');
}

$text = implode("\n", [
    'Имя: ' . $name,
    'Номер телефона: ' . $phone,
    'Услуга: ' . $service,
    'Сообщение: ' . $message,
    'Язык: ' . strtoupper($lang),
    'Страница: ' . $page,
]);

if (!send_to_telegram($config['token'], $config['chat_id'], $text)) {
    fail(502, 'upstream_failed');
}

respond(200, ['ok' => true]);
