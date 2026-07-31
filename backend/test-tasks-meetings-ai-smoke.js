/**
 * test-tasks-meetings-ai-smoke.js — اسموک تست end-to-end ماژول فاز ۱
 *
 * مسیرها: /api/tasks، /api/meetings، /api/ai-agent
 *
 * ⚠️ ایمنی: این اسکریپت فقط به Supabase محلی (127.0.0.1:54321) متصل می‌شود
 * و هرگز از کلیدهای production استفاده نمی‌کند. اگر سرویس محلی بالا نباشد،
 * با خطای روشن متوقف می‌شود.
 *
 * اجرا:  node test-tasks-meetings-ai-smoke.js
 */

const path = require('path');
const assert = require('assert');

// ─── ۱) اشاره به دیتابیس محلی (قبل از بارگذاری server.js) ─────────
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
// کلید service_role دیتابیس محلی supabase CLI (صرفاً توسعه محلی)
const LOCAL_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

process.env.SUPABASE_URL = LOCAL_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = LOCAL_SERVICE_ROLE_KEY;
process.env.SUPABASE_KEY = LOCAL_SERVICE_ROLE_KEY;
process.env.PORT = '5999';

// بارگذاری JWT_SECRET از .env (برای امضای توکن تست؛ بدون چاپ مقدار)
require('dotenv').config({ path: path.join(__dirname, '.env') });
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET در backend/.env یافت نشد');
  process.exit(1);
}

const jwt = require('jsonwebtoken');

const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';
const token = jwt.sign({ id: TEST_USER_ID, system_role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

const BASE = `http://127.0.0.1:${process.env.PORT}`;

// ─── ۲) راه‌اندازی سرور ────────────────────────────────────────────
const server = require('./server');

// ─── ۳) ابزار درخواست ──────────────────────────────────────────────
async function req(method, urlPath, body, authToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* خالی */ }
  return { status: res.status, data };
}

// ─── ۴) سناریوها ───────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`, extra !== undefined ? JSON.stringify(extra) : '');
  }
}

