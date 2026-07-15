// tests/webhook-security.test.js
// P1.1.3 — committed tests for the webhook auth gate + PII redaction.
// No external deps, no mocks. Uses only _webhook-security.js (crypto-only)
// and shared/redact.js so it runs without node_modules installed.
//
// Run: node whatsapp-broadcast-api/tests/webhook-security.test.js

const path = require('path');
const sec = require(path.join(__dirname, '..', 'api', '_webhook-security.js'));
const { requireWebhookAuth, isDuplicate, isHealthCheck, SECRET_HEADER, SECRET_QUERY, SECRET_QUERY_LEGACY, extractProvidedSecret } = sec;
const { redactPhone, redactBody, redactUrl, redactSecret } = require(path.join(__dirname, '..', 'shared', 'redact.js'));

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log('  ✓ ' + name);
  } else {
    failed++;
    failures.push(name + (detail ? ' — ' + detail : ''));
    console.log('  ✗ ' + name + (detail ? ' — ' + detail : ''));
  }
}

// Fake response that captures status + body (mirrors Express res API used by the gate).
function fakeRes() {
  let statusCode = null;
  let body = null;
  const res = {
    status(code) { statusCode = code; return res; },
    json(obj) { body = obj; return res; },
  };
  res._status = () => statusCode;
  res._body = () => body;
  return res;
}

// Run a gate decision with a controlled env (no real secrets touched).
// `query` (optional) is an object serialized into req.url for query-param secret tests.
function runGate(method, headerValue, env, query) {
  const prev = {
    U: process.env.ULTRAMSG_WEBHOOK_SECRET,
    L: process.env.WEBHOOK_SECRET,
  };
  delete process.env.ULTRAMSG_WEBHOOK_SECRET;
  delete process.env.WEBHOOK_SECRET;
  if (env) {
    if (env.ULTRAMSG_WEBHOOK_SECRET) process.env.ULTRAMSG_WEBHOOK_SECRET = env.ULTRAMSG_WEBHOOK_SECRET;
    if (env.WEBHOOK_SECRET) process.env.WEBHOOK_SECRET = env.WEBHOOK_SECRET;
  }
  const res = fakeRes();
  const headers = headerValue ? { [SECRET_HEADER]: headerValue } : {};
  const req = {
    method: method || 'POST',
    headers,
    url: query ? '/api/webhook?' + (new URLSearchParams(query).toString()) : undefined,
  };
  const allowed = requireWebhookAuth(req, res);
  // restore
  delete process.env.ULTRAMSG_WEBHOOK_SECRET;
  delete process.env.WEBHOOK_SECRET;
  if (prev.U !== undefined) process.env.ULTRAMSG_WEBHOOK_SECRET = prev.U;
  if (prev.L !== undefined) process.env.WEBHOOK_SECRET = prev.L;
  return { allowed, status: res._status(), body: res._body() };
}

// Faithful replica of webhook.js top-of-handler decision (isHealthCheck → gate).
function simulateHandler(req, env) {
  if (isHealthCheck(req)) return { ok: true, status: 200 };
  const r = runGate(req.method, req.headers ? req.headers[SECRET_HEADER] : undefined, env);
  return { ok: r.allowed, status: r.status };
}

console.log('\n[1] GET health endpoint — no secret required');
{
  check('isHealthCheck(GET) === true', isHealthCheck({ method: 'GET' }) === true);
  check('isHealthCheck(POST) === false', isHealthCheck({ method: 'POST' }) === false);
  const r = simulateHandler({ method: 'GET' }, {}); // no secret configured at all
  check('GET returns ok without any secret configured', r.ok === true && r.status === 200);
}

console.log('\n[2] POST with no secret configured in env');
{
  const r = runGate('POST', undefined, {});
  check('missing env → 401', r.allowed === false && r.status === 401);
  check('missing env → ok:false in body', r.body && r.body.ok === false);
}

console.log('\n[3] POST with env configured but header absent');
{
  const r = runGate('POST', undefined, { ULTRAMSG_WEBHOOK_SECRET: 's3cr3t' });
  check('missing header → 401', r.allowed === false && r.status === 401);
}

console.log('\n[4] POST with wrong secret');
{
  const r = runGate('POST', 'attacker-guess', { ULTRAMSG_WEBHOOK_SECRET: 's3cr3t' });
  check('wrong secret → 403', r.allowed === false && r.status === 403);
  check('wrong secret → ok:false in body', r.body && r.body.ok === false);
}

console.log('\n[5] POST with correct secret (X-Webhook-Secret)');
{
  const r = runGate('POST', 's3cr3t', { ULTRAMSG_WEBHOOK_SECRET: 's3cr3t' });
  check('correct secret → allowed', r.allowed === true);
  check('correct secret → gate does NOT write a status (handler continues)', r.status === null);
}

console.log('\n[6] WEBHOOK_SECRET alias fallback');
{
  const r = runGate('POST', 'legacy', { WEBHOOK_SECRET: 'legacy' });
  check('WEBHOOK_SECRET accepted when ULTRAMSG_WEBHOOK_SECRET absent', r.allowed === true && r.status === null);
}

console.log('\n[7] ULTRAMSG_WEBHOOK_SECRET precedence over WEBHOOK_SECRET');
{
  const okUltra = runGate('POST', 'ultra', { ULTRAMSG_WEBHOOK_SECRET: 'ultra', WEBHOOK_SECRET: 'legacy' });
  const badLegacy = runGate('POST', 'legacy', { ULTRAMSG_WEBHOOK_SECRET: 'ultra', WEBHOOK_SECRET: 'legacy' });
  check('ultramsg value accepted', okUltra.allowed === true);
  check('legacy value rejected when ultramsg present', badLegacy.allowed === false && badLegacy.status === 403);
}

