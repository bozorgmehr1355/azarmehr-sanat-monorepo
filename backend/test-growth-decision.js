// Focused acceptance tests for Growth Intervention Decision Layer (Slice-1).
// Pure unit tests — no DB, no external services, no network.
// Run: node backend/test-growth-decision.js

'use strict';

const assert = require('assert');
const {
  decideGrowthIntervention,
  explainGrowthIntervention,
  DECISION,
  TEMPLATE_KEY,
  TEMPLATE_TEXT,
} = require('./handlers/growth-decision');

// Build a fully-valid event that should resolve to SEND_ALLOWED.
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

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('  ✅ ' + name);
}

console.log('Growth Intervention Decision Layer — acceptance tests');

// Acceptance: valid event but no automation policy => REQUIRE_APPROVAL
test('valid event but no automation policy => REQUIRE_APPROVAL', () => {
  const r = decideGrowthIntervention(validEvent({ automation_policy: null }));
  assert.strictEqual(r, DECISION.REQUIRE_APPROVAL);
});

// Acceptance: missing portal referral => BLOCKED
test('missing portal referral => BLOCKED', () => {
  const r = decideGrowthIntervention(
    validEvent({ portal_referral: { present: false, trusted: true } })
  );
  assert.strictEqual(r, DECISION.BLOCKED);
});

// Acceptance: opt-out unavailable => BLOCKED
test('opt-out unavailable => BLOCKED', () => {
  const r = decideGrowthIntervention(validEvent({ opt_out: null }));
  assert.strictEqual(r, DECISION.BLOCKED);
});

// Acceptance: template contains price => BLOCKED
test('template contains price => BLOCKED', () => {
  const r = decideGrowthIntervention(
    validEvent({
      template: {
        key: TEMPLATE_KEY,
        text: 'این محصول قیمت ۱۲۰۰۰ تومان دارد',
        approved: true,
      },
    })
  );
  assert.strictEqual(r, DECISION.BLOCKED);
});

// Acceptance: all valid with approved automation policy => SEND_ALLOWED
test('all valid with approved automation policy => SEND_ALLOWED', () => {
  const r = decideGrowthIntervention(validEvent());
  assert.strictEqual(r, DECISION.SEND_ALLOWED);
});

// Extra regression guards
test('missing customer_id => BLOCKED', () => {
  assert.strictEqual(decideGrowthIntervention(validEvent({ customer_id: '' })), DECISION.BLOCKED);
});
test('missing conversation_id => BLOCKED', () => {
  assert.strictEqual(
    decideGrowthIntervention(validEvent({ conversation_id: null })),
    DECISION.BLOCKED
  );
});
test('channel not whatsapp => BLOCKED', () => {
  assert.strictEqual(
    decideGrowthIntervention(validEvent({ channel: 'sms' })),
    DECISION.BLOCKED
  );
});
test('silence window not proven => BLOCKED', () => {
  assert.strictEqual(
    decideGrowthIntervention(validEvent({ silence_window_proven: false })),
    DECISION.BLOCKED
  );
});
test('opt-out true => BLOCKED', () => {
  assert.strictEqual(decideGrowthIntervention(validEvent({ opt_out: true })), DECISION.BLOCKED);
});
test('cooldown not verified => BLOCKED', () => {
  assert.strictEqual(
    decideGrowthIntervention(validEvent({ cooldown_verified: false })),
    DECISION.BLOCKED
  );
});
test('template not approved => BLOCKED', () => {
  assert.strictEqual(
    decideGrowthIntervention(
      validEvent({ template: { key: TEMPLATE_KEY, text: TEMPLATE_TEXT, approved: false } })
    ),
    DECISION.BLOCKED
  );
});
test('template key mismatch => BLOCKED', () => {
  assert.strictEqual(
    decideGrowthIntervention(
      validEvent({ template: { key: 'wrong.key', text: TEMPLATE_TEXT, approved: true } })
    ),
    DECISION.BLOCKED
  );
});
test('unapproved automation policy => REQUIRE_APPROVAL', () => {
  assert.strictEqual(
    decideGrowthIntervention(validEvent({ automation_policy: { approved: false } })),
    DECISION.REQUIRE_APPROVAL
  );
});

console.log('\n--- explainGrowthIntervention (reason_code + evidence) ---');

// Helper: expect a BLOCKED with a given reason_code on the first decisive rule.
function expectBlock(reasonCode, overrides) {
  const r = explainGrowthIntervention(validEvent(overrides));
  assert.strictEqual(r.decision, DECISION.BLOCKED);
  assert.strictEqual(r.reason_code, reasonCode);
  assert.strictEqual(typeof r.reason_message, 'string');
  assert.ok(r.evidence && typeof r.evidence === 'object');
  return r;
}

