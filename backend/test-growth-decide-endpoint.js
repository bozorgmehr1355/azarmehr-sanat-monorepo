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

// ── No-send regression guard ────────────────────────────────────────────
// Rule 1 (search): backend has NO WhatsApp/send/broadcast adapter module.
//   - handlers/whatsapp-rules.js only does CRUD on a rules table (no send).
//   - The real send/broadcast lives in the separate whatsapp-broadcast-api service.
// Rule 2 (mock): N/A — there is no safe adapter boundary inside backend to mock.
// Rule 3 (no boundary): assert the endpoint returns decision output ONLY and
//   document the missing boundary.
const SEND_RESULT_FIELDS = [
  'sent', 'messageId', 'message_id', 'broadcastId', 'broadcast_id',
  'whatsapp', 'delivery', 'sendResult', 'send_result', 'delivered',
  'recipients', 'provider', 'ultramsg', 'twilio', 'statusCode',
];

test('regression: no-send boundary — BLOCKED_TO_MOCK_SEND_ADAPTER_BOUNDARY_NOT_FOUND', async () => {
  // Module dependency check: growth-decide.js must not require any send/broadcast
  // adapter. The only allowed internal dep is ./growth-decision (pure).
  const modPath = require.resolve('./handlers/growth-decide');
  const sendAdapterPattern = /send|broadcast|whatsapp|ultramsg|notify|deliver/i;
  const deps = Object.keys(require.cache)
    .filter((p) => p.startsWith(modPath.slice(0, modPath.lastIndexOf('\\'))))
    .filter((p) => p.endsWith('.js'));
  // growth-decide.js itself + growth-decision.js (pure) are the only local deps.
  for (const dep of deps) {
    if (dep.endsWith('growth-decide.js')) continue;
    if (dep.endsWith('growth-decision.js')) continue;
    // If any other local module is loaded by the handler tree, fail loudly.
    throw new Error('UNEXPECTED_DEP ' + dep);
  }

  // Endpoint output check: even on the SEND_ALLOWED path (where a naive impl
  // might fire a message), the response must contain ONLY decision fields.
  const res = mockRes();
  await handleGrowthDecide(mockReq({ body: eventToBody(validEvent()) }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.ok, true);

  const allowedKeys = ['ok', 'decision', 'reason_code', 'reason_message', 'evidence'];
  const actualKeys = Object.keys(res.body);
  for (const key of actualKeys) {
    if (!allowedKeys.includes(key)) {
      throw new Error(
        'BLOCKED_TO_MOCK_SEND_ADAPTER_BOUNDARY_NOT_FOUND — unexpected response key: ' + key
      );
    }
  }
  for (const forbidden of SEND_RESULT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(res.body, forbidden)) {
      throw new Error(
        'BLOCKED_TO_MOCK_SEND_ADAPTER_BOUNDARY_NOT_FOUND — send-result field leaked: ' + forbidden
      );
    }
  }
  // Positive control: decision fields are present.
  assert.strictEqual(res.body.decision, 'SEND_ALLOWED');
  assert.ok(res.body.reason_code);
  assert.ok(res.body.evidence);
});

console.log('\nAll ' + passed + ' growth-decide endpoint tests passed.');
