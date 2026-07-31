/**
 * taskService.js — سرویس مدیریت تسک‌ها، شواهد و وضعیت (فاز ۱)
 *
 * جدول‌ها: tasks، task_evidences، audit_logs (اسکیمای فاز ۱)
 * خطاها: به صورت Error با پیام فارسی پرتاب می‌شوند؛ هندلر HTTP مسئول status است.
 */

const { supabase } = require('../handlers/_lib');

const NO_EVIDENCE_MESSAGE = 'برای ارسال به بررسی باید حداقل یک شاهد ثبت کنید';

/**
 * ثبت تغییر وضعیت در جدول audit_logs (اسکیمای فاز ۱: action / changes)
 */
async function logStatusChange(taskId, from, to, actorId) {
  const { error } = await supabase.from('audit_logs').insert({
    entity_type: 'task',
    entity_id: taskId,
    action: 'STATUS_CHANGED',
    actor_id: actorId || null,
    changes: { from, to },
  });
  if (error) {
    console.error('[taskService] audit insert failed:', error.message);
  }
}

/**
 * ایجاد تسک جدید با وضعیت اولیه PENDING_ACK
 * @param {object} data — شامل title و فیلدهای اختیاری
 */
async function createTask(data) {
  const payload = {
    ...data,
    status: 'PENDING_ACK',
  };

  const { data: task, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`ایجاد تسک ناموفق بود: ${error.message}`);
  }
  return task;
}

/**
 * تغییر وضعیت تسک با ثبت همزمان در audit_logs.
 * تغییر به PENDING_REVIEW فقط با وجود حداقل ۱ شاهد مجاز است.
 * @param {string} taskId
 * @param {string} newStatus
 * @param {string} [actorId]
 */
async function updateTaskStatus(taskId, newStatus, actorId) {
  // ۱) دریافت وضعیت فعلی تسک
  const { data: current, error: fetchError } = await supabase
    .from('tasks')
    .select('id, status')
    .eq('id', taskId)
    .single();

  if (fetchError) {
    const err = new Error(`تسک یافت نشد: ${fetchError.message}`);
    err.status = 404;
    throw err;
  }
  if (!current) {
    const err = new Error('تسک یافت نشد');
    err.status = 404;
    throw err;
  }

  const currentStatus = current.status;

  // ۲) قانون: برای ارسال به بررسی باید حداقل یک شاهد ثبت شده باشد
  if (newStatus === 'PENDING_REVIEW') {
    const { count, error: countError } = await supabase
      .from('task_evidences')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', taskId);

    if (countError) {
      throw new Error(`بررسی شواهد تسک ناموفق بود: ${countError.message}`);
    }
    if (!count || count === 0) {
      const err = new Error(NO_EVIDENCE_MESSAGE);
      err.status = 400;
      throw err;
    }
  }

  // ۳) به‌روزرسانی وضعیت تسک
  const { data: updated, error: updateError } = await supabase
    .from('tasks')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`تغییر وضعیت تسک ناموفق بود: ${updateError.message}`);
  }

  // ۴) ثبت همزمان در audit_logs (پس از موفقیت تغییر، تا لاگ دروغ ثبت نشود)
  await logStatusChange(taskId, currentStatus, newStatus, actorId);

  return updated;
}

/**
 * افزودن شاهد جدید برای یک تسک
 * @param {object} evidenceData — task_id, evidence_type و فیلدهای اختیاری
 */
async function addTaskEvidence(evidenceData) {
  const { data: evidence, error } = await supabase
    .from('task_evidences')
    .insert(evidenceData)
    .select()
    .single();

  if (error) {
    throw new Error(`ثبت شاهد ناموفق بود: ${error.message}`);
  }
  return evidence;
}

/**
 * دریافت جزئیات تسک به همراه لیست شواهد مرتبط
 * @param {string} taskId
 */
async function getTaskWithEvidences(taskId) {
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select()
    .eq('id', taskId)
    .single();

  if (taskError) {
    throw new Error(`دریافت تسک ناموفق بود: ${taskError.message}`);
  }
  if (!task) {
    const err = new Error('تسک یافت نشد');
    err.status = 404;
    throw err;
  }

  const { data: evidences, error: evError } = await supabase
    .from('task_evidences')
    .select()
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (evError) {
    throw new Error(`دریافت شواهد تسک ناموفق بود: ${evError.message}`);
  }

  return { task, evidences: evidences || [] };
}

/**
 * دریافت لیست تسک‌ها با فیلتر اختیاری
 * @param {{ status?: string, assigneeId?: string, orderId?: string }} [filters]
 */
async function getTasks(filters) {
  let query = supabase.from('tasks').select();

  if (filters && filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters && filters.assigneeId) {
    query = query.eq('assignee_id', filters.assigneeId);
  }
  if (filters && filters.orderId) {
    query = query.eq('order_id', filters.orderId);
  }

  const { data: tasks, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`دریافت لیست تسک‌ها ناموفق بود: ${error.message}`);
  }
  return tasks || [];
}

module.exports = {
  createTask,
  updateTaskStatus,
  addTaskEvidence,
  getTaskWithEvidences,
  getTasks,
  NO_EVIDENCE_MESSAGE,
};
