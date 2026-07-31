/**
 * meetingService.js — سرویس مدیریت صورت‌جلسات (فاز ۱)
 *
 * جدول‌ها: meeting_minutes، tasks
 */

const { supabase } = require('../handlers/_lib');

/**
 * ثبت صورت‌جلسه جدید
 * @param {object} data — title, raw_notes الزامی؛ summary، decisions، action_items اختیاری
 */
async function createMeetingMinute(data) {
  const { data: meeting, error } = await supabase
    .from('meeting_minutes')
    .insert({
      ...data,
      decisions: data.decisions || [],
      action_items: data.action_items || [],
    })
    .select()
    .single();

  if (error) {
    throw new Error(`ثبت صورت‌جلسه ناموفق بود: ${error.message}`);
  }
  return meeting;
}

/**
 * دریافت لیست صورت‌جلسات (جدیدترین در ابتدا)
 */
async function getMeetingMinutes() {
  const { data: minutes, error } = await supabase
    .from('meeting_minutes')
    .select()
    .order('session_date', { ascending: false });

  if (error) {
    throw new Error(`دریافت لیست صورت‌جلسات ناموفق بود: ${error.message}`);
  }
  return minutes || [];
}

/**
 * دریافت یک صورت‌جلسه
 * @param {string} meetingId
 */
async function getMeetingMinute(meetingId) {
  const { data: meeting, error } = await supabase
    .from('meeting_minutes')
    .select()
    .eq('id', meetingId)
    .single();

  if (error) {
    throw new Error(`دریافت صورت‌جلسه ناموفق بود: ${error.message}`);
  }
  if (!meeting) {
    const err = new Error('صورت‌جلسه یافت نشد');
    err.status = 404;
    throw err;
  }
  return meeting;
}

/**
 * تبدیل یک اکشن‌آیتم صورت‌جلسه به تسک رسمی در جدول tasks.
 * اکشن‌آیتم‌ها به صورت JSONB در ستون action_items ذخیره شده‌اند.
 *
 * @param {string} meetingId شناسه صورت‌جلسه
 * @param {number} actionItemIndex ایندکس اکشن‌آیتم در آرایه
 * @param {string} [assigneeId] مسئول تسک
 */
async function convertActionItemToTask(meetingId, actionItemIndex, assigneeId) {
  // ۱) دریافت صورت‌جلسه
  const { data: meeting, error: meetingError } = await supabase
    .from('meeting_minutes')
    .select()
    .eq('id', meetingId)
    .single();

  if (meetingError) {
    throw new Error(`صورت‌جلسه یافت نشد: ${meetingError.message}`);
  }
  if (!meeting) {
    const err = new Error('صورت‌جلسه یافت نشد');
    err.status = 404;
    throw err;
  }

  // ۲) استخراج اکشن‌آیتم موردنظر از JSONB
  const actionItems = Array.isArray(meeting.action_items) ? meeting.action_items : [];
  const item = actionItems[actionItemIndex];

  if (!item) {
    const err = new Error('اکشن‌آیتم موردنظر در صورت‌جلسه یافت نشد');
    err.status = 404;
    throw err;
  }

  const title = (item.title && item.title.trim()) || (item.description && item.description.trim());
  if (!title) {
    const err = new Error('اکشن‌آیتم انتخابی عنوان یا توضیح معتبری ندارد');
    err.status = 400;
    throw err;
  }

  // ۳) ایجاد تسک رسمی با وضعیت اولیه PENDING_ACK
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      title,
      description: item.description || null,
      status: 'PENDING_ACK',
      priority: item.priority || 'MEDIUM',
      assignee_id: assigneeId || null,
      due_date: item.due_date || null,
      created_by: meeting.created_by,
    })
    .select()
    .single();

  if (taskError) {
    throw new Error(`تبدیل اکشن‌آیتم به تسک ناموفق بود: ${taskError.message}`);
  }
  return task;
}

module.exports = {
  createMeetingMinute,
  getMeetingMinutes,
  getMeetingMinute,
  convertActionItemToTask,
};
