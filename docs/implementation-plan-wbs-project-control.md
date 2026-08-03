# Implementation Plan: Project Control WBS Module

**پروژه:** آذرمهر صنعت — ماژول کنترل پروژه مبتنی بر WBS
**نسخه سند:** 1.0
**تاریخ:** ۱۴۰۵/۰۵/۰۲
**وضعیت:** draft
**مبتنی بر:** PRD نسخه اول + سند مادر طراحی ماژول

---

## ۱. ساختار فعلی مخزن مرتبط با این ماژول

### ۱.۱ فایل‌های موجود در Backend

| فایل | کاربرد | وضعیت |
|------|--------|--------|
| `backend/handlers/projects.js` | CRUD پروژه‌ها (ساده) | موجود — نیاز به توسعه |
| `backend/handlers/project-tasks.js` | CRUD + Workflow وظایف (وضعیت‌های پیشرفته) | موجود — نیاز به توسعه |
| `backend/handlers/project-members.js` | عضویت پرسنل در پروژه | موجود — نیاز به توسعه |
| `backend/handlers/notifications.js` | اعلان‌های ساده (user_id, message, read) | موجود — نیاز به توسعه کامل |
| `backend/handlers/tasks.js` | تسک‌های CRM (مرتبط با سفارش) | موجود — مجزا از ماژول پروژه |
| `backend/handlers/_lib.js` | هایبر مشترک: supabase, cors, requireAuth, requireAdmin, requireSuperAdmin | موجود — بدون تغییر |
| `backend/handlers/_audit.js` | ثبت audit log | موجود — بدون تغییر |
| `backend/handlers/ai-agent.js` | ایجنت هوشمند (WhatsApp) | موجود — نیاز به توسعه برای پروژه |
| `backend/server.js` | مسیریابی Express + mount handlers | موجود — نیاز به اضافه کردن routes جدید |
| `backend/api/index.js` | Vercel serverless entry point | موجود — بدون تغییر |

### ۱.۲ فایل‌های موجود در Admin Panel

| فایل | کاربرد | وضعیت |
|------|--------|--------|
| `admin-panel/src/App.tsx` | روتینگ اصلی (switch on activeTab) | موجود — نیاز به اضافه کردن tabs جدید |
| `admin-panel/src/modules/App.jsx` | ماژول اصلی با RBAC + navigation | موجود — نیاز به توسعه |
| `admin-panel/src/modules/projects/ProjectsView.tsx` | نمای لیست پروژه‌ها | موجود — نیاز به توسعه |
| `admin-panel/src/config/api.ts` | apiFetch + resolveApiBase + auth | موجود — بدون تغییر |
| `admin-panel/src/types/navigation.ts` | تعریف ماژول‌ها و آیکون‌ها | موجود — نیاز به اضافه کردن project-control |
| `admin-panel/src/shared/ui.tsx` | کامپوننت‌های UI مشترک (Card, Loading, PageHeader, StatusBadge, ...) | موجود — بدون تغییر |
| `admin-panel/src/shared/Layout.tsx` | لایه مشترک | موجود — بدون تغییر |
| `admin-panel/src/components/layout/Sidebar.tsx` | سایدبار با ناوبری | موجود — نیاز به آیکون جدید |
| `admin-panel/src/components/layout/Header.tsx` | هدر | موجود — بدون تغییر |
| `admin-panel/src/components/layout/MainLayout.tsx` | لایه اصلی | موجود — بدون تغییر |
| `admin-panel/src/context/NotificationContext.jsx` | context اعلان‌ها (استفاده از Supabase مستقیم — نیاز به تغییر) | موجود — نیاز به بازنویسی |
| `admin-panel/src/styles/tokens.css` | CSS tokens (Dark/Slate theme) | موجود — بدون تغییر |
| `admin-panel/src/modules/dashboard/DashboardView.tsx` | داشبورد اصلی | موجود — نیاز به توسعه |
| `admin-panel/src/modules/dashboard/components/KPICards.tsx` | کارت‌های KPI | موجود — نیاز به توسعه |
| `admin-panel/src/modules/dashboard/components/Charts.tsx` | نمودارها | موجود — نیاز به توسعه |

### ۱.۳ فایل‌های موجود در Supabase

| فایل | کاربرد | وضعیت |
|------|--------|--------|
| `supabase/schema.sql` | اسکمای اصلی (whatsapp_rules, whatsapp_logs) | موجود — بدون تغییر |
| `supabase/create-projects-tasks.sql` | جدول‌های پروژه و تسک فعلی | موجود — نیاز به توسعه |
| `supabase/create-notifications-table.sql` | جدول notifications ساده | موجود — نیاز به توسعه |
| `supabase/create-task-progress-blockers.sql` | task_progress_updates + task_blockers | موجود — نیاز به توسعه |
| `supabase/rls-policies.sql` | سیاست‌های RLS | موجود — نیاز به توسعه |
| `supabase/rls-policies-project-control-addendum.sql` | RLS addendum برای project control | موجود — نیاز به بازنویسی |

---

## ۲. فایل‌های مهاجرت دیتابیس پیشنهادی

### ۲.۱ فایل: `supabase/migration-001-project-control-tables.sql`

**هدف:** ایجاد تمام جدول‌های جدید ماژول کنترل پروژه.

