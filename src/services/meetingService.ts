import { supabase } from '../lib/supabase';
import type {
  MeetingActionItem,
  MeetingMinute,
  NewMeeting,
  Task,
  TaskPriority,
} from '../types';

/**
 * ثبت صورت‌جلسه جدید (raw_notes، summary، decisions و action_items به صورت JSONB)
 */
export async function createMeetingMinute(data: NewMeeting): Promise<MeetingMinute> {
  const { data: meeting, error } = await supabase
    .from('meeting_minutes')
    .insert({
      ...data,
      decisions: data.decisions ?? [],
      action_items: data.action_items ?? [],
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
export async function getMeetingMinutes(): Promise<MeetingMinute[]> {
  const { data: minutes, error } = await supabase
    .from('meeting_minutes')
    .select()
    .order('session_date', { ascending: false });

  if (error) {
    throw new Error(`دریافت لیست صورت‌جلسات ناموفق بود: ${error.message}`);
  }
  return minutes ?? [];
}

/**
 * تبدیل یک اکشن‌آیتم صورت‌جلسه به تسک رسمی در جدول tasks.
 *
 * @param meetingId شناسه صورت‌جلسه
 * @param actionItemIndex ایندکس اکشن‌آیتم در آرایه JSONB اکشن‌آیتم‌ها
 * @param assigneeId مسئول تسک (اختیاری)
 */
export async function convertActionItemToTask(
  meetingId: string,
  actionItemIndex: number,
  assigneeId?: string
): Promise<Task> {
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
    throw new Error('صورت‌جلسه یافت نشد');
  }

  // ۲) استخراج اکشن‌آیتم موردنظر از JSONB
  const actionItems = (meeting.action_items ?? []) as MeetingActionItem[];
  const item = actionItems[actionItemIndex];

  if (!item) {
    throw new Error('اکشن‌آیتم موردنظر در صورت‌جلسه یافت نشد');
  }

  const title = item.title?.trim() || item.description?.trim();
  if (!title) {
    throw new Error('اکشن‌آیتم انتخابی عنوان یا توضیح معتبری ندارد');
  }

  // ۳) ایجاد تسک رسمی با وضعیت اولیه PENDING_ACK
  const priority = (item.priority ?? 'MEDIUM') as TaskPriority;

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      title,
      description: item.description ?? null,
      status: 'PENDING_ACK',
      priority,
      assignee_id: assigneeId ?? null,
      due_date: item.due_date ?? null,
      created_by: meeting.created_by,
    })
    .select()
    .single();

  if (taskError) {
    throw new Error(`تبدیل اکشن‌آیتم به تسک ناموفق بود: ${taskError.message}`);
  }
  return task;
}