// Acceptance: valid event but no automation policy => REQUIRE_APPROVAL with reason + evidence
test('explain: no automation policy => REQUIRE_APPROVAL + AUTOMATION_POLICY_APPROVAL_REQUIRED', () => {
  const r = explainGrowthIntervention(validEvent({ automation_policy: null }));
  assert.strictEqual(r.decision, DECISION.REQUIRE_APPROVAL);
  assert.strictEqual(r.reason_code, 'AUTOMATION_POLICY_APPROVAL_REQUIRED');
  assert.strictEqual(r.evidence.automation_policy_approved, false);
  assert.strictEqual(r.evidence.customer_id_present, true);
});

// Acceptance: missing portal referral => BLOCKED + MISSING_TRUSTED_PORTAL_REFERRAL
test('explain: missing portal referral => BLOCKED + MISSING_TRUSTED_PORTAL_REFERRAL', () => {
  const r = expectBlock('MISSING_TRUSTED_PORTAL_REFERRAL', {
    portal_referral: { present: false, trusted: true },
  });
  assert.strictEqual(r.evidence.portal_referral.present, false);
});

// Acceptance: opt-out unavailable => BLOCKED + OPT_OUT_UNAVAILABLE
test('explain: opt-out unavailable => BLOCKED + OPT_OUT_UNAVAILABLE', () => {
  const r = expectBlock('OPT_OUT_UNAVAILABLE', { opt_out: null });
  assert.strictEqual(r.evidence.opt_out, null);
});

// Acceptance: template contains price => BLOCKED + PRICE_OR_DIRECT_QUOTE_DETECTED
test('explain: template contains price => BLOCKED + PRICE_OR_DIRECT_QUOTE_DETECTED', () => {
  const r = expectBlock('PRICE_OR_DIRECT_QUOTE_DETECTED', {
    template: { key: TEMPLATE_KEY, text: 'این محصول قیمت ۱۲۰۰۰ تومان دارد', approved: true },
  });
  assert.strictEqual(r.evidence.template_has_price, true);
});

// Acceptance: all valid with approved automation policy => SEND_ALLOWED
test('explain: all valid + approved => SEND_ALLOWED + evidence', () => {
  const r = explainGrowthIntervention(validEvent());
  assert.strictEqual(r.decision, DECISION.SEND_ALLOWED);
  assert.strictEqual(r.reason_code, 'SEND_ALLOWED');
  assert.strictEqual(r.evidence.customer_id_present, true);
  assert.strictEqual(r.evidence.conversation_id_present, true);
  assert.strictEqual(r.evidence.channel, 'whatsapp');
  assert.strictEqual(r.evidence.portal_referral.trusted, true);
  assert.strictEqual(r.evidence.silence_window_proven, true);
  assert.strictEqual(r.evidence.opt_out, false);
  assert.strictEqual(r.evidence.cooldown_verified, true);
  assert.strictEqual(r.evidence.template_key, TEMPLATE_KEY);
  assert.strictEqual(r.evidence.template_approved, true);
  assert.strictEqual(r.evidence.template_has_price, false);
  assert.strictEqual(r.evidence.automation_policy_approved, true);
});

// Blocked priority ordering: customer_id missing beats all other BLOCKED rules.
test('explain: BLOCKED priority — missing customer_id wins over channel/referral', () => {
  const r = explainGrowthIntervention(
    validEvent({
      customer_id: '',
      channel: 'sms',
      portal_referral: { present: false, trusted: false },
    })
  );
  assert.strictEqual(r.decision, DECISION.BLOCKED);
  assert.strictEqual(r.reason_code, 'MISSING_CUSTOMER_ID');
});

// Distinct reason codes for each BLOCKED rule.
test('explain: MISSING_CONVERSATION_ID', () => {
  expectBlock('MISSING_CONVERSATION_ID', { conversation_id: null });
});
test('explain: INVALID_CHANNEL', () => {
  expectBlock('INVALID_CHANNEL', { channel: 'sms' });
});
test('explain: SILENCE_WINDOW_NOT_PROVEN', () => {
  expectBlock('SILENCE_WINDOW_NOT_PROVEN', { silence_window_proven: false });
});
test('explain: CUSTOMER_OPTED_OUT', () => {
  expectBlock('CUSTOMER_OPTED_OUT', { opt_out: true });
});
test('explain: COOLDOWN_NOT_VERIFIED', () => {
  expectBlock('COOLDOWN_NOT_VERIFIED', { cooldown_verified: false });
});
test('explain: TEMPLATE_MISSING_OR_NOT_APPROVED (not approved)', () => {
  expectBlock('TEMPLATE_MISSING_OR_NOT_APPROVED', {
    template: { key: TEMPLATE_KEY, text: TEMPLATE_TEXT, approved: false },
  });
});
test('explain: TEMPLATE_MISSING_OR_NOT_APPROVED (key mismatch)', () => {
  expectBlock('TEMPLATE_MISSING_OR_NOT_APPROVED', {
    template: { key: 'wrong.key', text: TEMPLATE_TEXT, approved: true },
  });
});

console.log('\nAll ' + passed + ' growth-decision tests passed.');
