// Webhook inbound security — P0 hardening (docs/OMNICHANNEL_AI_AGENT_BLUEPRINT.md §16)
// Shared-secret gate + best-effort idempotency. Uses only Node built-in `crypto`.
// No external dependency. Fail-closed by design.

const crypto = require('crypto');
const { parse: parseUrl } = require('url'); // Node built-in; no external dependency

// Temporary alias support: prefer ULTRAMSG_WEBHOOK_SECRET, fall back to legacy WEBHOOK_SECRET.
const SECRET_ENV = 'ULTRAMSG_WEBHOOK_SECRET';
const SECRET_ENV_LEGACY = 'WEBHOOK_SECRET';
const SECRET_HEADER = 'x-webhook-secret'; // Node lowercases request headers

// Query-param secret fallbacks (UltraMsg-compatible + generic compat).
// Priority: header `x-webhook-secret` > query `webhook_secret` > query `secret`.
// NOTE: query secrets are less safe (visible in URLs/proxies/logs); accepted only
// for UltraMsg webhook transport compatibility. Never log their values.
const SECRET_QUERY = 'webhook_secret';
const SECRET_QUERY_LEGACY = 'secret';

// Best-effort in-memory idempotency.
// NOTE: Vercel serverless = multiple instances + cold starts → NOT guaranteed across
// invocations. This only catches obvious intra-instance replays; replay protection
// ultimately depends on the caller + idempotent downstream writes.
const MAX_SEEN = 5000;
const seenIds = new Set();

/**
 * Best-effort duplicate detection by event/message id.
 * Returns true if this id was already seen (treat as duplicate).
 * If id is missing, returns false (cannot dedupe safely).
 */
function isDuplicate(eventId) {
  if (!eventId) return false;
  const key = String(eventId);
  if (seenIds.has(key)) return true;
  if (seenIds.size >= MAX_SEEN) {
    const oldest = seenIds.values().next().value;
    if (oldest !== undefined) seenIds.delete(oldest);
  }
  seenIds.add(key);
  return false;
}

/**
 * True for the unauthenticated GET health/version probe.
 * The handler returns 200 for this WITHOUT requiring the webhook secret,
 * so health checks never leak or need credentials.
 */
function isHealthCheck(req) {
  return !!(req && req.method === 'GET');
}

// Constant-time string comparison to avoid timing side-channels.
function safeEqual(a, b) {
  try {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

// Extract query string from a Node/Vercel request (best-effort, never throws).
function parseQuery(req) {
  if (!req || !req.url) return {};
  try {
    const q = parseUrl(req.url, true).query || {};
    return q;
  } catch {
    return {};
  }
}

// Resolve the supplied secret from the request, in priority order:
//   1. header `x-webhook-secret`
//   2. query `webhook_secret`
//   3. query `secret` (generic compat fallback)
// Returns the secret string, or null if none provided. Never logs the value.
function extractProvidedSecret(req) {
  const headerVal = (req && req.headers) ? (req.headers[SECRET_HEADER] || null) : null;
  if (headerVal) return String(headerVal);
  const q = parseQuery(req);
  if (q[SECRET_QUERY]) return String(q[SECRET_QUERY]);
  if (q[SECRET_QUERY_LEGACY]) return String(q[SECRET_QUERY_LEGACY]);
  return null;
}

/**
 * Reject unauthenticated inbound webhook requests (fail-closed).
 * Writes 401/403 and returns false when not authorized.
 * Never logs the secret, full body, full phone, or token.
 */
function requireWebhookAuth(req, res) {
  // Resolve expected secret: prefer ULTRAMSG_WEBHOOK_SECRET, fall back to legacy WEBHOOK_SECRET.
  const expected = process.env[SECRET_ENV] || process.env[SECRET_ENV_LEGACY] || null;

  // Fail-closed: if no secret is configured, reject ALL inbound webhooks.
  if (!expected) {
    console.warn('[WebhookSec] Webhook secret not configured (checked ULTRAMSG_WEBHOOK_SECRET, WEBHOOK_SECRET) — rejecting inbound webhook (fail-closed)');
    res.status(401).json({ ok: false, message: 'Unauthorized' });
    return false;
  }

  const provided = extractProvidedSecret(req);
  if (!provided) {
    console.warn('[WebhookSec] Missing webhook secret (header or query)');
    res.status(401).json({ ok: false, message: 'Unauthorized' });
    return false;
  }

  if (!safeEqual(provided, expected)) {
    console.warn('[WebhookSec] Invalid webhook secret');
    res.status(403).json({ ok: false, message: 'Forbidden' });
    return false;
  }

  return true;
}

module.exports = { requireWebhookAuth, isDuplicate, isHealthCheck, SECRET_ENV, SECRET_HEADER, SECRET_QUERY, SECRET_QUERY_LEGACY, extractProvidedSecret };
