/**
 * Lead submission client (browser). The only place that talks to the lead transport.
 *
 * The form always POSTs JSON to the same-origin endpoint /api/lead, which holds the bot token on
 * the server and forwards the lead to Telegram:
 *   Vercel → api/lead.js (Vercel Function)
 *   cPanel → public/api/lead.php (reached via the /api/lead rewrite in .htaccess)
 * The browser never sees the token, so no environment variables are needed on the client.
 *
 * Every outcome is a typed LeadResult; failures are also logged with console.error.
 */
import type { Lang } from '@/i18n';

export interface LeadPayload {
  name: string;
  phone: string;
  /** Service `leadValue` (legacy English value, e.g. "Web Development"). */
  service: string;
  message: string;
  lang: Lang;
  /** Page the lead was sent from (location.href). */
  page: string;
  /** Honeypot. Must be empty for humans — the server checks it. */
  company: string;
}

export type LeadErrorCode = 'timeout' | 'network' | 'rate-limited' | 'rejected' | 'bad-response';

export type LeadResult = { ok: true } | { ok: false; error: LeadErrorCode };

const ENDPOINT = '/api/lead';
const TIMEOUT_MS = 12_000;

/* ---- Transport ------------------------------------------------------------- */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The endpoint answers `{ ok: boolean, error?: string }`. */
function readOk(body: unknown): boolean | null {
  return isRecord(body) && typeof body.ok === 'boolean' ? body.ok : null;
}

function describe(body: unknown): string {
  if (isRecord(body) && typeof body.error === 'string') return body.error;
  return 'ok: false';
}

function fail(error: LeadErrorCode, detail: string): LeadResult {
  console.error(`[lead] ${error}: ${detail}`);
  return { ok: false, error };
}

/** Sends a lead. Never throws. */
export async function submitLead(payload: LeadPayload): Promise<LeadResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: 'same-origin',
    });
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