async function run() {
  console.log('\n── گیت احراز هویت ──');
  const noAuth = await req('GET', '/api/tasks');
  check('GET /api/tasks بدون توکن → 401', noAuth.status === 401, noAuth);

  console.log('\n── تسک‌ها ──');
  // ایجاد تسک بدون عنوان → خطای zod فارسی
  const badCreate = await req('POST', '/api/tasks', { description: 'بدون عنوان' }, token);
  check('POST /api/tasks بدون عنوان → 400 فارسی', badCreate.status === 400 && /عنوان/.test(badCreate.data.error || ''), badCreate.data);

  const created = await req('POST', '/api/tasks', { title: 'تسک اسموک تست', priority: 'HIGH' }, token);
  check('POST /api/tasks → 201 با وضعیت PENDING_ACK', created.status === 201 && created.data.status === 'PENDING_ACK', created.data);
  const taskId = created.data && created.data.id;

  // تغییر وضعیت به PENDING_REVIEW بدون شاهد → خطای قانونی
  const earlyReview = await req('PATCH', `/api/tasks/${taskId}/status`, { newStatus: 'PENDING_REVIEW' }, token);
  check(
    'PATCH status→PENDING_REVIEW بدون شاهد → 400 «حداقل یک شاهد»',
    earlyReview.status === 400 && /شاهد/.test(earlyReview.data.error || ''),
    earlyReview.data
  );

  // افزودن شاهد
  const evidence = await req('POST', `/api/tasks/${taskId}/evidence`, { evidenceType: 'TEXT', notes: 'گزارش پیشرفت ثبت شد' }, token);
  check('POST /api/tasks/:id/evidence → 201', evidence.status === 201, evidence.data);

  // تغییر وضعیت با شاهد → موفق
  const review = await req('PATCH', `/api/tasks/${taskId}/status`, { newStatus: 'PENDING_REVIEW' }, token);
  check('PATCH status→PENDING_REVIEW با شاهد → 200', review.status === 200 && review.data.status === 'PENDING_REVIEW', review.data);

  // جزئیات با شواهد
  const detail = await req('GET', `/api/tasks/${taskId}`, undefined, token);
  check(
    'GET /api/tasks/:id → شامل شواهد',
    detail.status === 200 && Array.isArray(detail.data.evidences) && detail.data.evidences.length >= 1,
    detail.data
  );

  // لیست با فیلتر
  const list = await req('GET', `/api/tasks?status=PENDING_REVIEW`, undefined, token);
  check('GET /api/tasks?status= → لیست فیلترشده', list.status === 200 && list.data.some((t) => t.id === taskId), list.data);

  console.log('\n── صورت‌جلسات ──');
  const meeting = await req('POST', '/api/meetings', {
    title: 'جلسه اسموک تست',
    rawNotes: 'بررسی وضعیت پروژه و تخصیص اقدامات.',
    decisions: ['افزایش ظرفیت تولید'],
    actionItems: [{ title: 'اقدام تست: هماهنگی انبار', description: 'تا پایان هفته' }],
  }, token);
  check('POST /api/meetings → 201', meeting.status === 201, meeting.data);
  const meetingId = meeting.data && meeting.data.id;

  const meetingList = await req('GET', '/api/meetings', undefined, token);
  check('GET /api/meetings → لیست', meetingList.status === 200 && meetingList.data.some((m) => m.id === meetingId), meetingList.data);

  const converted = await req('POST', `/api/meetings/${meetingId}/convert-action-item`, { actionItemIndex: 0 }, token);
  check('POST /api/meetings/:id/convert-action-item → 201 تسک رسمی', converted.status === 201 && converted.data.task && converted.data.task.status === 'PENDING_ACK', converted.data);

  console.log('\n── موتور AI ──');
  const draft = await req('POST', '/api/ai-agent/process-notes', {
    rawNotes: 'جلسه فروش هفتگی.\nتصمیم: افزایش موجودی چای باروتی زرین.\nاقدام: هماهنگی با انبار تا پایان هفته.',
  }, token);
  check(
    'POST /api/ai-agent/process-notes → 201 با وضعیت DRAFT',
    draft.status === 201 && draft.data.draft && draft.data.draft.status === 'DRAFT',
    draft.data
  );
  const draftId = draft.data && draft.data.draft && draft.data.draft.id;

  const approved = await req('POST', `/api/ai-agent/drafts/${draftId}/approve`, {}, token);
  check(
    'POST /api/ai-agent/drafts/:id/approve → 200 + صورت‌جلسه رسمی',
    approved.status === 200 && approved.data.meeting && approved.data.draft.status === 'APPROVED',
    approved.data
  );

  // تایید دوباره همان پیش‌نویس → خطا
  const doubleApprove = await req('POST', `/api/ai-agent/drafts/${draftId}/approve`, {}, token);
  check('approve تکراری → 400', doubleApprove.status === 400, doubleApprove.data);

  const draft2 = await req('POST', '/api/ai-agent/process-notes', {
    rawNotes: 'گفتگوی کوتاه درباره بودجه.',
  }, token);
  const draft2Id = draft2.data && draft2.data.draft && draft2.data.draft.id;

  const rejected = await req('POST', `/api/ai-agent/drafts/${draft2Id}/reject`, { reason: 'خلاصه ناقص بود' }, token);
  check('reject → 200 با وضعیت REJECTED و دلیل', rejected.status === 200 && rejected.data.status === 'REJECTED' && rejected.data.rejection_reason, rejected.data);

  console.log('\n── ناهماهنگی روت (legacy) ──');
  const legacySub = await req('GET', `/api/meetings/${meetingId}/action-items`, undefined, token);
  check('زیرمسیر legacy تحت هندلر جدید → 405', legacySub.status === 405, legacySub.data);

  console.log(`\n════════════════════════════════════════`);
  console.log(`نتیجه: ${passed} ✅  |  ${failed} ❌`);
  console.log(`════════════════════════════════════════`);
  server.close && server.close();
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error('❌ خطای غیرمنتظره:', e.message);
  server.close && server.close();
  process.exit(1);
});
