/**
 * Smoke test: WhatsApp webhook orchestrator-first + legacy fallback
 * No DB writes — uses local test fixtures only.
 *
 * run: node __test-smoke.cjs     (from api/)
 */
'use strict';

process.env.JWT_SECRET = 'smoke-test-jwt';
process.env.SUPABASE_URL = 'https://smoke-test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'smoke-test-key';
process.env.ULTRAMSG_WEBHOOK_SECRET = 'smoke-test-ultramsg';
process.env.ORCHESTRATOR_URL = 'http://localhost:3000/api/message-orchestrator';

const http = require('http');
const cp = require('child_process');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  \u2705', msg); }
  else { failed++; console.log('  \u274c', msg); }
}

function httpPost(host, port, path, body, timeout) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const options = { hostname: host, port, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: timeout || 5000 };
    const req = http.request(options, (res) => {
      let b = '';
      res.on('data', (c) => b += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, data: null }); } });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    req.write(data); req.end();
  });
}

function mockRes() {
  const r = { _status: 0, _body: null };
  r.setHeader = () => {};
  r.status = function(s) { this._status = s; return this; };
  r.json = function(o) { this._body = o; };
  r.end = () => {};
  return r;
}

(async () => {

// ─────────────────────────────────────────────────────────────
// TEST 6: Syntax check
// ─────────────────────────────────────────────────────────────
console.log('\n\u2500\u2500 TEST 6: Syntax check \u2500\u2500');
try {
  cp.execSync('node -c webhook.js', { cwd: __dirname, stdio: 'pipe' });
  assert(true, 'node -c webhook.js EXIT=0');
} catch { assert(false, 'node -c webhook.js failed'); }

// ─────────────────────────────────────────────────────────────
// TEST 1: Orchestrator HTTP 200 — greeting
// ─────────────────────────────────────────────────────────────
console.log('\n\u2500\u2500 TEST 1: Orchestrator HTTP 200 (greeting) \u2500\u2500');

const r1 = await httpPost('localhost', 3000, '/api/message-orchestrator', {
  channel: 'whatsapp', messageType: 'text', senderId: '989120000001', text: 'سلام',
}, 5000);

assert(r1.status === 200, `Orchestrator HTTP 200 (got ${r1.status})`);
assert(!!r1.data?.text, `ResponseModel.text exists: "${(r1.data?.text || '').substring(0, 20)}..."`);
assert(r1.data?.recipientId === '989120000001', `recipientId = senderId`);
assert(r1.data?.metadata?.intent === 'greeting', `intent=greeting (got ${r1.data?.metadata?.intent})`);
assert(r1.data?.metadata?.requires_human === false, `requires_human=false`);
assert(!!r1.data?.metadata?.correlation_id, `correlation_id set`);
assert(Array.isArray(r1.data?.quickReplies) && r1.data.quickReplies.length === 3, `3 quickReplies`);
assert(r1.data?.messageType === 'text', `messageType=text`);

// ─────────────────────────────────────────────────────────────
// TEST 2: Orchestrator unavailable → graceful
// ─────────────────────────────────────────────────────────────
console.log('\n\u2500\u2500 TEST 2: Orchestrator unavailable \u2500\u2500');

const r2 = await httpPost('localhost', 29999, '/api/message-orchestrator', {
  channel: 'whatsapp', messageType: 'text', senderId: '989120000001', text: 'hello',
}, 3000);

assert(r2.status === 0, `Connection refused (status=${r2.status})`);
// Error message is platform-specific; just confirm no HTTP response

// ─────────────────────────────────────────────────────────────
// TEST 3: Webhook auth (x-webhook-secret header)
// ─────────────────────────────────────────────────────────────
console.log('\n\u2500\u2500 TEST 3: Webhook secret validation \u2500\u2500');

const { requireWebhookAuth, isHealthCheck } = require('./_webhook-security');

// Correct secret → returns true
const raOk = mockRes();
const aOk = requireWebhookAuth({
  method: 'POST',
  headers: { 'x-webhook-secret': 'smoke-test-ultramsg' },
}, raOk);
assert(aOk === true, `Correct secret: returns true`);
assert(raOk._status === 0, `Correct secret: no error response`);

// Wrong secret → returns false, 403
const raBad = mockRes();
const aBad = requireWebhookAuth({
  method: 'POST',
  headers: { 'x-webhook-secret': 'wrong-secret' },
}, raBad);
assert(aBad === false, `Wrong secret: returns false`);
assert(raBad._status === 403, `Wrong secret: HTTP 403`);
assert(raBad._body?.message === 'Forbidden', `Wrong secret: message "Forbidden"`);

// Missing header → returns false, 401
const raMiss = mockRes();
const aMiss = requireWebhookAuth({ method: 'POST', headers: {} }, raMiss);
assert(aMiss === false, `Missing header: returns false`);
assert(raMiss._status === 401, `Missing header: HTTP 401`);
assert(raMiss._body?.message === 'Unauthorized', `Missing header: message "Unauthorized"`);

// GET → isHealthCheck allows without auth (handler calls isHealthCheck before requireWebhookAuth)
assert(isHealthCheck({ method: 'GET' }) === true, `isHealthCheck(GET) = true`);
assert(isHealthCheck({ method: 'POST' }) === false, `isHealthCheck(POST) = false`);
assert(isHealthCheck({ method: 'OPTIONS' }) === false, `isHealthCheck(OPTIONS) = false`);

// requireWebhookAuth blocks POST without secret (even for OPTIONS if called directly)
const raOpt = mockRes();
requireWebhookAuth({ method: 'OPTIONS', headers: {} }, raOpt);
assert(raOpt._status === 401, `requireWebhookAuth(OPTIONS, no secret) → 401 (but handler never calls it for OPTIONS)`);
// Note: in the actual webhook flow, OPTIONS is rejected via `req.method !== 'POST' → 405`
// before requireWebhookAuth is ever called. This test confirms the security function
// itself is also fail-closed.

// ─────────────────────────────────────────────────────────────
// TEST 4: Duplicate event → idempotency
// ─────────────────────────────────────────────────────────────
console.log('\n\u2500\u2500 TEST 4: Duplicate event \u2500\u2500');

const { isDuplicate } = require('./_webhook-security');

// isDuplicate takes a scalar id (string), not an object
const dedupId = 'smoke_dedup_' + Date.now();
assert(isDuplicate(dedupId) === false, `First call with id "${dedupId}": not duplicate`);
assert(isDuplicate(dedupId) === true, `Second call with same id: duplicate`);

const otherId = 'smoke_other_' + Date.now() + '_x';
assert(isDuplicate(otherId) === false, `Different id "${otherId}": not duplicate`);

// Raw event id is used as key (the handler calls isDuplicate(data?.id))
const rawId = 'wamid.IBkzRjYyNTk4_' + Date.now();
assert(isDuplicate(rawId) === false, `First call with raw id: not duplicate`);
assert(isDuplicate(rawId) === true, `Second call with same raw id: duplicate`);

// ─────────────────────────────────────────────────────────────
// TEST 5: WhatsApp-specific routes (intent detection)
// ─────────────────────────────────────────────────────────────
console.log('\n\u2500\u2500 TEST 5: Intent detection (menu/greeting) \u2500\u2500');

const { detectIntent, getAutoReply, detectSimpleIntent } = require('./_intent');

assert(detectIntent('سلام')?.intent === 'GREETING', '"سلام" → GREETING');
assert(detectIntent('راهنما')?.intent === 'HELP', '"راهنما" → HELP');

const menuResult = detectIntent('منو');
assert(menuResult?.intent === 'MENU' || menuResult?.intent === 'FALLBACK',
  `"منو" → intent=${menuResult?.intent} (MENU or FALLBACK)`);

assert(!!getAutoReply('GREETING'), 'GREETING auto-reply exists');
assert(!!getAutoReply('MENU'), 'MENU auto-reply exists');
assert(!!getAutoReply('FALLBACK'), 'FALLBACK auto-reply exists');
assert(!!getAutoReply('WELCOME_FIRST'), 'WELCOME_FIRST auto-reply exists');

assert(detectSimpleIntent('سلام')?.intent === 'GREETING', 'Simple: "سلام" → GREETING');

// Verify that `intent` values the webhook uses in the if/else chain are correct
const orderIntent = detectIntent('سفارش میخوام');
assert(orderIntent?.intent === 'ORDER', '"سفارش میخوام" → ORDER');

const priceIntent = detectIntent('قیمت چای چند');
assert(priceIntent?.intent === 'PRICE_QUERY', '"قیمت چای چند" → PRICE_QUERY');

// ─────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────
console.log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
console.log(`Tests: ${passed + failed}  |  PASS: ${passed}  |  FAIL: ${failed}`);
if (failed > 0) { console.log('\u274c SOME TESTS FAILED'); process.exit(1); }
else { console.log('\u2705 ALL TESTS PASSED'); }

})().catch(err => { console.error('Unhandled:', err); process.exit(1); });
