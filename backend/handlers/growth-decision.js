// Growth Intervention Decision Layer — Slice-1
// Pure, side-effect-free decision function.
// Returns exactly one of: SEND_ALLOWED | REQUIRE_APPROVAL | BLOCKED
//
// Trigger:  growth.silence_after_buying_intent.detected
// Channel:  whatsapp
// Shadow:   hesitation_before_purchase
// Mode:     propose-first, approve-before-send
//
// No DB, no external services, no auth/JWT. Input -> decision only.

'use strict';

const TRIGGER = 'growth.silence_after_buying_intent.detected';
const CHANNEL = 'whatsapp';
const SHADOW_INTENT = 'hesitation_before_purchase';
const TEMPLATE_KEY = 'growth.whatsapp.hesitation_after_referral.v1';
const TEMPLATE_TEXT =
  'اگر فقط بین گزینه‌ها مردد هستید، می‌توانیم تفاوت کاربردی‌شان را خیلی کوتاه بگوییم.';

const DECISION = {
  SEND_ALLOWED: 'SEND_ALLOWED',
  REQUIRE_APPROVAL: 'REQUIRE_APPROVAL',
  BLOCKED: 'BLOCKED',
};

// Detect price or a direct quote in a message body.
// Intentionally conservative: only explicit price signals block.
function containsPriceOrQuote(text) {
  if (!text || typeof text !== 'string') return false;
  const patterns = [
    /قیمت/i,
    /تومان/i,
    /ریال/i,
    /هریم/i,
    /مبلغ/i,
    /نرخ/i,
    /رایگان/i,
    /﷼/,
    /\$\s*\d/,
    /€\s*\d/,
    /\d[\d,]*\s*(تومان|ریال|هزار|میلیون)/i,
    /قیمت.*\d/i,
  ];
  return patterns.some((re) => re.test(text));
}

function isMissing(value) {
  return value == null || value === '';
}

// event shape (all fields optional; missing/incorrect => BLOCKED per rules):
//   trigger, channel, shadow_intent
//   customer_id            (string|number, required)
//   conversation_id        (string|number, required)
//   portal_referral        { present: boolean, trusted: boolean }
//   silence_window_proven  boolean
//   opt_out                boolean | null   (null/undefined => unavailable => BLOCKED)
//   cooldown_verified      boolean
//   template               { key, text, approved }
//   automation_policy      { approved: boolean } | null

// Shared evaluator: returns the full audit record.
// BLOCKED rules keep their strict priority order (1..9); then REQUIRE_APPROVAL (10);
// then SEND_ALLOWED (11). decideGrowthIntervention wraps this for backward compat.
function evaluateGrowthIntervention(event) {
  if (!event || typeof event !== 'object') {
    return block('MISSING_CUSTOMER_ID', 'event is missing or not an object', evidenceFor(event));
  }

  // Rule 1
  if (isMissing(event.customer_id)) {
    return block('MISSING_CUSTOMER_ID', 'customer_id is required', evidenceFor(event));
  }
  // Rule 2
  if (isMissing(event.conversation_id)) {
    return block('MISSING_CONVERSATION_ID', 'conversation_id is required', evidenceFor(event));
  }
  // Rule 3
  if (event.channel !== CHANNEL) {
    return block('INVALID_CHANNEL', 'channel must be whatsapp', evidenceFor(event));
  }
  // Rule 4: trusted portal referral must be present AND trusted
  const ref = event.portal_referral;
  if (!ref || ref.present !== true || ref.trusted !== true) {
    return block(
      'MISSING_TRUSTED_PORTAL_REFERRAL',
      'trusted portal referral is required',
      evidenceFor(event)
    );
  }
  // Rule 5
  if (event.silence_window_proven !== true) {
    return block('SILENCE_WINDOW_NOT_PROVEN', 'silence window cannot be proven', evidenceFor(event));
  }
  // Rule 6: opt-out true OR unavailable (null/undefined) => BLOCKED
  if (event.opt_out == null) {
    return block('OPT_OUT_UNAVAILABLE', 'opt-out status is unavailable', evidenceFor(event));
  }
  if (event.opt_out === true) {
    return block('CUSTOMER_OPTED_OUT', 'customer has opted out', evidenceFor(event));
  }
  // Rule 7
  if (event.cooldown_verified !== true) {
    return block('COOLDOWN_NOT_VERIFIED', 'cooldown cannot be verified', evidenceFor(event));
  }
  // Rule 8: template must exist, match key, and be approved
  const tpl = event.template;
  if (!tpl || tpl.key !== TEMPLATE_KEY || !tpl.text || tpl.approved !== true) {
    return block(
      'TEMPLATE_MISSING_OR_NOT_APPROVED',
      'template is missing or not approved',
      evidenceFor(event)
    );
  }
  // Rule 9: never send price or direct quote
  if (containsPriceOrQuote(tpl.text)) {
    return block(
      'PRICE_OR_DIRECT_QUOTE_DETECTED',
      'message contains price or direct quote',
      evidenceFor(event)
    );
  }
  // Rule 10: automation policy missing or not explicitly approved
  const policy = event.automation_policy;
  if (!policy || policy.approved !== true) {
    return requireApproval(evidenceFor(event));
  }
  // Rule 11: all eligibility passed + policy explicitly approved
  return sendAllowed(evidenceFor(event));
}

function decideGrowthIntervention(event) {
  return evaluateGrowthIntervention(event).decision;
}

// Audit-ready explanation: decision + first decisive rule + evidence snapshot.
function explainGrowthIntervention(event) {
  const result = evaluateGrowthIntervention(event);
  return {
    decision: result.decision,
    reason_code: result.reason_code,
    reason_message: result.reason_message,
    evidence: result.evidence,
  };
}

// Build an immutable evidence snapshot of the evaluated fields.
function evidenceFor(event) {
  const tpl = event && event.template;
  const ref = event && event.portal_referral;
  return {
    customer_id_present: !isMissing(event && event.customer_id),
    conversation_id_present: !isMissing(event && event.conversation_id),
    channel: (event && event.channel) || null,
    portal_referral: ref ? { present: ref.present === true, trusted: ref.trusted === true } : null,
    silence_window_proven: !!(event && event.silence_window_proven === true),
    opt_out: event ? event.opt_out : null,
    cooldown_verified: !!(event && event.cooldown_verified === true),
    template_key: tpl ? tpl.key || null : null,
    template_approved: !!(tpl && tpl.approved === true),
    template_has_price: !!(tpl && containsPriceOrQuote(tpl.text)),
    automation_policy_approved: !!(
      event &&
      event.automation_policy &&
      event.automation_policy.approved === true
    ),
  };
}

function block(reason_code, reason_message, evidence) {
  return { decision: DECISION.BLOCKED, reason_code, reason_message, evidence };
}
function requireApproval(evidence) {
  return {
    decision: DECISION.REQUIRE_APPROVAL,
    reason_code: 'AUTOMATION_POLICY_APPROVAL_REQUIRED',
    reason_message: 'eligibility passed but automation policy is missing or not approved',
    evidence,
  };
}
function sendAllowed(evidence) {
  return {
    decision: DECISION.SEND_ALLOWED,
    reason_code: 'SEND_ALLOWED',
    reason_message: 'all eligibility checks passed and automation policy is explicitly approved',
    evidence,
  };
}

module.exports = {
  decideGrowthIntervention,
  explainGrowthIntervention,
  containsPriceOrQuote,
  DECISION,
  TRIGGER,
  CHANNEL,
  SHADOW_INTENT,
  TEMPLATE_KEY,
  TEMPLATE_TEXT,
};
