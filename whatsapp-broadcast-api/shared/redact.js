// shared/redact.js — PII-safe logging helpers for whatsapp-broadcast-api.
// No external dependencies. Pure functions, safe to unit-test.
// Purpose: keep useful structured diagnostics WITHOUT leaking customer PII
// (phone numbers, message content, secrets, tokens, raw URLs).

/**
 * Redact a phone / WhatsApp id.
 * Keeps first 2 and last 2 characters, masks the middle.
 * Returns the input unchanged for null/undefined so callers stay simple.
 */
function redactPhone(p) {
  if (p === undefined || p === null) return p;
  const s = String(p);
  if (s.length <= 4) return '***';
  return s.slice(0, 2) + '***' + s.slice(-2);
}

/**
 * Redact free-text message content.
 * The raw body must NEVER be logged. We keep only a length marker.
 */
function redactBody(s) {
  if (s === undefined || s === null) return s;
  const str = String(s);
  if (str.length === 0) return str;
  return `[redacted ${str.length} chars]`;
}

/**
 * Redact a URL: drop query string and fragment so secrets/tokens in the
 * query are never persisted in logs. Keeps only the origin + path shape.
 */
function redactUrl(u) {
  if (!u) return u;
  try {
    const s = String(u);
    return s.split('?')[0].split('#')[0];
  } catch {
    return '[redacted-url]';
  }
}

/**
 * Redact a secret / token value. Values must never be logged.
 */
function redactSecret(s) {
  if (s === undefined || s === null || s === '') return s;
  return '[redacted]';
}

module.exports = { redactPhone, redactBody, redactUrl, redactSecret };
