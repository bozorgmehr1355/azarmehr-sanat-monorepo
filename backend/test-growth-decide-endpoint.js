// Minimal endpoint tests for POST /api/growth/decide (Slice-1).
// No HTTP server / framework — the handler is invoked directly with mock
// req/res objects, consistent with the repo's lightweight test style.
// Run: node backend/test-growth-decide-endpoint.js

'use strict';

const assert = require('assert');
const { explainGrowthIntervention, TEMPLATE_KEY, TEMPLATE_TEXT } = require('./handlers/growth-decision');
const handleGrowthDecide = require('./handlers/growth-decide');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
}

// Build a mock req that streams the given raw body string.
function mockReq({ method = 'POST', body = '' } = {}) {
  const listeners = {};
  const req = {
    method,
    on(event, cb) {
      (listeners[event] = listeners[event] || []).push(cb);
      return req;
    },
    resume() {},
  };
  // Emit data/end on next tick so handler's await readRawBody resolves.
  setImmediate(() => {
    if (body) (listeners['data'] || []).forEach((cb) => cb(body));
    (listeners['end'] || []).forEach((cb) => cb());
  });
  return req;
}

function validEvent(overrides = {}) {
  return Object.assign(
    {
      trigger: 'growth.silence_after_buying_intent.detected',
      channel: 'whatsapp',
      shadow_intent: 'hesitation_before_purchase',
      customer_id: 'cust_123',
      conversation_id: 'conv_456',
      portal_referral: { present: true, trusted: true },
      silence_window_proven: true,
      opt_out: false,
      cooldown_verified: true,
      template: { key: TEMPLATE_KEY, text: TEMPLATE_TEXT, approved: true },
      automation_policy: { approved: true },
    },
    overrides
  );
}

function eventToBody(event) {
  return JSON.stringify(event);
}

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('  ✅ ' + name);
}

console.log('POST /api/growth/decide endpoint tests');

// Acceptance: valid event without automation policy => ok true + REQUIRE_APPROVAL
test('valid event without automation policy => ok true + REQUIRE_APPROVAL', async () => {
  const res = mockRes();
  await handleGrowthDecide(
    mockReq({ body: eventToBody(validEvent({ automation_policy: null })) }),
    res
  );
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.ok, true);
  assert.strictEqual(res.body.decision, 'REQUIRE_APPROVAL');
  assert.strictEqual(res.body.reason_code, 'AUTOMATION_POLICY_APPROVAL_REQUIRED');
});

// Acceptance: missing customer_id => ok true + BLOCKED + MISSING_CUSTOMER_ID
test('missing customer_id => ok true + BLOCKED + MISSING_CUSTOMER_ID', async () => {
  const res = mockRes();
  await handleGrowthDecide(
    mockReq({ body: eventToBody(validEvent({ customer_id: '' })) }),
    res
  );
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.ok, true);
  assert.strictEqual(res.body.decision, 'BLOCKED');
  assert.strictEqual(res.body.reason_code, 'MISSING_CUSTOMER_ID');
});

// Acceptance: non-POST => 405
test('non-POST method => 405', async () => {
  const res = mockRes();
  await handleGrowthDecide(mockReq({ method: 'GET' }), res);
  assert.strictEqual(res.statusCode, 405);
  assert.strictEqual(res.body.ok, false);
  assert.strictEqual(res.body.error, 'METHOD_NOT_ALLOWED');
});

// Acceptance: missing body => 400 INVALID_REQUEST
test('missing body => 400 INVALID_REQUEST', async () => {
  const res = mockRes();
  await handleGrowthDecide(mockReq({ body: '' }), res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.ok, false);
  assert.strictEqual(res.body.error, 'INVALID_REQUEST');
});

// Acceptance: malformed JSON => 400 INVALID_REQUEST
test('malformed JSON => 400 INVALID_REQUEST', async () => {
  const res = mockRes();
  await handleGrowthDecide(mockReq({ body: '{bad json' }), res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.ok, false);
  assert.strictEqual(res.body.error, 'INVALID_REQUEST');
});

// Acceptance: valid + approved => ok true + SEND_ALLOWED
test('all valid + approved => ok true + SEND_ALLOWED', async () => {
  const res = mockRes();
  await handleGrowthDecide(mockReq({ body: eventToBody(validEvent()) }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.ok, true);
  assert.strictEqual(res.body.decision, 'SEND_ALLOWED');
  // sanity: explain output is embedded
  assert.strictEqual(res.body.decision, explainGrowthIntervention(validEvent()).decision);
});

console.log('\nAll ' + passed + ' growth-decide endpoint tests passed.');
