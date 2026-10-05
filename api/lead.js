/**
 * Vercel Function: POST /api/lead — server-side proxy for the contact form.
 *
 * The bot token lives ONLY in server environment variables (no PUBLIC_ prefix), so it never
 * reaches the browser. Mirrors public/api/lead.php (the cPanel variant): same validation,
 * honeypot, rate limit and Telegram message format (keep in sync with src/lib/lead.ts).
 *
 * Env (Vercel → Settings → Environment Variables):
 *   ITBOOST_TG_TOKEN    bot token from @BotFather (mark as Sensitive)
 *   ITBOOST_TG_CHAT_ID  chat that receives leads
 * Client build env: PUBLIC_LEAD_MODE=proxy, PUBLIC_LEAD_ENDPOINT=/api/lead
 *
 * Request  (application/json): { name, phone, service, message, lang, page, company }
 * Response (application/json): { ok: true } | { ok: false, error: "<code>" }
 *   400 invalid_json / invalid_field   403 forbidden_origin   405 method_not_allowed
 *   413 payload_too_large   415 unsupported_media_type   429 rate_limited
 *   500 not_configured   502 upstream_failed
 */

const SITE_ORIGINS = ['https://itboost.uz', 'https://www.itboost.uz'];
const ALLOWED_SERVICES = [
  'Web Development',
  'Internet Shop',
  'Platform',
  'iOS-Android',
  'Telegram Bot',
  'AI Automation',
  'UI/UX Design',
  'DevOps',
];
const MAX_BODY_BYTES = 16_384;
const RATE_LIMIT_MAX = 5; // requests …
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // … per 10 minutes per IP (best effort: per instance)
const UPSTREAM_TIMEOUT_MS = 10_000;

/** @type {Map<string, number[]>} */
const hits = new Map();

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {Record<string, unknown>} body
 */
function respond(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(JSON.stringify(body));
}

/** @param {unknown} value @param {boolean} [multiline] */
function cleanText(value, multiline = false) {
  if (typeof value !== 'string') return '';
  // Strip control characters (keep newlines/tabs only in multi-line fields).
  const pattern = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return value.replace(pattern, '').trim();
}

/** @param {import('node:http').IncomingMessage} req */
function header(req, name) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

/** Origins allowed to post: the production domains + the deployment's own host (previews). */
function allowedOrigins(req) {
  const host = header(req, 'x-forwarded-host') || header(req, 'host');
  return host ? [...SITE_ORIGINS, `https://${host}`] : SITE_ORIGINS;
}

function clientIp(req) {
  const forwarded = header(req, 'x-forwarded-for').split(',')[0]?.trim();
  return forwarded || header(req, 'x-real-ip') || req.socket?.remoteAddress || 'unknown';
}

function rateLimitOk(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

/**
 * Body as a parsed object. Vercel's Node helpers usually pre-parse JSON into `req.body`;
 * otherwise read the raw stream (with a size cap).
 * @returns {Promise<{ ok: true, data: unknown } | { ok: false, status: number, error: string }>}
 */
async function readBody(req) {
  /** @type {unknown} */
  const pre = /** @type {{ body?: unknown }} */ (req).body;
  if (pre !== undefined && pre !== null && typeof pre !== 'string' && !Buffer.isBuffer(pre)) {
    return { ok: true, data: pre };
  }
  let raw = '';
  if (typeof pre === 'string') raw = pre;
  else if (Buffer.isBuffer(pre)) raw = pre.toString('utf8');
  else {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) return { ok: false, status: 413, error: 'payload_too_large' };
      chunks.push(chunk);
    }
    raw = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return { ok: false, status: 413, error: 'payload_too_large' };
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return { ok: false, status: 400, error: 'invalid_json' };
  }
}

async function sendToTelegram(token, chatId, text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ chat_id: chatId, text }),
      signal: controller.signal,
    });
    /** @type {unknown} */
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const ok = typeof body === 'object' && body !== null && /** @type {{ ok?: unknown }} */ (body).ok === true;
    if (!response.ok || !ok) {
      const description =
        typeof body === 'object' && body !== null && typeof (/** @type {{ description?: unknown }} */ (body).description) === 'string'
          ? /** @type {{ description: string }} */ (body).description
          : `HTTP ${response.status}`;
      console.error(`[itboost-lead] telegram rejected the message: ${description}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[itboost-lead] telegram request failed:', error instanceof Error ? error.message : error);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const origins = allowedOrigins(req);
  if (!origins.includes(header(req, 'origin'))) {
    return respond(res, 403, { ok: false, error: 'forbidden_origin' });
  }

  if (!header(req, 'content-type').toLowerCase().startsWith('application/json')) {
    return respond(res, 415, { ok: false, error: 'unsupported_media_type' });
  }

  const body = await readBody(req);
  if (!body.ok) return respond(res, body.status, { ok: false, error: body.error });
  const data = body.data;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return respond(res, 400, { ok: false, error: 'invalid_json' });
  }
  /** @type {Record<string, unknown>} */
  const fields = /** @type {Record<string, unknown>} */ (data);

  // Honeypot: pretend success, send nothing.
  if (cleanText(fields.company) !== '') return respond(res, 200, { ok: true });

  if (!rateLimitOk(clientIp(req))) {
    res.setHeader('Retry-After', String(RATE_LIMIT_WINDOW_MS / 1000));
    return respond(res, 429, { ok: false, error: 'rate_limited' });
  }

  const name = cleanText(fields.name);
  const phone = cleanText(fields.phone);
  const service = cleanText(fields.service);
  const message = cleanText(fields.message, true);
  const lang = cleanText(fields.lang);
  let page = cleanText(fields.page);

  const phoneDigits = phone.replace(/\D/g, '').length;
  const valid =
    name.length >= 2 &&
    name.length <= 80 &&
    /^[+\d\s().-]{6,32}$/.test(phone) &&
    phoneDigits >= 9 &&
    phoneDigits <= 15 &&
    ALLOWED_SERVICES.includes(service) &&
    message.length >= 2 &&
    message.length <= 2000 &&
    (lang === 'ru' || lang === 'uz');
  if (!valid) return respond(res, 400, { ok: false, error: 'invalid_field' });

  // Only keep a page URL that belongs to the site.
  const pageOk = page.length <= 300 && origins.some((origin) => page === origin || page.startsWith(`${origin}/`));
  if (!pageOk) page = '—';

  const token = (process.env.ITBOOST_TG_TOKEN ?? '').trim();
  const chatId = (process.env.ITBOOST_TG_CHAT_ID ?? '').trim();
  if (!token || !chatId) {
    console.error('[itboost-lead] not configured: set ITBOOST_TG_TOKEN and ITBOOST_TG_CHAT_ID');
    return respond(res, 500, { ok: false, error: 'not_configured' });
  }

  const text = [
    `Имя: ${name}`,
    `Номер телефона: ${phone}`,
    `Услуга: ${service}`,
    `Сообщение: ${message}`,
    `Язык: ${lang.toUpperCase()}`,
    `Страница: ${page}`,
  ].join('\n');

  if (!(await sendToTelegram(token, chatId, text))) {
    return respond(res, 502, { ok: false, error: 'upstream_failed' });
  }
  return respond(res, 200, { ok: true });
}
