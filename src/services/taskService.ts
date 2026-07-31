import { supabase } from '../lib/supabase';
import type {
  NewTask,
  NewTaskEvidence,
  Task,
  TaskEvidence,
  TaskFilters,
  TaskStatus,
  TaskWithEvidences,
} from '../types';

const NO_EVIDENCE_MESSAGE = 'برای ارسال به بررسی باید حداقل یک شاهد ثبت کنید';

/**
 * ثبت تغییر وضعیت در جدول audit_logs
 */
async function logStatusChange(taskId: string, from: TaskStatus, to: TaskStatus, actorId?: string): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    entity_type: 'task',
    entity_id: taskId,
    action: 'STATUS_CHANGED',
    actor_id: actorId ?? null,
    changes: { from, to },
  });
  if (error) {
    throw new Error(`ثبت تغییر وضعیت در audit_logs ناموفق بود: ${error.message}`);
  }
}

/**
 * ایجاد تسک جدید با وضعیت اولیه PENDING_ACK
 */
export async function createTask(data: NewTask): Promise<Task> {
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({ ...data, status: 'PENDING_ACK' })
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
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  actorId?: string
): Promise<Task> {
  // ۱) دریافت وضعیت فعلی تسک
  const { data: current, error: fetchError } = await supabase
    .from('tasks')
    .select('id, status')
    .eq('id', taskId)
    .single();

  if (fetchError) {
    throw new Error(`تسک یافت نشد: ${fetchError.message}`);
  }
  if (!current) {
    throw new Error('تسک یافت نشد');
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
      throw new Error(NO_EVIDENCE_MESSAGE);
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
 */
export async function addTaskEvidence(evidenceData: NewTaskEvidence): Promise<TaskEvidence> {
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
 */
export async function getTaskWithEvidences(taskId: string): Promise<TaskWithEvidences> {
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select()
    .eq('id', taskId)
    .single();

  if (taskError) {
    throw new Error(`دریافت تسک ناموفق بود: ${taskError.message}`);
  }
  if (!task) {
    throw new Error('تسک یافت نشد');
  }

  const { data: evidences, error: evError } = await supabase
    .from('task_evidences')
    .select()
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (evError) {
    throw new Error(`دریافت شواهد تسک ناموفق بود: ${evError.message}`);
  }

  return { task, evidences: evidences ?? [] };
}

/**
 * دریافت لیست تسک‌ها با فیلتر اختیاری (وضعیت / مسئول / سفارش)
 */
export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  let query = supabase.from('tasks').select();

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.assigneeId) {
    query = query.eq('assignee_id', filters.assigneeId);
  }
  if (filters?.orderId) {
    query = query.eq('order_id', filters.orderId);
  }

  const { data: tasks, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`دریافت لیست تسک‌ها ناموفق بود: ${error.message}`);
  }
  return tasks ?? [];
}