**جدول‌هایی که ایجاد می‌شوند:**

| # | جدول | هدف |
|---|------|------|
| 1 | `wbs_items` | ساختار WBS پروژه (پروژه → فاز → بسته → فعالیت → وظیفه) |
| 2 | `project_tasks` | نسخه توسعه‌یافته تسک‌ها (جایگزین project_tasks ساده‌تر) |
| 3 | `task_assignments` | تاریخچه تخصیص وظایف به پرسنل |
| 4 | `task_work_logs` | ثبت ساعات کار و نفرساعت |
| 5 | `task_approvals` | فرآیند تأیید/رد خروجی |
| 6 | `task_blockers` | موانع و توقف کار |
| 7 | `project_milestones` | نشانگرهای مهم پروژه |
| 8 | `project_risks` | ریسک‌های پروژه |
| 9 | `notification_rules` | قوانین اعلان و یادآوری |
| 10 | `project_notifications` | اعلان‌های پروژه |
| 11 | `notification_deliveries` | ردیابی ارسال اعلان‌ها |
| 12 | `user_notification_preferences` | ترجیحات اعلان کاربر |
| 13 | `ai_agent_insights` | تحلیل‌های ایجنت هوشمند |
| 14 | `ai_agent_recommendations` | پیشنهادهای ایجنت |
| 15 | `ai_agent_runs` | لاگ اجرای ایجنت |

