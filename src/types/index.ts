import type { Database } from './supabase';

// ---------- Enums ----------
export type TaskStatus = Database['public']['Enums']['task_status'];
export type TaskPriority = Database['public']['Enums']['task_priority'];

// ---------- Tasks ----------
export type Task = Database['public']['Tables']['tasks']['Row'];
export type NewTask = Database['public']['Tables']['tasks']['Insert'];

// ---------- Task Evidences ----------
export type TaskEvidence = Database['public']['Tables']['task_evidences']['Row'];
export type NewTaskEvidence = Database['public']['Tables']['task_evidences']['Insert'];

// ---------- Meeting Minutes ----------
export type MeetingMinute = Database['public']['Tables']['meeting_minutes']['Row'];
export type NewMeeting = Database['public']['Tables']['meeting_minutes']['Insert'];

// ساختار اکشن‌آیتم داخل فیلد JSONB جدول meeting_minutes
export interface MeetingActionItem {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
}

// ---------- Audit Logs ----------
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type NewAuditLog = Database['public']['Tables']['audit_logs']['Insert'];

// ---------- Types ترکیبی ----------
export interface TaskWithEvidences {
  task: Task;
  evidences: TaskEvidence[];
}

export interface TaskFilters {
  status?: TaskStatus;
  assigneeId?: string;
  orderId?: string;
}
