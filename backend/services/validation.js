/**
 * validation.js — اعتبارسنجی ورودی/خروجی‌ها با Zod
 *
 * الگوی استفاده:
 *   const { validate } = require('../services/validation');
 *   const input = validate(taskCreateSchema, req.body); // خطا → Error با status 400 و پیام فارسی
 */

const { z } = require('zod');

// ─── نام‌های فارسی فیلدها برای پیام خطا ─────────────────────────────
const FIELD_LABELS = {
  title: 'عنوان',
  description: 'توضیحات',
  status: 'وضعیت',
  newStatus: 'وضعیت جدید',
  priority: 'اولویت',
  assigneeId: 'مسئول تسک',
  assignee_id: 'مسئول تسک',
  createdBy: 'ایجادکننده',
  created_by: 'ایجادکننده',
  customerId: 'شناسه مشتری',
  orderId: 'شناسه سفارش',
  dueDate: 'مهلت انجام',
  due_date: 'مهلت انجام',
  taskId: 'شناسه تسک',
  task_id: 'شناسه تسک',
  evidenceType: 'نوع شاهد',
  evidence_type: 'نوع شاهد',
  contentUrl: 'آدرس محتوا',
  content_url: 'آدرس محتوا',
  notes: 'یادداشت',
  submittedBy: 'ثبت‌کننده',
  submitted_by: 'ثبت‌کننده',
  rawNotes: 'متن خام جلسه',
  raw_notes: 'متن خام جلسه',
  summary: 'خلاصه',
  decisions: 'تصمیم‌ها',
  actionItems: 'اقدام‌ها',
  action_items: 'اقدام‌ها',
  sessionDate: 'تاریخ جلسه',
  session_date: 'تاریخ جلسه',
  actionItemIndex: 'ایندکس اکشن‌آیتم',
  action_item_index: 'ایندکس اکشن‌آیتم',
  approvedBy: 'تأییدکننده',
  approved_by: 'تأییدکننده',
  reason: 'دلیل رد',
  meetingId: 'شناسه صورت‌جلسه',
  meeting_id: 'شناسه صورت‌جلسه',
};

const UUID = z.string().uuid('شناسه واردشده معتبر نیست');

// ─── اسکیمای تسک‌ها ────────────────────────────────────────────────
const taskStatusValues = [
  'PENDING_ACK',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'BLOCKED',
];

const taskPriorityValues = ['low', 'medium', 'high', 'critical'];

/**
 * Normalize a priority value to the canonical lowercase form.
 * Accepts both uppercase and lowercase inputs.
 * Returns undefined for empty/null/undefined values.
 * @param {unknown} value
 * @returns {string|undefined}
 */
function normalizeTaskPriority(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return undefined;
  if (typeof value !== 'string') return undefined;
  return value.trim().toLowerCase();
}

const taskCreateSchema = z.object({
  title: z.string().min(1, 'عنوان تسک الزامی است'),
  description: z.string().nullable().optional(),
  assigneeId: UUID.nullable().optional(),
  createdBy: UUID.nullable().optional(),
  customerId: UUID.nullable().optional(),
  orderId: UUID.nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(taskPriorityValues).optional(),
});

const taskStatusSchema = z.object({
  newStatus: z.enum(taskStatusValues, {
    errorMap: () => ({ message: 'وضعیت جدید نامعتبر است' }),
  }),
  actorId: UUID.optional(),
});

const evidenceSchema = z.object({
  taskId: UUID.optional(), // می‌تواند از مسیر بیاید
  evidenceType: z.string().min(1, 'نوع شاهد الزامی است'),
  contentUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  submittedBy: UUID.nullable().optional(),
});

const tasksQuerySchema = z.object({
  status: z.enum(taskStatusValues).optional(),
  assigneeId: UUID.optional(),
  orderId: UUID.optional(),
});

// ─── اسکیمای صورت‌جلسات ─────────────────────────────────────────────
const actionItemSchema = z.object({
  title: z.string().min(1).nullable().optional(),
  description: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.enum(taskPriorityValues).optional(),
  status: z.enum(taskStatusValues).optional(),
});

const meetingCreateSchema = z.object({
  title: z.string().min(1, 'عنوان صورت‌جلسه الزامی است'),
  rawNotes: z.string().min(1, 'متن خام جلسه الزامی است'),
  summary: z.string().nullable().optional(),
  decisions: z.array(z.string()).optional(),
  actionItems: z.array(actionItemSchema).optional(),
  sessionDate: z.string().nullable().optional(),
  createdBy: UUID.nullable().optional(),
});

const convertActionItemSchema = z.object({
  actionItemIndex: z.number().int().min(0, 'ایندکس اکشن‌آیتم باید عدد صحیح غیرمنفی باشد'),
  assigneeId: UUID.optional(),
});

// ─── اسکیمای موتور AI ──────────────────────────────────────────────
const processNotesSchema = z.object({
  rawNotes: z.string().min(1, 'متن خام جلسه الزامی است'),
});

const approveDraftSchema = z.object({
  approvedBy: UUID.optional(),
});

const rejectDraftSchema = z.object({
  reason: z.string().nullable().optional(),
});

// ─── هلپر اعتبارسنجی ───────────────────────────────────────────────
function formatIssue(issue) {
  const path = issue.path.length ? String(issue.path.join('.')) : '';
  const label = FIELD_LABELS[path] || path || 'ورودی';
  const message = issue.message || 'نامعتبر است';
  return path ? `${label}: ${message}` : message;
}

/**
 * اعتبارسنجی یک مقدار با اسکیمای Zod.
 * در صورت خطا، Error با status=400 و پیام فارسی پرتاب می‌شود.
 *
 * @param {import('zod').ZodType} schema
 * @param {unknown} value
 */
function validate(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const err = new Error(result.error.issues.map(formatIssue).join('؛ '));
    err.status = 400;
    throw err;
  }
  return result.data;
}

/**
 * اعتبارسنجی UUID مسیر
 * @param {string} value
 */
function validateUuid(value, label) {
  const parsed = validate(z.string().uuid(), value);
  return parsed;
}

module.exports = {
  validate,
  validateUuid,
  normalizeTaskPriority,
  UUID,
  taskCreateSchema,
  taskStatusSchema,
  evidenceSchema,
  tasksQuerySchema,
  meetingCreateSchema,
  convertActionItemSchema,
  processNotesSchema,
  approveDraftSchema,
  rejectDraftSchema,
  taskStatusValues,
  taskPriorityValues,
  FIELD_LABELS,
};