**نکات مهم:**
- هر جدول دارای `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- هر جدول دارای `created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())`
- هر جدول دارای `updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())`
- استفاده از `ON CONFLICT DO NOTHING` برای idempotency
- هر جدول دارای COMMENT فارسی روی جدول و ستون‌ها
- فایل‌های موجود `create-projects-tasks.sql`, `create-task-progress-blockers.sql`, `create-notifications-table.sql` به‌عنوان reference استفاده می‌شوند

### ۲.۲ فایل: `supabase/migration-002-project-control-indexes.sql`

**هدف:** ایجاد indexهای مورد نیاز برای عملکرد بهینه.

**Indexها:**
- `wbs_items(project_id, parent_id, sort_order)`
- `project_tasks(project_id, status, assignee_id)`
- `project_tasks(due_date, priority)`
- `task_assignments(task_id, user_id)`
- `task_work_logs(task_id, date)`
- `task_approvals(task_id, status)`
- `task_blockers(task_id, status)`
- `project_notifications(recipient_id, created_at)`
- `notification_deliveries(notification_id, channel, status)`
- `ai_agent_insights(project_id, generated_at)`

### ۲.۳ فایل: `supabase/migration-003-project-control-rls.sql`

**هدف:** فعال‌سازی RLS و سیاست‌های دسترسی برای جدول‌های جدید.

**الگو از فایل‌های موجود:**
- `rls-policies.sql` — الگوی سیاست‌نویسی
- `rls-policies-project-control-addendum.sql` — addendum موجود

**سیاست‌ها:**
- هر کاربر فقط پروژه‌هایی را می‌بیند که عضو آن است
- مسئول پروژه می‌تواند WBS و تسک‌ها را مدیریت کند
- پرسنل فقط تسک‌های تخصیص‌یافته خود را می‌بینند و ویرایش می‌کنند
- ناظر فقط تسک‌های منتظر تأیید خود را می‌بیند
- مدیرعامل همه پروژه‌ها را می‌بیند

---

## ۳. فایل‌های پیشنهادی Backend Handler

### ۳.۱ فایل: `backend/handlers/wbs.js`

**مسیر:** `/api/wbs`
**هدف:** مدیریت ساختار WBS (CRUD)

**مسیرهای فرعی:**
- `GET /api/wbs?project_id=X` — لیست موارد WBS یک پروژه
- `POST /api/wbs` — ایجاد مورد WBS جدید
- `GET /api/wbs/:id` — جزئیات یک مورد WBS
- `PUT /api/wbs/:id` — ویرایش مورد WBS
- `DELETE /api/wbs/:id` — حذف مورد WBS
- `GET /api/wbs/:id/progress` — محاسبه پیشرفت یک مورد WBS

**الگو:** مشابه `projects.js` — استفاده از `_lib.js` برای supabase/cors/auth, `_audit.js` برای audit log

### ۳.۲ فایل: `backend/handlers/wbs-tasks.js`

**مسیر:** `/api/wbs-tasks`
**هدف:** مدیریت تسک‌های WBS (نسخه توسعه‌یافته با تمام فیلدهای PRD)

**مسیرهای فرعی:**
- `GET /api/wbs-tasks?project_id=X&status=X&assignee_id=X&priority=X` — لیست تسک‌ها با فیلتر
- `POST /api/wbs-tasks` — ایجاد تسک جدید (با اعتبارسنجی فیلدهای الزامی)
- `GET /api/wbs-tasks/:id` — جزئیات تسک + تاریخچه + تأییدها + مانع‌ها + پیوست‌ها
- `PUT /api/wbs-tasks/:id` — ویرایش تسک
- `DELETE /api/wbs-tasks/:id` — حذف تسک (فقط super_admin)
- `POST /api/wbs-tasks/:id/start` — شروع تسک
- `POST /api/wbs-tasks/:id/progress` — ثبت پیشرفت پیشنهادی
- `POST /api/wbs-tasks/:id/blocker` — ثبت مانع
- `POST /api/wbs-tasks/:id/submit` — تحویل خروجی
- `POST /api/wbs-tasks/:id/approve` — تأیید خروجی
- `POST /api/wbs-tasks/:id/reject` — رد خروجی
- `POST /api/wbs-tasks/:id/request-revision` — درخواست اصلاح

**الگو:** مشابه `project-tasks.js` — استفاده از TRANSITIONS مجاز + task_status_history + audit log

### ۳.۳ فایل: `backend/handlers/wbs-work-logs.js`

**مسیر:** `/api/wbs-work-logs`
**هدف:** ثبت گزارش کار و نفرساعت

**مسیرهای فرعی:**
- `GET /api/wbs-work-logs?task_id=X&date_from=X&date_to=X`
- `POST /api/wbs-work-logs` — ثبت گزارش کار روزانه
- `GET /api/wbs-work-logs/:id` — جزئیات
- `PUT /api/wbs-work-logs/:id` — ویرایش (تا زمان تأیید ناظر)

### ۳.۴ فایل: `backend/handlers/wbs-approvals.js`

**مسیر:** `/api/wbs-approvals`
**هدف:** مدیریت تأیید/رد خروجی

**مسیرهای فرعی:**
- `GET /api/wbs-approvals/pending?approver_id=X` — وظایف منتظر تأیید
- `GET /api/wbs-approvals/history?task_id=X` — تاریخچه تأیید
- `POST /api/wbs-approvals` — ثبت تأیید/رد (با امتیاز کیفیت + کامنت)

### ۳.۵ فایل: `backend/handlers/wbs-blockers.js`

**مسیر:** `/api/wbs-blockers`
**هدف:** مدیریت موانع

**مسیرهای فرعی:**
- `GET /api/wbs-blockers?project_id=X&status=open` — موانع باز
- `POST /api/wbs-blockers` — ثبت مانع جدید
- `PUT /api/wbs-blockers/:id` — به‌روزرسانی وضعیت مانع
- `GET /api/wbs-blockers/stats?project_id=X` — آمار موانع

### ۳.۶ فایل: `backend/handlers/wbs-notifications.js`

**مسیر:** `/api/wbs-notifications`
**هدف:** مدیریت اعلان‌های پروژه (نوتیفیکیشن engine)

**مسیرهای فرعی:**
- `GET /api/wbs-notifications` — لیست اعلان‌های کاربر
- `GET /api/wbs-notifications/unread-count` — تعداد خوانده‌نشده
- `PUT /api/wbs-notifications/:id/read` — علامت خوانده
- `PUT /api/wbs-notifications/read-all` — همه را خوانده
- `POST /api/wbs-notifications/rules` — ایجاد قانون اعلان (admin)
- `GET /api/wbs-notifications/rules` — لیست قوانین اعلان
- `PUT /api/wbs-notifications/rules/:id` — به‌روزرسانی قانون
- `GET /api/wbs-notifications/preferences` — ترجیحات کاربر
- `PUT /api/wbs-notifications/preferences` — ذخیره ترجیحات

**الگو:** مشابه `notifications.js` اما با ساختار پیشرفته‌تر (rules + preferences + deliveries)

### ۳.۷ فایل: `backend/handlers/wbs-reports.js`

**مسیر:** `/api/wbs-reports`
**هدف:** گزارش‌گیری

**مسیرهای فرعی:**
- `GET /api/wbs-reports/project-health` — سلامت پروژه‌ها
- `GET /api/wbs-reports/personnel-performance` — عملکرد پرسنل
- `GET /api/wbs-reports/task-status` — خلاصه وضعیت وظایف
- `GET /api/wbs-reports/dashboard/:role` — داشبورد بر اساس نقش

### ۳.۸ فایل: `backend/handlers/wbs-ai-agent.js`

**مسیر:** `/api/wbs-ai`
**هدف:** ایجنت هوشمند کنترل پروژه

**مسیرهای فرعی:**
- `GET /api/wbs-ai/project-summary/:projectId` — خلاصه وضعیت پروژه
- `GET /api/wbs-ai/manager-insights` — پیشنهادهای مدیر پروژه
- `POST /api/wbs-ai/analyze-project/:projectId` — تحلیل پروژه
- `GET /api/wbs-ai/employee-insights/:employeeId` — تحلیل عملکرد فرد
- `GET /api/wbs-ai/overdue-tasks` — وظایف عقب‌افتاده
- `GET /api/wbs-ai/stale-tasks` — وظایف بدون بروزرسانی
- `GET /api/wbs-ai/open-blockers` — موانع باز
- `GET /api/wbs-ai/recommendations` — پیشنهادهای ایجنت

**الگو:** مشابه `ai-agent.js` موجود — تحلیل داده‌ها و تولید پیشنهاد (بدون تصمیم خودکار)

### ۳.۹ فایل: `backend/handlers/wbs-milestones.js`

**مسیر:** `/api/wbs-milestones`
**هدف:** مدیریت نشانگرهای مهم پروژه

**مسیرهای فرعی:**
- `GET /api/wbs-milestones?project_id=X`
- `POST /api/wbs-milestones`
- `PUT /api/wbs-milestones/:id`
- `GET /api/wbs-milestones/:id`

### ۳.۱۰ فایل: `backend/handlers/wbs-risks.js`

**مسیر:** `/api/wbs-risks`
**هدف:** مدیریت ریسک‌های پروژه

**مسیرهای فرعی:**
- `GET /api/wbs-risks?project_id=X`
- `POST /api/wbs-risks`
- `PUT /api/wbs-risks/:id`
- `GET /api/wbs-risks/stats?project_id=X`

---

## ۴. صفحات، مسیرها و کامپوننت‌های پیشنهادی Frontend

### ۴.۱ مسیرهای جدید در Admin Panel

مسیرها باید به `admin-panel/src/App.tsx` اضافه شوند:

| مسیر | کامپوننت | نقش مجاز |
|------|-----------|-----------|
| `/projects` | `ProjectsView` (موجود — نیاز به توسعه) | همه |
| `/projects/:id` | `ProjectDetailView` | عضو پروژه |
| `/projects/:id/wbs` | `WBSView` | مدیر پروژه |
| `/projects/:id/tasks` | `TasksListView` | عضو پروژه |
| `/projects/:id/tasks/:taskId` | `TaskDetailView` | مسئول/تأییدکننده |
| `/projects/:id/tasks/new` | `TaskCreateEditView` | مدیر پروژه |
| `/my-tasks` | `MyTasksView` | پرسنل |
| `/my-tasks/approvals` | `PendingApprovalsView` | ناظر |
| `/my-tasks/report` | `DailyReportView` | پرسنل |
| `/my-tasks/blockers` | `BlockerView` | پرسنل |
| `/notifications` | `NotificationsCenterView` | همه |
| `/notifications/settings` | `NotificationSettingsView` | ادمین |
| `/dashboard` | `DashboardView` (موجود — نیاز به توسعه) | همه |
| `/dashboard/ceo` | `CEODashboardView` | مدیرعامل |
| `/dashboard/pm` | `PMDashboardView` | مدیر پروژه |
| `/reports/performance` | `PerformanceReportView` | مدیرعامل/مدیر پروژه |
| `/ai-control` | `AIControlPanelView` | مدیرعامل/مدیر پروژه |
| `/settings/notifications` | `NotificationSettingsView` | ادمین |

### ۴.۲ کامپوننت‌های جدید پیشنهادی

**پوشه:** `admin-panel/src/modules/project-control/`

| فایل | هدف |
|------|------|
| `ProjectControlView.tsx` | صفحه اصلی مدیریت پروژه‌ها |
| `ProjectDetailView.tsx` | جزئیات پروژه + WBS tree |
| `WBSView.tsx` | نمایش درختی WBS |
| `WBSEditor.tsx` | ویرایشگر مورد WBS |
| `TasksListView.tsx` | لیست تسک‌ها با فیلتر |
| `TaskDetailView.tsx` | جزئیات کامل تسک |
| `TaskCreateEditForm.tsx` | فرم ایجاد/ویرایش تسک |
| `TaskWorkflowBar.tsx` | نمایش وضعیت و workflow تسک |
| `MyTasksView.tsx` | وظایف من |
| `PendingApprovalsView.tsx` | وظایف منتظر تأیید |
| `DailyReportForm.tsx` | فرم ثبت گزارش کار |
| `BlockerForm.tsx` | فرم ثبت مانع |
| `ApprovalsList.tsx` | لیست تأییدها |
| `NotificationsCenterView.tsx` | مرکز اعلان‌ها |
| `NotificationSettingsView.tsx` | تنظیمات اعلان |
| `CEODashboardView.tsx` | داشبورد مدیرعامل |
| `PMDashboardView.tsx` | داشبورد مدیر پروژه |
| `PerformanceReportView.tsx` | گزارش عملکرد پرسنل |
| `AIControlPanelView.tsx` | پنل ایجنت هوشمند |
| `KPIWidgets.tsx` | ویجت‌های KPI |
| `ProjectHealthChart.tsx` | نمودار سلامت پروژه |
| `WbsTree.tsx` | کامپوننت درخت WBS |
| `TaskCard.tsx` | کارت تسک |
| `NotificationItem.tsx` | آیتم اعلان |
| `SeverityBadge.tsx` | نشانگر سطح اهمیت |
| `ProgressRing.tsx` | نمایش پیشرفت دایره‌ای |
| `MilestoneTimeline.tsx` | تایم‌لاین نشانگرها |
| `RiskMatrix.tsx` | ماتریس ریسک |

### ۴.۳ ساختار مسیرها در App.tsx

```tsx
// App.tsx — مسیرهای جدید
import { ProjectControlView } from './modules/project-control/ProjectControlView';
import { ProjectDetailView } from './modules/project-control/ProjectDetailView';
import { WBSView } from './modules/project-control/WBSView';
import { TasksListView } from './modules/project-control/TasksListView';
import { TaskDetailView } from './modules/project-control/TaskDetailView';
import { TaskCreateEditForm } from './modules/project-control/TaskCreateEditForm';
import { MyTasksView } from './modules/project-control/MyTasksView';
import { PendingApprovalsView } from './modules/project-control/PendingApprovalsView';
import { DailyReportForm } from './modules/project-control/DailyReportForm';
import { NotificationsCenterView } from './modules/project-control/NotificationsCenterView';
import { NotificationSettingsView } from './modules/project-control/NotificationSettingsView';
import { CEODashboardView } from './modules/project-control/CEODashboardView';
import { PMDashboardView } from './modules/project-control/PMDashboardView';
import { PerformanceReportView } from './modules/project-control/PerformanceReportView';
import { AIControlPanelView } from './modules/project-control/AIControlPanelView';
```

---

## ۵. توابع API Client پیشنهادی

### ۵.۱ فایل: `admin-panel/src/lib/api/wbs.ts`

```typescript
// تمام توابع API client با الگوی مشابه apiFetch موجود

