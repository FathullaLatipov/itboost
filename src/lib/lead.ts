/**
 * Lead submission client (browser). The only place that talks to the lead transport.
 *
 * Modes (build-time env, see .env.example / docs/DEPLOY.md):
 *   telegram (default) — POST to the Telegram Bot API straight from the browser, as the legacy
 *                        site did. The body is URLSearchParams → a CORS "simple request" (no
 *                        preflight) and no personal data ends up in the URL / server logs.
 *   proxy              — POST JSON to PUBLIC_LEAD_ENDPOINT (public/api/lead.php), which keeps
 *                        the bot token on the server.
 *
 * Every outcome is a typed LeadResult; failures are also logged with console.error.
 */
import type { Lang } from '@/i18n';

declare global {
  interface ImportMetaEnv {
    readonly PUBLIC_LEAD_MODE?: string;
    readonly PUBLIC_TG_BOT_TOKEN?: string;
    readonly PUBLIC_TG_CHAT_ID?: string;
    readonly PUBLIC_LEAD_ENDPOINT?: string;
  }
}

export interface LeadPayload {
  name: string;
  phone: string;
  /** Service `leadValue` (legacy English value, e.g. "Web Development"). */
  service: string;
  message: string;
  lang: Lang;
  /** Page the lead was sent from (location.href). */
  page: string;
  /** Honeypot. Must be empty for humans. */
  company: string;
}

export type LeadErrorCode = 'config' | 'timeout' | 'network' | 'rate-limited' | 'rejected' | 'bad-response';

export type LeadResult = { ok: true } | { ok: false; error: LeadErrorCode };

export type LeadMode = 'telegram' | 'proxy';

type LeadConfig =
  | { mode: 'telegram'; token: string; chatId: string }
  | { mode: 'proxy'; endpoint: string };

const TIMEOUT_MS = 12_000;
const DEFAULT_ENDPOINT = '/api/lead.php';

/* ---- Config ---------------------------------------------------------------- */

const nonEmpty = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

// Literal `import.meta.env.X` accesses so Vite can inline them. In proxy mode the token is
// never read, so the minifier drops it from the bundle (the ternary folds to `null`).
const RAW_MODE: unknown = import.meta.env.PUBLIC_LEAD_MODE;
const MODE: LeadMode = RAW_MODE === 'proxy' ? 'proxy' : 'telegram';
const RAW_TOKEN: unknown = import.meta.env.PUBLIC_LEAD_MODE !== 'proxy' ? import.meta.env.PUBLIC_TG_BOT_TOKEN : null;
const RAW_CHAT_ID: unknown = import.meta.env.PUBLIC_LEAD_MODE !== 'proxy' ? import.meta.env.PUBLIC_TG_CHAT_ID : null;
const RAW_ENDPOINT: unknown = import.meta.env.PUBLIC_LEAD_ENDPOINT;

function readConfig(): LeadConfig | null {
  if (MODE === 'proxy') {
    return { mode: 'proxy', endpoint: nonEmpty(RAW_ENDPOINT) ?? DEFAULT_ENDPOINT };
  }
  const token = nonEmpty(RAW_TOKEN);
  const chatId = nonEmpty(RAW_CHAT_ID);
  if (!token || !chatId) return null;
  return { mode: 'telegram', token, chatId };
}

/** True when the form has what it needs to send (used to warn early, not to block). */
export function isLeadConfigured(): boolean {
  return readConfig() !== null;
}

/* ---- Message ------------------------------------------------------------- */

/** Legacy Telegram message format + language and page. Keep in sync with public/api/lead.php. */
export function formatLeadMessage(payload: LeadPayload): string {
  return [
    `Имя: ${payload.name}`,
    `Номер телефона: ${payload.phone}`,
    `Услуга: ${payload.service}`,
    `Сообщение: ${payload.message}`,
    `Язык: ${payload.lang.toUpperCase()}`,
    `Страница: ${payload.page}`,
  ].join('\n');
}

/* ---- Transport ------------------------------------------------------------- */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Both Telegram and our proxy answer `{ ok: boolean, … }`. */
function readOk(body: unknown): boolean | null {
  return isRecord(body) && typeof body.ok === 'boolean' ? body.ok : null;
}

function describe(body: unknown): string {
  if (!isRecord(body)) return 'non-object response';
  if (typeof body.description === 'string') return body.description;
  if (typeof body.error === 'string') return body.error;
  return 'ok: false';
}

function fail(error: LeadErrorCode, detail: string): LeadResult {
  console.error(`[lead] ${error}: ${detail}`);
  return { ok: false, error };
}

async function post(url: string, init: RequestInit): Promise<LeadResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, method: 'POST', signal: controller.signal, credentials: 'omit' });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const ok = readOk(body);
    if (response.ok && ok === true) return { ok: true };
    if (response.status === 429) return fail('rate-limited', `HTTP 429 ${describe(body)}`);
    if (ok === null) return fail('bad-response', `HTTP ${response.status}, unexpected body`);
    return fail('rejected', `HTTP ${response.status} ${describe(body)}`);
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return fail('timeout', `no response within ${TIMEOUT_MS / 1000}s`);
    }
    return fail('network', error instanceof Error ? error.message : 'request failed');
  } finally {
    window.clearTimeout(timer);
  }
}

/** Sends a lead. Never throws. */
export async function submitLead(payload: LeadPayload): Promise<LeadResult> {
  const config = readConfig();
  if (!config) {
    return fail(
      'config',
      'lead transport is not configured — set PUBLIC_TG_BOT_TOKEN and PUBLIC_TG_CHAT_ID (telegram mode) or PUBLIC_LEAD_MODE=proxy, then rebuild',
    );
  }

  if (config.mode === 'proxy') {
    // The proxy validates the honeypot itself, so send it through.
    return post(config.endpoint, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // Telegram mode has no server to judge the honeypot: drop bot submissions here and report
  // success so the bot learns nothing.
  if (payload.company.trim() !== '') return { ok: true };

  const body = new URLSearchParams({ chat_id: config.chatId, text: formatLeadMessage(payload) });
  return post(`https://api.telegram.org/bot${config.token}/sendMessage`, { body });
}
