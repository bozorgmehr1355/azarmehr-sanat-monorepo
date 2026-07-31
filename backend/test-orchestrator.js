/**
 * Orchestrator Test — 15-intent coverage + validation
 * run: node test-orchestrator.js
 */
'use strict';

const { processMessage, detectIntent } = require('./handlers/message-orchestrator');

let passed = 0;
let failed = 0;
let assertions = 0;

function assert(condition, msg) {
  assertions++;
  if (condition) { passed++; }
  else { failed++; console.log('  \u274c', msg); }
}

function assertEq(actual, expected, msg) {
  assertions++;
  if (actual === expected) { passed++; }
  else { failed++; console.log('  \u274c', msg, `(got: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)})`); }
}

function assertHas(obj, field, msg) {
  assertions++;
  if (obj && obj[field] !== undefined && obj[field] !== null) { passed++; }
  else { failed++; console.log('  \u274c', msg); }
}

(async () => {

// ──────────────────────────────────────────────────────
// TEST 1: detectIntent — all 15 intents
// ──────────────────────────────────────────────────────
console.log('── TEST 1: detectIntent (15 intents) ──');

assertEq(detectIntent('سلام'), 'greeting', 'سلام → greeting');
assertEq(detectIntent('راهنمایی'), 'help', 'راهنمایی → help');
assertEq(detectIntent('سفارش میدم'), 'order', 'سفارش میدم → order');
assertEq(detectIntent('چای باروتی دارین'), 'product_query', 'چای باروتی دارین → product_query');
assertEq(detectIntent('قیمت چنده'), 'price_query', 'قیمت چنده → price_query');
assertEq(detectIntent('گارانتی چیه'), 'warranty_query', 'گارانتی چیه → warranty_query');
assertEq(detectIntent('پس میدم'), 'warranty_refund', 'پس میدم → warranty_refund');
assertEq(detectIntent('کیفیت بد بود'), 'warranty_dissatisfaction', 'کیفیت بد بود → warranty_dissatisfaction');
assertEq(detectIntent('زرین یعنی چی'), 'brand_question', 'زرین یعنی چی → brand_question');
assertEq(detectIntent('آموزش دم کردن'), 'education', 'آموزش دم کردن → education');
assertEq(detectIntent('شماره تماس'), 'contact', 'شماره تماس → contact');
assertEq(detectIntent('اپراتور'), 'escalation', 'اپراتور → escalation');
assertEq(detectIntent('منو'), 'menu', 'منو → menu');
assertEq(detectIntent('مرسی'), 'general', 'مرسی → general');
assertEq(detectIntent('xyzzy_nonexistent_12345'), 'unknown', 'garbage → unknown');
assertEq(detectIntent(''), 'unknown', 'empty → unknown');
assertEq(detectIntent(null), 'unknown', 'null → unknown');

// ──────────────────────────────────────────────────────
// TEST 2: processMessage — all 15 intent responses
// ──────────────────────────────────────────────────────
console.log('\n── TEST 2: processMessage (all intents) ──');

const BASE_REQ = { channel: 'whatsapp', senderId: '989120000001' };

const testCases = [
  { text: 'سلام', intent: 'greeting' },
  { text: 'راهنما', intent: 'help' },
  { text: 'سفارش میخوام', intent: 'order' },
  { text: 'چای چی دارید', intent: 'product_query' },
  { text: 'قیمت چقدره', intent: 'price_query' },
  { text: 'شرایط گارانتی', intent: 'warranty_query' },
  { text: 'پس میدم', intent: 'warranty_refund' },
  { text: 'از کیفیتش راضی نیستم', intent: 'warranty_dissatisfaction' },
  { text: 'زرین یعنی چه', intent: 'brand_question' },
  { text: 'نحوه استفاده', intent: 'education' },
  { text: 'شماره تلفن', intent: 'contact' },
  { text: 'با اپراتور صحبت کنم', intent: 'escalation' },
  { text: 'منو', intent: 'menu' },
  { text: 'خداحافظ', intent: 'general' },
  { text: 'slkdjflskdjfsldkfj', intent: 'unknown' },
];

for (const tc of testCases) {
  const result = await processMessage({ ...BASE_REQ, text: tc.text });
  assertEq(result.metadata.intent, tc.intent, `processMessage("${tc.text.substring(0, 20)}") → intent=${tc.intent}`);
  assertHas(result, 'text', `response has text for "${tc.text.substring(0, 20)}"`);
  assert(result.text.length > 0, `response text non-empty for "${tc.text.substring(0, 20)}"`);
  assert(Array.isArray(result.quickReplies), `quickReplies is array for "${tc.text.substring(0, 20)}"`);
  assertEq(result.metadata.channel, 'whatsapp', `channel preserved`);
  assertEq(result.metadata.source, 'message-orchestrator', `source set`);
  assertHas(result.metadata, 'correlation_id', `correlation_id set`);
  assertEq(result.recipientId, '989120000001', `recipientId = senderId`);
}

// ──────────────────────────────────────────────────────
// TEST 3: Edge cases
// ──────────────────────────────────────────────────────
console.log('\n── TEST 3: Edge cases ──');

// Missing required fields
const err1 = await processMessage({ channel: 'whatsapp' });
assertEq(err1.metadata.intent, 'error', 'missing senderId → error');
assert(err1.metadata.requires_human === true, 'error requires_human=true');

const err2 = await processMessage(null);
assertEq(err2.metadata.intent, 'error', 'null request → error');

// Force human
const force = await processMessage({ ...BASE_REQ, text: 'سلام' }, { forceHuman: true });
assertEq(force.metadata.intent, 'escalated', 'forceHuman → escalated');
assert(force.metadata.requires_human === true, 'forceHuman requires_human=true');

// Non-text message (attachments only)
const attach = await processMessage({ ...BASE_REQ, text: '', attachments: [{ type: 'image', url: 'https://example.com/img.jpg' }] });
assertEq(attach.metadata.intent, 'unknown', 'image only → unknown');

// ──────────────────────────────────────────────────────
// TEST 4: Combo greeting+product → product_query
// ──────────────────────────────────────────────────────
console.log('\n── TEST 4: Combo greeting+product ──');

assertEq(detectIntent('سلام چای دارین'), 'product_query', 'سلام چای دارین → product_query');
assertEq(detectIntent('سلام قیمت چای چند'), 'price_query', 'سلام قیمت چای چند → price_query (price wins over combo)');

// ──────────────────────────────────────────────────────
// TEST 5: Bale channel test
// ──────────────────────────────────────────────────────
console.log('\n── TEST 5: Bale channel ──');

const baleReq = await processMessage({ channel: 'bale', senderId: 'bale_123', text: 'سلام' });
assertEq(baleReq.metadata.channel, 'bale', 'bale channel preserved');
assertEq(baleReq.metadata.intent, 'greeting', 'bale greeting detected');
assertHas(baleReq, 'text', 'bale response has text');
assertEq(baleReq.recipientId, 'bale_123', 'bale recipientId');

// ──────────────────────────────────────────────────────
// TEST 6: warranty templates contain brand line
// ──────────────────────────────────────────────────────
console.log('\n── TEST 6: Brand line in warranty responses ──');

const wq = await processMessage({ ...BASE_REQ, text: 'گارانتی' });
assert(wq.text.includes('۷ گرم'), `warranty_query mentions 7g: "${wq.text.substring(0, 40)}..."`);

const wd = await processMessage({ ...BASE_REQ, text: 'راضی نیستم' });
assert(wd.text.includes('۷ گرم'), `warranty_dissatisfaction mentions 7g`);
assert(wd.text.includes('نمونه'), `warranty_dissatisfaction mentions sample`);

const wr = await processMessage({ ...BASE_REQ, text: 'پس میدم' });
assert(wr.text.includes('گارانتی'), `warranty_refund mentions گارانتی`);
assert(wr.text.includes('اطلاعات'), `warranty_refund mentions اطلاعات`);

// ──────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────
console.log(`\n═══════════════════════════════════════`);
console.log(`Assertions: ${assertions}  |  PASS: ${passed}  |  FAIL: ${failed}`);
if (failed > 0) { console.log('❌ SOME TESTS FAILED'); process.exit(1); }
else { console.log('✅ ALL TESTS PASSED'); }

})().catch(err => { console.error('Unhandled:', err); process.exit(1); });