export const wbs = {
  list: (projectId: string) => apiFetch(`/api/wbs?project_id=${projectId}`),
  get: (id: string) => apiFetch(`/api/wbs/${id}`),
  create: (data: WBSItemData) => apiFetch('/api/wbs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<WBSItemData>) => apiFetch(`/api/wbs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/api/wbs/${id}`, { method: 'DELETE' }),
  progress: (id: string) => apiFetch(`/api/wbs/${id}/progress`),
};

export const wbsTasks = {
  list: (filters: TaskFilters) => apiFetch(`/api/wbs-tasks?${qs.stringify(filters)}`),
  get: (id: string) => apiFetch(`/api/wbs-tasks/${id}`),
  create: (data: TaskData) => apiFetch('/api/wbs-tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<TaskData>) => apiFetch(`/api/wbs-tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  start: (id: string) => apiFetch(`/api/wbs-tasks/${id}/start`, { method: 'POST' }),
  progress: (id: string, data: { text: string; progress_percent: number }) => apiFetch(`/api/wbs-tasks/${id}/progress`, { method: 'POST', body: JSON.stringify(data) }),
  blocker: (id: string, data: { title: string; description: string }) => apiFetch(`/api/wbs-tasks/${id}/blocker`, { method: 'POST', body: JSON.stringify(data) }),
  submit: (id: string, data: { deliverable: string; notes?: string }) => apiFetch(`/api/wbs-tasks/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }),
  approve: (id: string, data: { decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED'; notes?: string; quality_score?: number }) => apiFetch(`/api/wbs-tasks/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
};

export const notifications = {
  list: (filters?: NotificationFilters) => apiFetch(`/api/wbs-notifications?${qs.stringify(filters || {})}`),
  unreadCount: () => apiFetch('/api/wbs-notifications/unread-count'),
  markRead: (id: string) => apiFetch(`/api/wbs-notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => apiFetch('/api/wbs-notifications/read-all', { method: 'PUT' }),
  getRules: () => apiFetch('/api/wbs-notifications/rules'),
  updateRule: (id: string, data: RuleData) => apiFetch(`/api/wbs-notifications/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getPreferences: () => apiFetch('/api/wbs-notifications/preferences'),
  updatePreferences: (data: PreferencesData) => apiFetch('/api/wbs-notifications/preferences', { method: 'PUT', body: JSON.stringify(data) }),
};

export const reports = {
  projectHealth: () => apiFetch('/api/wbs-reports/project-health'),
  personnelPerformance: (filters?: PerformanceFilters) => apiFetch(`/api/wbs-reports/personnel-performance?${qs.stringify(filters || {})}`),
  taskStatus: () => apiFetch('/api/wbs-reports/task-status'),
};

export const aiAgent = {
  projectSummary: (projectId: string) => apiFetch(`/api/wbs-ai/project-summary/${projectId}`),
  managerInsights: () => apiFetch('/api/wbs-ai/manager-insights'),
  analyzeProject: (projectId: string) => apiFetch(`/api/wbs-ai/analyze-project/${projectId}`, { method: 'POST' }),
  employeeInsights: (employeeId: string) => apiFetch(`/api/wbs-ai/employee-insights/${employeeId}`),
  overdueTasks: () => apiFetch('/api/wbs-ai/overdue-tasks'),
  staleTasks: () => apiFetch('/api/wbs-ai/stale-tasks'),
  openBlockers: () => apiFetch('/api/wbs-ai/open-blockers'),
};
```

### ۵.۲ الگوی استفاده از `apiFetch` موجود

همه توابع API client از `apiFetch` موجود در `src/config/api.ts` استفاده می‌کنند:
- توکن خودکار از localStorage
- مدیریت خطای ۴۰۱ (خروج خودکار)
- پاسخ JSON
- هدر `Content-Type: application/json`

---

## ۶. فازبندی اجرای پیشنهادی

### فاز ۱: هسته دیتابیس و Backend (۳ هفته)

**دیتابیس:**
- [ ] `migration-001-project-control-tables.sql` — ایجاد ۱۵ جدول
- [ ] `migration-002-project-control-indexes.sql` — ایجاد indexها
- [ ] `migration-003-project-control-rls.sql` — RLS policies
- [ ] اجرای migration در Supabase

**Backend Handlers:**
- [ ] `backend/handlers/wbs.js` — CRUD WBS items
- [ ] `backend/handlers/wbs-tasks.js` — CRUD + workflow تسک‌ها
- [ ] `backend/handlers/wbs-work-logs.js` — ثبت گزارش کار
- [ ] `backend/handlers/wbs-approvals.js` — تأیید/رد
- [ ] `backend/handlers/wbs-blockers.js` — مدیریت موانع
- [ ] `backend/handlers/wbs-milestones.js` — نشانگرها
- [ ] `backend/handlers/wbs-risks.js` — ریسک‌ها

**Backend Routes:**
- [ ] اضافه کردن routes به `backend/server.js`
- [ ] `mount('/api/wbs', handlers.wbs)`
- [ ] `mount('/api/wbs-tasks', handlers.wbsTasks)`
- [ ] `mount('/api/wbs-work-logs', handlers.wbsWorkLogs)`
- [ ] `mount('/api/wbs-approvals', handlers.wbsApprovals)`
- [ ] `mount('/api/wbs-blockers', handlers.wbsBlockers)`
- [ ] `mount('/api/wbs-milestones', handlers.wbsMilestones)`
- [ ] `mount('/api/wbs-risks', handlers.wbsRisks)`
- [ ] `mount('/api/wbs-notifications', handlers.wbsNotifications)`
- [ ] `mount('/api/wbs-reports', handlers.wbsReports)`
- [ ] `mount('/api/wbs-ai', handlers.wbsAiAgent)`

**Backend Tests:**
- [ ] تست هر handler (manually or via smoke script)

**معیار Done فاز ۱:**
- همه ۱۵ جدول ساخته شده و RLS فعال
- همه handlerها کار می‌کنند و endpointهای مربوطه mount شده
- تست smoke هر endpoint برگرداند ۲۰۰ یا خطای اعتبارسنجی صحیح

### فاز ۲: Frontend — داشبوردها و لیست‌ها (۳ هفته)

**صفحات:**
- [ ] `DashboardView.tsx` — به‌روزرسانی داشبورد اصلی (اضافه کردن کارت‌های پروژه و تسک)
- [ ] `CEODashboardView.tsx` — داشبورد مدیرعامل
- [ ] `PMDashboardView.tsx` — داشبورد مدیر پروژه
- [ ] `ProjectsView.tsx` — به‌روزرسانی لیست پروژه‌ها (اضافه کردن WBS tree, progress, status)
- [ ] `ProjectDetailView.tsx` — جزئیات پروژه
- [ ] `WBSView.tsx` — نمایش درختی WBS
- [ ] `TasksListView.tsx` — لیست تسک‌ها با فیلتر
- [ ] `TaskDetailView.tsx` — جزئیات تسک
- [ ] `MyTasksView.tsx` — وظایف من
- [ ] `PendingApprovalsView.tsx` — وظایف منتظر تأیید

**نویگیشن:**
- [ ] اضافه کردن `project-control` به `navigationModules` در `navigation.ts`
- [ ] اضافه کردن آیکون (مثلاً `Folder01Icon` یا آیکون سفارشی) به `Sidebar.tsx`
- [ ] اضافه کردن routes جدید به `App.tsx`

**API Client:**
- [ ] `admin-panel/src/lib/api/wbs.ts` — تمام توابع API client

**معیار Done فاز ۲:**
- مدیرعامل بتواند داشبورد را ببیند و پروژه‌های عقب‌افتاده را شناسایی کند
- مدیر پروژه بتواند WBS بسازد و تسک تخصیص دهد
- پرسنل بتواند وظایف خود را ببیند
- همه صفحات با فارسی/RTL و تم Dark/Slate رندر شوند

### فاز ۳: Frontend — Workflow و گزارش‌ها (۳ هفته)

**صفحات:**
- [ ] `TaskCreateEditForm.tsx` — فرم ایجاد/ویرایش تسک (با اعتبارسنجی فیلدهای الزامی)
- [ ] `DailyReportForm.tsx` — فرم ثبت گزارش کار
- [ ] `BlockerForm.tsx` — فرم ثبت مانع
- [ ] `ApprovalsList.tsx` — لیست تأییدها
- [ ] `NotificationsCenterView.tsx` — مرکز اعلان‌ها
- [ ] `NotificationSettingsView.tsx` — تنظیمات اعلان
- [ ] `PerformanceReportView.tsx` — گزارش عملکرد پرسنل
- [ ] `AIControlPanelView.tsx` — پنل ایجنت هوشمند

**کامپوننت‌های UI مشترک:**
- [ ] `KPIWidgets.tsx` — ویجت‌های KPI
- [ ] `ProgressRing.tsx` — نمایش پیشرفت دایره‌ای
- [ ] `WbsTree.tsx` — کامپوننت درخت WBS
- [ ] `TaskCard.tsx` — کارت تسک
- [ ] `NotificationItem.tsx` — آیتم اعلان
- [ ] `SeverityBadge.tsx` — نشانگر سطح اهمیت
- [ ] `MilestoneTimeline.tsx` — تایم‌لاین نشانگرها
- [ ] `RiskMatrix.tsx` — ماتریس ریسک

**معیار Done فاز ۳:**
- پرسنل بتواند گزارش کار ثبت کند و خروجی تحویل دهد
- ناظر بتواند تأیید یا رد کند
- اعلان‌ها داخل پنل کار کند
- گزارش عملکرد پرسنل قابل مشاهده باشد
- ایجنت هوشمند خلاصه و پیشنهاد ارائه دهد

### فاز ۴: اعلان‌ها، یادآوری و Escalation (۲ هفته)

**Backend:**
- [ ] پیاده‌سازی NotificationEngine (قوانین اعلان)
- [ ] ReminderScheduler (زمان‌بندی یادآوری‌ها)
- [ ] EscalationEngine (تشدید هشدار)

**Frontend:**
- [ ] NotificationCenterView به‌روزرسانی (با فیلترها و لینک‌های مستقیم)
- [ ] Browser Push Notification integration
- [ ] Notification settings page

**معیار Done فاز ۴:**
- یادآوری سررسید خودکار ارسال شود
- اخطار تأخیر ارسال شود
- Escalation مرحله‌به‌مرحله کار کند
- مدیرعامل هشدارهای بحرانی دریافت کند

### فاز ۵: AI Agent و بهینه‌سازی (۲ هفته)

**Backend:**
- [ ] پیاده‌سازی AI Agent analysis logic
- [ ] ذخیره insights و recommendations در DB
- [ ] scheduled analysis runs

**Frontend:**
- [ ] AIControlPanelView به‌روزرسانی
- [ ] خلاصه وضعیت پروژه برای مدیرعامل
- [ ] پیشنهادهای اقدام برای مدیر پروژه

**معیار Done فاز ۵:**
- ایجنت بتواند خلاصه وضعیت پروژه تولید کند
- ایجنت بتواند وظایف عقب‌افتاده و بدون بروزرسانی شناسایی کند
- ایجنت بتواند پیشنهاد اقدام ارائه دهد
- ایجنت تصمیم خودکار اجرایی ندارد (فقط تحلیل و پیشنهاد)

---

## ۷. ریسک‌ها و ناشناخته‌ها

### ۷.۱ ریسک‌های فنی

| ریسک | احتمال | تأثیر | کاهش |
|------|--------|-------|------|
| پیچیدگی migration دیتابیس | متوسط | بالا | اجرای مرحله‌ای + تست هر migration |
| تداخل با جدول‌های موجود `project_tasks` و `projects` | متوسط | متوسط | بررسی تداخل قبل از ایجاد جدول‌های جدید + استفاده از naming مشخص |
| عملکرد queryهای پیچیده WBS | متوسط | متوسط | استفاده از indexها + pagination |
| پیچیدگی Notification Engine | بالا | متوسط | شروع از ساده‌ترین قوانین + توسعه مرحله‌ای |
| عدم تبدیل شدن PRD به دیتابیس | متوسط | بالا | بررسی PRD با تیم فنی قبل از شروع |
| عدم تبدیل شدن API docs به کد | متوسط | بالا | استفاده از TypeScript types + اعتبارسنجی اسکیما |

### ۷.۲ ناشناخته‌ها

1. **ساختار کاربران فعلی:** جدول `users` یک VIEW است (`public.unified_messages` reference). نیاز به بررسی دقیق ساختار VIEW و فیلدهای در دسترس.
2. **سیستم احراز هویت فعلی:** JWT با bcrypt — نیاز به بررسی claims موجود در token (آیا `system_role` و `id` هست).
3. **پشتیبانی از فایل‌ها:** آیا storage سرویس (Supabase Storage یا S3) برای پیوست‌های تسک آماده است؟
4. **ایجنت هوشمند:** آیا LLM API (OpenAI/Anthropic) در دسترس است؟ یا باید on-device analysis باشد؟
5. **Browser Push:** آیا service worker setup موجود است؟
6. **Bale/SMS integration:** آیا adapterهای مربوطه آماده هستند یا نیاز به توسعه دارند؟
7. **تعداد کاربران و پروژه‌ها:** مقیاس فعلی چقدر است؟ (برای تنظیم pagination و indexها)

---

## ۸. فایل‌های دقیقی که در مرحله بعد ایجاد یا تغییر خواهند شد

### ۸.۱ فایل‌هایی که ایجاد می‌شوند (New Files)

**دیتابیس (Migration Files):**
- `supabase/migration-001-project-control-tables.sql`
- `supabase/migration-002-project-control-indexes.sql`
- `supabase/migration-003-project-control-rls.sql`

**Backend Handlers:**
- `backend/handlers/wbs.js`
- `backend/handlers/wbs-tasks.js`
- `backend/handlers/wbs-work-logs.js`
- `backend/handlers/wbs-approvals.js`
- `backend/handlers/wbs-blockers.js`
- `backend/handlers/wbs-milestones.js`
- `backend/handlers/wbs-risks.js`
- `backend/handlers/wbs-notifications.js`
- `backend/handlers/wbs-reports.js`
- `backend/handlers/wbs-ai-agent.js`

**Frontend Pages:**
- `admin-panel/src/modules/project-control/ProjectControlView.tsx`
- `admin-panel/src/modules/project-control/ProjectDetailView.tsx`
- `admin-panel/src/modules/project-control/WBSView.tsx`
- `admin-panel/src/modules/project-control/WBSEditor.tsx`
- `admin-panel/src/modules/project-control/TasksListView.tsx`
- `admin-panel/src/modules/project-control/TaskDetailView.tsx`
- `admin-panel/src/modules/project-control/TaskCreateEditForm.tsx`
- `admin-panel/src/modules/project-control/MyTasksView.tsx`
- `admin-panel/src/modules/project-control/PendingApprovalsView.tsx`
- `admin-panel/src/modules/project-control/DailyReportForm.tsx`
- `admin-panel/src/modules/project-control/BlockerForm.tsx`
- `admin-panel/src/modules/project-control/ApprovalsList.tsx`
- `admin-panel/src/modules/project-control/NotificationsCenterView.tsx`
- `admin-panel/src/modules/project-control/NotificationSettingsView.tsx`
- `admin-panel/src/modules/project-control/CEODashboardView.tsx`
- `admin-panel/src/modules/project-control/PMDashboardView.tsx`
- `admin-panel/src/modules/project-control/PerformanceReportView.tsx`
- `admin-panel/src/modules/project-control/AIControlPanelView.tsx`

**Frontend Components:**
- `admin-panel/src/modules/project-control/components/KPIWidgets.tsx`
- `admin-panel/src/modules/project-control/components/ProgressRing.tsx`
- `admin-panel/src/modules/project-control/components/WbsTree.tsx`
- `admin-panel/src/modules/project-control/components/TaskCard.tsx`
- `admin-panel/src/modules/project-control/components/NotificationItem.tsx`
- `admin-panel/src/modules/project-control/components/SeverityBadge.tsx`
- `admin-panel/src/modules/project-control/components/MilestoneTimeline.tsx`
- `admin-panel/src/modules/project-control/components/RiskMatrix.tsx`

**API Client:**
- `admin-panel/src/lib/api/wbs.ts`

**Types:**
- `admin-panel/src/types/wbs.ts` — TypeScript interfaces برای WBS, Task, Approval, Blocker, Notification, AI Insight

### ۸.۲ فایل‌هایی که تغییر می‌کنند (Modified Files)

| فایل | نوع تغییر |
|------|-----------|
| `backend/server.js` | اضافه کردن ۱۰+ mount جدید |
| `admin-panel/src/App.tsx` | اضافه کردن routes و imports جدید |
| `admin-panel/src/modules/App.jsx` | اضافه کردن page components و RBAC |
| `admin-panel/src/types/navigation.ts` | اضافه کردن project-control group |
| `admin-panel/src/components/layout/Sidebar.tsx` | اضافه کردن icon برای project-control |
| `admin-panel/src/shared/ui.tsx` | اضافه کردن کامپوننت‌های جدید (SeverityBadge, ProgressRing, ...) |
| `admin-panel/src/context/NotificationContext.jsx` | بازنویسی برای استفاده از API backend به جای Supabase مستقیم |
| `admin-panel/src/styles/tokens.css` | اضافه کردن tokenهای جدید (در صورت نیاز) |
| `supabase/create-projects-tasks.sql` | به‌روزرسانی با فیلدهای جدید |
| `supabase/create-notifications-table.sql` | بازنویسی برای ساختار پیشرفته‌تر |
| `supabase/rls-policies.sql` | اضافه کردن سیاست‌های جدید |
| `supabase/rls-policies-project-control-addendum.sql` | بازنویسی کامل |

### ۸.۳ فایل‌هایی که حذف یا جایگزین می‌شوند

| فایل | دلیل |
|------|-------|
| `backend/handlers/notifications.js` (ساده) | جایگزین با `wbs-notifications.js` پیشرفته‌تر |
| `admin-panel/src/context/NotificationContext.jsx` | بازنویسی برای استفاده از API backend |

---

## ۹. خلاصه زمان‌بندی

| فاز | مدت | خروجی اصلی |
|-----|------|-----------|
| فاز ۱: دیتابیس و Backend | ۳ هفته | ۱۵ جدول + ۱۰ handler + routes |
| فاز ۲: Frontend — داشبوردها و لیست‌ها | ۳ هفته | ۱۴ صفحه + API client + ناوبری |
| فاز ۳: Frontend — Workflow و گزارش‌ها | ۳ هفته | ۸ صفحه + ۸ کامپوننت UI |
| فاز ۴: اعلان‌ها و Escalation | ۲ هفته | NotificationEngine + ReminderScheduler + EscalationEngine |
| فاز ۵: AI Agent و بهینه‌سازی | ۲ هفته | AI analysis + scheduled runs |
| **مجموع** | **~۱۳ هفته** | **MVP کامل** |

---

## ۱۰. اولویت‌بندی فوری (مرحله بعد)

قبل از شروع توسعه، این موارد باید انجام شوند:

1. **بررسی و تأیید PRD** توسط مدیرعامل و تیم فنی
2. **بررسی ساختار VIEW `users`** در Supabase — فیلدهای در دسترس
3. **بررسی تداخل جدول `project_tasks`** موجود با جدول `project_tasks` جدید — نیاز به تصمیم: ادامه با جدول موجود یا جدول جدید؟
4. **تصمیم درباره AI Agent** — آیا LLM API موجود است یا باید rule-based باشد؟
5. **تصمیم درباره Browser Push** — service worker setup لازم است
6. **تصمیم درباره فازبندی** — آیا فاز ۱ باید شامل notification engine باشد یا فقط backend + DB؟
7. **تخصیص تیم** — چند توسعه‌دهنده برای هر فاز؟

---

**پایان سند اجرایی**