console.log('\n[8] No secret leakage in responses / error messages');
{
  const SECRET = 's3cr3t-top-secret';
  const r = runGate('POST', 'attacker-guess', { ULTRAMSG_WEBHOOK_SECRET: SECRET });
  const serialized = JSON.stringify(r.body || {});
  check('error message is generic (no secret value)', (r.body && r.body.message ? r.body.message : '').indexOf(SECRET) === -1);
  check('response body never echoes the configured secret', serialized.indexOf(SECRET) === -1);
  check('response body never echoes the supplied token', serialized.indexOf('attacker-guess') === -1);
  check('response body never echoes the header name', serialized.toLowerCase().indexOf(SECRET_HEADER) === -1);
}

console.log('\n[9] Idempotency helper');
{
  check('first sight of id → not duplicate', isDuplicate('evt-1') === false);
  check('second sight of same id → duplicate', isDuplicate('evt-1') === true);
  check('missing id → not duplicate (safe)', isDuplicate(undefined) === false);
}

console.log('\n[10] PII redaction helpers');
{
  const phone = '989121234567';
  const red = redactPhone(phone);
  check('redactPhone keeps prefix/suffix only', red === '98***67', red);
  check('redactPhone never equals raw', redactPhone(phone) !== phone);

  const body = 'لطفا کد ملی من 0012345678 است';
  const rb = redactBody(body);
  check('redactBody never equals raw content', rb !== body);
  check('redactBody returns length marker', rb.indexOf(String(body.length)) !== -1, rb);

  const url = 'https://api.example.com/x?token=abc&secret=xyz';
  const ru = redactUrl(url);
  check('redactUrl strips query string', ru.indexOf('token=') === -1 && ru.indexOf('secret=') === -1, ru);
  check('redactUrl keeps origin+path', ru === 'https://api.example.com/x', ru);

  check('redactSecret always masks', redactSecret('anything') === '[redacted]');
}

console.log('\n[11] POST with correct secret via query webhook_secret');
{
  const r = runGate('POST', undefined, { ULTRAMSG_WEBHOOK_SECRET: 's3cr3t' }, { webhook_secret: 's3cr3t' });
  check('query webhook_secret accepted → allowed', r.allowed === true);
  check('query webhook_secret → gate does NOT write a status', r.status === null);
}

console.log('\n[12] POST with wrong secret via query webhook_secret');
{
  const r = runGate('POST', undefined, { ULTRAMSG_WEBHOOK_SECRET: 's3cr3t' }, { webhook_secret: 'attacker-guess' });
  check('wrong query secret → 403', r.allowed === false && r.status === 403);
  check('wrong query secret → ok:false in body', r.body && r.body.ok === false);
  check('wrong query value never echoed in body', JSON.stringify(r.body || {}).indexOf('attacker-guess') === -1);
}

console.log('\n[13] POST with correct secret via legacy query `secret` (compat fallback)');
{
  const r = runGate('POST', undefined, { ULTRAMSG_WEBHOOK_SECRET: 's3cr3t' }, { secret: 's3cr3t' });
  check('legacy query `secret` accepted → allowed', r.allowed === true);
}

console.log('\n[14] Header takes precedence over query secret');
{
  // header wrong + query correct → header wins → 403
  const headerWinsBad = runGate('POST', 'wrong-header', { ULTRAMSG_WEBHOOK_SECRET: 's3cr3t' }, { webhook_secret: 's3cr3t' });
  check('wrong header + correct query → 403 (header precedence)', headerWinsBad.allowed === false && headerWinsBad.status === 403);
  // both correct → allowed
  const bothOk = runGate('POST', 's3cr3t', { ULTRAMSG_WEBHOOK_SECRET: 's3cr3t' }, { webhook_secret: 's3cr3t' });
  check('correct header + (any) query → allowed', bothOk.allowed === true);
}

console.log('\n[15] POST with no secret at all (no header, no query)');
{
  const r = runGate('POST', undefined, { ULTRAMSG_WEBHOOK_SECRET: 's3cr3t' });
  check('no secret anywhere → 401', r.allowed === false && r.status === 401);
}

console.log('\n[16] extractProvidedSecret priority (unit)');
{
  const hReq = { method: 'POST', headers: { [SECRET_HEADER]: 'H' }, url: '/api/webhook?' + (new URLSearchParams({ webhook_secret: 'Q', secret: 'S' }).toString()) };
  check('header preferred over query', extractProvidedSecret(hReq) === 'H', extractProvidedSecret(hReq));
  const qReq = { method: 'POST', headers: {}, url: '/api/webhook?' + (new URLSearchParams({ webhook_secret: 'Q', secret: 'S' }).toString()) };
  check('webhook_secret preferred over secret', extractProvidedSecret(qReq) === 'Q', extractProvidedSecret(qReq));
  const sReq = { method: 'POST', headers: {}, url: '/api/webhook?' + (new URLSearchParams({ secret: 'S' }).toString()) };
  check('legacy `secret` used only when webhook_secret absent', extractProvidedSecret(sReq) === 'S', extractProvidedSecret(sReq));
  const none = { method: 'POST', headers: {}, url: '/api/webhook' };
  check('no secret → null', extractProvidedSecret(none) === null);
}

console.log('\n----------------------------------------');
console.log(`PASS: ${passed}  FAIL: ${failed}`);
if (failed > 0) {
  console.log('FAILURES:');
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
} else {
  console.log('ALL WEBHOOK SECURITY TESTS PASSED');
  process.exit(0);
}
