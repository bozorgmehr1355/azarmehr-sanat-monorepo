-- ============================================================================
-- Project Control WBS Module — MVP Schema
-- آذرمهر صنعت — سامانه مدیریت و کنترل پروژه مبتنی بر WBS
-- Date: 2026-08-02
-- ============================================================================
-- نکات مهم:
--   - تمام جدول‌ها با پیشوند project_control_ شروع می‌شوند.
--   - کلید اصلی UUID با gen_random_uuid().
--   - timestamps با timezone('utc'::text, now()).
--   - RLS فعال برای همه جدول‌ها.
--   - Policy ها بر اساس system_role و auth.uid() نوشته شده‌اند.
--   - وظیفه‌های draft قابل ایجاد هستند (is_active CHECK فقط وضعیت فعال را محدود می‌کند).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ۱. project_control_projects
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    client TEXT DEFAULT '',
    manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    planned_start_date TIMESTAMPTZ,
    planned_end_date TIMESTAMPTZ,
    actual_start_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    budget NUMERIC(14,2) DEFAULT 0 CHECK (budget >= 0),
    value NUMERIC(14,2) DEFAULT 0 CHECK (value >= 0),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'critical')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'in_progress', 'paused', 'at_risk', 'delayed', 'completed', 'archived')),
    progress_planned NUMERIC(5,2) DEFAULT 0 CHECK (progress_planned >= 0 AND progress_planned <= 100),
    progress_actual NUMERIC(5,2) DEFAULT 0 CHECK (progress_actual >= 0 AND progress_actual <= 100),
    schedule_variance NUMERIC(5,2) DEFAULT 0,
    risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    notes TEXT DEFAULT '',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pcp_code ON project_control_projects(code);
CREATE INDEX IF NOT EXISTS idx_pcp_manager_id ON project_control_projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_pcp_status ON project_control_projects(status);
CREATE INDEX IF NOT EXISTS idx_pcp_priority ON project_control_projects(priority);
CREATE INDEX IF NOT EXISTS idx_pcp_created_at ON project_control_projects(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uix_pcp_code ON project_control_projects(code);

ALTER TABLE project_control_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pcp_admin_all" ON project_control_projects
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pcp_member_read" ON project_control_projects
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_project_members pm
        WHERE pm.project_control_project_id = project_control_projects.id
        AND pm.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_projects IS 'پروژه‌های کنترل پروژه';
COMMENT ON COLUMN project_control_projects.code IS 'کد منحصربه‌فرد پروژه';
COMMENT ON COLUMN project_control_projects.manager_id IS 'مدیر پروژه';
COMMENT ON COLUMN project_control_projects.status IS 'وضعیت پروژه';
COMMENT ON COLUMN project_control_projects.progress_planned IS 'پیشرفت برنامه‌ای';
COMMENT ON COLUMN project_control_projects.progress_actual IS 'پیشرفت واقعی';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۲. project_control_project_members
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_project_id UUID NOT NULL REFERENCES project_control_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_control_project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pcm_project_id ON project_control_project_members(project_control_project_id);
CREATE INDEX IF NOT EXISTS idx_pcm_user_id ON project_control_project_members(user_id);

ALTER TABLE project_control_project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pcm_admin_all" ON project_control_project_members
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pcm_member_read" ON project_control_project_members
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_project_members pm2
        WHERE pm2.project_control_project_id = project_control_project_members.project_control_project_id
        AND pm2.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_project_members IS 'اعضای پروژه کنترل پروژه';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۳. project_control_wbs_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_wbs_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_project_id UUID NOT NULL REFERENCES project_control_projects(id) ON DELETE CASCADE,
    parent_wbs_item_id UUID REFERENCES project_control_wbs_items(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    wbs_level INTEGER NOT NULL DEFAULT 1 CHECK (wbs_level >= 1 AND wbs_level <= 5),
    sort_order INTEGER NOT NULL DEFAULT 0,
    planned_start_date TIMESTAMPTZ,
    planned_end_date TIMESTAMPTZ,
    actual_start_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    budget NUMERIC(14,2) DEFAULT 0 CHECK (budget >= 0),
    cost NUMERIC(14,2) DEFAULT 0 CHECK (cost >= 0),
    progress_planned NUMERIC(5,2) DEFAULT 0 CHECK (progress_planned >= 0 AND progress_planned <= 100),
    progress_actual NUMERIC(5,2) DEFAULT 0 CHECK (progress_actual >= 0 AND progress_actual <= 100),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_milestone BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_control_project_id, code)
);

CREATE INDEX IF NOT EXISTS idx_pwbs_project_id ON project_control_wbs_items(project_control_project_id);
CREATE INDEX IF NOT EXISTS idx_pwbs_parent_id ON project_control_wbs_items(parent_wbs_item_id);
CREATE INDEX IF NOT EXISTS idx_pwbs_level ON project_control_wbs_items(wbs_level);
CREATE INDEX IF NOT EXISTS idx_pwbs_owner_id ON project_control_wbs_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_pwbs_is_milestone ON project_control_wbs_items(is_milestone);
CREATE INDEX IF NOT EXISTS idx_pwbs_sort_order ON project_control_wbs_items(sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS uix_pwbs_code ON project_control_wbs_items(project_control_project_id, code);

ALTER TABLE project_control_wbs_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pwbs_admin_all" ON project_control_wbs_items
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pwbs_member_read" ON project_control_wbs_items
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_project_members pm
        WHERE pm.project_control_project_id = project_control_wbs_items.project_control_project_id
        AND pm.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_wbs_items IS 'آیتم‌های ساختار شکسته کار (WBS) پروژه';
COMMENT ON COLUMN project_control_wbs_items.parent_wbs_item_id IS 'آیتم والد در درخت WBS';
COMMENT ON COLUMN project_control_wbs_items.wbs_level IS 'سطح عمق درخت WBS';
COMMENT ON COLUMN project_control_wbs_items.is_milestone IS 'نشان‌دهنده نقطه عطف';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۴. project_control_tasks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_project_id UUID NOT NULL REFERENCES project_control_projects(id) ON DELETE CASCADE,
    wbs_item_id UUID REFERENCES project_control_wbs_items(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES project_control_tasks(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'assigned', 'in_progress', 'review', 'approved', 'blocked', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'critical')),
    severity TEXT NOT NULL DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'high', 'critical')),
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    planned_start_date TIMESTAMPTZ,
    planned_due_date TIMESTAMPTZ,
    actual_start_date TIMESTAMPTZ,
    actual_due_date TIMESTAMPTZ,
    expected_output TEXT DEFAULT '',
    acceptance_criteria TEXT DEFAULT '',
    weight NUMERIC(5,2) DEFAULT 0 CHECK (weight >= 0 AND weight <= 100),
    estimated_hours NUMERIC(6,2) DEFAULT 0 CHECK (estimated_hours >= 0),
    actual_hours NUMERIC(6,2) DEFAULT 0 CHECK (actual_hours >= 0),
    progress NUMERIC(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    dependencies JSONB DEFAULT '[]'::jsonb CHECK (jsonb_typeof(dependencies) = 'array'),
    deliverables JSONB DEFAULT '[]'::jsonb CHECK (jsonb_typeof(deliverables) = 'array'),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN GENERATED ALWAYS AS (
        wbs_item_id IS NOT NULL
        AND title IS NOT NULL
        AND assignee_id IS NOT NULL
        AND approver_id IS NOT NULL
        AND planned_due_date IS NOT NULL
        AND expected_output IS NOT NULL
        AND acceptance_criteria IS NOT NULL
        AND weight > 0
    ) STORED,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_control_project_id, code)
);

CREATE INDEX IF NOT EXISTS idx_pct_project_id ON project_control_tasks(project_control_project_id);
CREATE INDEX IF NOT EXISTS idx_pct_wbs_item_id ON project_control_tasks(wbs_item_id);
CREATE INDEX IF NOT EXISTS idx_pct_parent_id ON project_control_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_pct_assignee_id ON project_control_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_pct_approver_id ON project_control_tasks(approver_id);
CREATE INDEX IF NOT EXISTS idx_pct_reporter_id ON project_control_tasks(reporter_id);
CREATE INDEX IF NOT EXISTS idx_pct_status ON project_control_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pct_priority ON project_control_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_pct_is_active ON project_control_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_pct_planned_due_date ON project_control_tasks(planned_due_date);
CREATE UNIQUE INDEX IF NOT EXISTS uix_pct_code ON project_control_tasks(project_control_project_id, code);

ALTER TABLE project_control_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pct_admin_all" ON project_control_tasks
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pct_member_read" ON project_control_tasks
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_project_members pm
        WHERE pm.project_control_project_id = project_control_tasks.project_control_project_id
        AND pm.user_id = auth.uid()
    ));

CREATE POLICY "pct_assignee_update" ON project_control_tasks
    FOR UPDATE USING (auth.uid() = assignee_id);

COMMENT ON TABLE project_control_tasks IS 'وظایف پروژه کنترل پروژه';
COMMENT ON COLUMN project_control_tasks.is_active IS 'وضعیت فعال: تمام فیلدهای الزامی پر شده';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۵. project_control_task_assignments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_task_id UUID NOT NULL REFERENCES project_control_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'assignee' CHECK (role IN ('assignee', 'reviewer', 'approver', 'observer')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_control_task_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_pta_task_id ON project_control_task_assignments(project_control_task_id);
CREATE INDEX IF NOT EXISTS idx_pta_user_id ON project_control_task_assignments(user_id);

ALTER TABLE project_control_task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pta_admin_all" ON project_control_task_assignments
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pta_member_read" ON project_control_task_assignments
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_tasks pt
        JOIN project_control_project_members pm ON pm.project_control_project_id = pt.project_control_project_id
        WHERE pt.id = project_control_task_assignments.project_control_task_id
        AND pm.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_task_assignments IS 'تخصیص وظایف به کاربران';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۶. project_control_task_updates
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_task_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_task_id UUID NOT NULL REFERENCES project_control_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status_from TEXT,
    status_to TEXT NOT NULL CHECK (status_to IN ('draft', 'ready', 'assigned', 'in_progress', 'review', 'approved', 'blocked', 'completed', 'cancelled')),
    progress_from NUMERIC(5,2),
    progress_to NUMERIC(5,2) CHECK (progress_to >= 0 AND progress_to <= 100),
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ptu_task_id ON project_control_task_updates(project_control_task_id);
CREATE INDEX IF NOT EXISTS idx_ptu_user_id ON project_control_task_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_ptu_created_at ON project_control_task_updates(created_at DESC);

ALTER TABLE project_control_task_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ptu_admin_all" ON project_control_task_updates
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "ptu_member_read" ON project_control_task_updates
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_tasks pt
        JOIN project_control_project_members pm ON pm.project_control_project_id = pt.project_control_project_id
        WHERE pt.id = project_control_task_updates.project_control_task_id
        AND pm.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_task_updates IS 'تاریخچه وضعیت و پیشرفت وظایف';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۷. project_control_time_logs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_task_id UUID NOT NULL REFERENCES project_control_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    hours NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_control_task_id, user_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_ptl_task_id ON project_control_time_logs(project_control_task_id);
CREATE INDEX IF NOT EXISTS idx_ptl_user_id ON project_control_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ptl_work_date ON project_control_time_logs(work_date);

ALTER TABLE project_control_time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ptl_admin_all" ON project_control_time_logs
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "ptl_member_read" ON project_control_time_logs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_tasks pt
        JOIN project_control_project_members pm ON pm.project_control_project_id = pt.project_control_project_id
        WHERE pt.id = project_control_time_logs.project_control_task_id
        AND pm.user_id = auth.uid()
    ));

CREATE POLICY "ptl_user_insert" ON project_control_time_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE project_control_time_logs IS 'ثبت ساعات کاری روی وظایف';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۸. project_control_attachments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_task_id UUID REFERENCES project_control_tasks(id) ON DELETE CASCADE,
    project_control_project_id UUID REFERENCES project_control_projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT DEFAULT 0 CHECK (file_size >= 0),
    mime_type TEXT DEFAULT '',
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pa_task_id ON project_control_attachments(project_control_task_id);
CREATE INDEX IF NOT EXISTS idx_pa_project_id ON project_control_attachments(project_control_project_id);
CREATE INDEX IF NOT EXISTS idx_pa_uploaded_by ON project_control_attachments(uploaded_by);

ALTER TABLE project_control_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pa_admin_all" ON project_control_attachments
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pa_member_read" ON project_control_attachments
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_tasks pt
        JOIN project_control_project_members pm ON pm.project_control_project_id = pt.project_control_project_id
        WHERE pt.id = project_control_attachments.project_control_task_id
        AND pm.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_attachments IS 'پیوست‌های پروژه و وظایف';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۹. project_control_comments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_task_id UUID REFERENCES project_control_tasks(id) ON DELETE CASCADE,
    project_control_project_id UUID REFERENCES project_control_projects(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES project_control_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pc_task_id ON project_control_comments(project_control_task_id);
CREATE INDEX IF NOT EXISTS idx_pc_project_id ON project_control_comments(project_control_project_id);
CREATE INDEX IF NOT EXISTS idx_pc_user_id ON project_control_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_pc_parent_id ON project_control_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_pc_created_at ON project_control_comments(created_at DESC);

ALTER TABLE project_control_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pc_admin_all" ON project_control_comments
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pc_member_read" ON project_control_comments
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_tasks pt
        JOIN project_control_project_members pm ON pm.project_control_project_id = pt.project_control_project_id
        WHERE pt.id = project_control_comments.project_control_task_id
        AND pm.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_comments IS 'کامنت‌های وظایف و پروژه‌ها';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۱۰. project_control_approvals
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_task_id UUID NOT NULL REFERENCES project_control_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('submit', 'approve', 'reject', 'request_changes')),
    comment TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pa_task_id ON project_control_approvals(project_control_task_id);
CREATE INDEX IF NOT EXISTS idx_pa_user_id ON project_control_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_status ON project_control_approvals(status);

ALTER TABLE project_control_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pa_admin_all" ON project_control_approvals
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pa_member_read" ON project_control_approvals
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_tasks pt
        JOIN project_control_project_members pm ON pm.project_control_project_id = pt.project_control_project_id
        WHERE pt.id = project_control_approvals.project_control_task_id
        AND pm.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_approvals IS 'رده‌بندی و تأیید وظایف';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۱۱. project_control_blockers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_blockers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_task_id UUID NOT NULL REFERENCES project_control_tasks(id) ON DELETE CASCADE,
    project_control_project_id UUID NOT NULL REFERENCES project_control_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pb_task_id ON project_control_blockers(project_control_task_id);
CREATE INDEX IF NOT EXISTS idx_pb_project_id ON project_control_blockers(project_control_project_id);
CREATE INDEX IF NOT EXISTS idx_pb_status ON project_control_blockers(status);
CREATE INDEX IF NOT EXISTS idx_pb_severity ON project_control_blockers(severity);
CREATE INDEX IF NOT EXISTS idx_pb_reported_by ON project_control_blockers(reported_by);

ALTER TABLE project_control_blockers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pb_admin_all" ON project_control_blockers
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pb_member_read" ON project_control_blockers
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_blockers pb
        JOIN project_control_project_members pm ON pm.project_control_project_id = pb.project_control_project_id
        WHERE pb.id = project_control_blockers.id
        AND pm.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_blockers IS 'مسدودکننده‌های پروژه و وظایف';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۱۲. project_control_milestones
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_project_id UUID NOT NULL REFERENCES project_control_projects(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    planned_date TIMESTAMPTZ NOT NULL,
    actual_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'achieved', 'missed', 'cancelled')),
    achieved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_control_project_id, code)
);

CREATE INDEX IF NOT EXISTS idx_pm_project_id ON project_control_milestones(project_control_project_id);
CREATE INDEX IF NOT EXISTS idx_pm_status ON project_control_milestones(status);
CREATE INDEX IF NOT EXISTS idx_pm_planned_date ON project_control_milestones(planned_date);
CREATE UNIQUE INDEX IF NOT EXISTS uix_pm_code ON project_control_milestones(project_control_project_id, code);

ALTER TABLE project_control_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_admin_all" ON project_control_milestones
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pm_member_read" ON project_control_milestones
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_project_members pm
        WHERE pm.project_control_project_id = project_control_milestones.project_control_project_id
        AND pm.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_milestones IS 'نقاط عطف پروژه';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۱۳. project_control_risks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_project_id UUID NOT NULL REFERENCES project_control_projects(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'technical' CHECK (category IN ('technical', 'schedule', 'budget', 'resource', 'scope', 'external', 'compliance')),
    probability INTEGER NOT NULL DEFAULT 3 CHECK (probability >= 1 AND probability <= 5),
    impact INTEGER NOT NULL DEFAULT 3 CHECK (impact >= 1 AND impact <= 5),
    level TEXT GENERATED ALWAYS AS (
        CASE
            WHEN probability * impact >= 20 THEN 'critical'
            WHEN probability * impact >= 12 THEN 'high'
            WHEN probability * impact >= 6 THEN 'medium'
            ELSE 'low'
        END
    ) STORED,
    status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'mitigating', 'accepted', 'transferred', 'closed')),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    mitigation_plan TEXT DEFAULT '',
    residual_risk TEXT DEFAULT '',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_control_project_id, code)
);

CREATE INDEX IF NOT EXISTS idx_pr_project_id ON project_control_risks(project_control_project_id);
CREATE INDEX IF NOT EXISTS idx_pr_category ON project_control_risks(category);
CREATE INDEX IF NOT EXISTS idx_pr_level ON project_control_risks(level);
CREATE INDEX IF NOT EXISTS idx_pr_status ON project_control_risks(status);
CREATE INDEX IF NOT EXISTS idx_pr_owner_id ON project_control_risks(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS uix_pr_code ON project_control_risks(project_control_project_id, code);

ALTER TABLE project_control_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pr_admin_all" ON project_control_risks
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pr_member_read" ON project_control_risks
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_project_members pm
        WHERE pm.project_control_project_id = project_control_risks.project_control_project_id
        AND pm.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_risks IS 'ریسک‌های پروژه';
COMMENT ON COLUMN project_control_risks.level IS 'سطح ریسک محاسبه‌شدنی (probability × impact)';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۱۴. project_control_notification_rules
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_project_id UUID REFERENCES project_control_projects(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('task_assigned', 'task_status_changed', 'task_approved', 'task_rejected', 'blocker_added', 'blocker_resolved', 'milestone_achieved', 'risk_identified', 'risk_escalated', 'comment_added', 'attachment_uploaded', 'deadline_approaching', 'overdue')),
    channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'whatsapp', 'sms', 'all')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pnr_project_id ON project_control_notification_rules(project_control_project_id);
CREATE INDEX IF NOT EXISTS idx_pnr_event_type ON project_control_notification_rules(event_type);
CREATE INDEX IF NOT EXISTS idx_pnr_user_id ON project_control_notification_rules(user_id);

ALTER TABLE project_control_notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnr_admin_all" ON project_control_notification_rules
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pnr_member_read" ON project_control_notification_rules
    FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE project_control_notification_rules IS 'قوانین اعلان‌رسانی پروژه';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۱۵. project_control_notifications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_project_id UUID REFERENCES project_control_projects(id) ON DELETE CASCADE,
    project_control_task_id UUID REFERENCES project_control_tasks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('task_assigned', 'task_status_changed', 'task_approved', 'task_rejected', 'blocker_added', 'blocker_resolved', 'milestone_achieved', 'risk_identified', 'risk_escalated', 'comment_added', 'attachment_uploaded', 'deadline_approaching', 'overdue')),
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'whatsapp', 'sms')),
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pn_project_id ON project_control_notifications(project_control_project_id);
CREATE INDEX IF NOT EXISTS idx_pn_task_id ON project_control_notifications(project_control_task_id);
CREATE INDEX IF NOT EXISTS idx_pn_recipient_id ON project_control_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_pn_is_read ON project_control_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_pn_created_at ON project_control_notifications(created_at DESC);

ALTER TABLE project_control_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pn_admin_all" ON project_control_notifications
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pn_recipient_read" ON project_control_notifications
    FOR SELECT USING (auth.uid() = recipient_id);

COMMENT ON TABLE project_control_notifications IS 'اعلان‌های پروژه و وظایف';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۱۶. project_control_notification_deliveries
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_notification_id UUID NOT NULL REFERENCES project_control_notifications(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'whatsapp', 'sms')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'retrying')),
    provider_message_id TEXT,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pnd_notification_id ON project_control_notification_deliveries(project_control_notification_id);
CREATE INDEX IF NOT EXISTS idx_pnd_status ON project_control_notification_deliveries(status);

ALTER TABLE project_control_notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnd_admin_all" ON project_control_notification_deliveries
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

COMMENT ON TABLE project_control_notification_deliveries IS 'وضعیت تحویل اعلان‌ها';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۱۷. project_control_user_notification_preferences
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_control_project_id UUID REFERENCES project_control_projects(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'whatsapp', 'sms')),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, project_control_project_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_punp_user_id ON project_control_user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_punp_project_id ON project_control_user_notification_preferences(project_control_project_id);

ALTER TABLE project_control_user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "punp_admin_all" ON project_control_user_notification_preferences
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "punp_user_read" ON project_control_user_notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE project_control_user_notification_preferences IS 'ترجیحات اعلان‌رسانی کاربران';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۱۸. project_control_ai_agent_runs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_ai_agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_project_id UUID REFERENCES project_control_projects(id) ON DELETE CASCADE,
    project_control_task_id UUID REFERENCES project_control_tasks(id) ON DELETE CASCADE,
    run_type TEXT NOT NULL CHECK (run_type IN ('analysis', 'suggestion', 'summary', 'risk_assessment', 'schedule_optimization', 'resource_planning')),
    model TEXT NOT NULL DEFAULT 'default',
    prompt TEXT NOT NULL,
    input_data JSONB DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'timeout')),
    confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 1),
    tokens_used INTEGER DEFAULT 0 CHECK (tokens_used >= 0),
    duration_ms INTEGER DEFAULT 0 CHECK (duration_ms >= 0),
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_piar_project_id ON project_control_ai_agent_runs(project_control_project_id);
CREATE INDEX IF NOT EXISTS idx_piar_task_id ON project_control_ai_agent_runs(project_control_task_id);
CREATE INDEX IF NOT EXISTS idx_piar_run_type ON project_control_ai_agent_runs(run_type);
CREATE INDEX IF NOT EXISTS idx_piar_status ON project_control_ai_agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_piar_created_at ON project_control_ai_agent_runs(created_at DESC);

ALTER TABLE project_control_ai_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "piar_admin_all" ON project_control_ai_agent_runs
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "piar_member_read" ON project_control_ai_agent_runs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_project_members pm
        WHERE pm.project_control_project_id = project_control_ai_agent_runs.project_control_project_id
        AND pm.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_ai_agent_runs IS 'اجرای‌های آژانس هوش مصنوعی';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۱۹. project_control_ai_agent_insights
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_ai_agent_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_project_id UUID REFERENCES project_control_projects(id) ON DELETE CASCADE,
    project_control_task_id UUID REFERENCES project_control_tasks(id) ON DELETE SET NULL,
    project_control_ai_agent_run_id UUID REFERENCES project_control_ai_agent_runs(id) ON DELETE SET NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('schedule_risk', 'resource_constraint', 'cost_variance', 'quality_issue', 'dependency_conflict', 'bottleneck', 'opportunity')),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 1),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_dismissed BOOLEAN NOT NULL DEFAULT false,
    dismissed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pai_project_id ON project_control_ai_agent_insights(project_control_project_id);
CREATE INDEX IF NOT EXISTS idx_pai_task_id ON project_control_ai_agent_insights(project_control_task_id);
CREATE INDEX IF NOT EXISTS idx_pai_run_id ON project_control_ai_agent_insights(project_control_ai_agent_run_id);
CREATE INDEX IF NOT EXISTS idx_pai_type ON project_control_ai_agent_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_pai_severity ON project_control_ai_agent_insights(severity);

ALTER TABLE project_control_ai_agent_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pai_admin_all" ON project_control_ai_agent_insights
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "pai_member_read" ON project_control_ai_agent_insights
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_project_members pm
        WHERE pm.project_control_project_id = project_control_ai_agent_insights.project_control_project_id
        AND pm.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_ai_agent_insights IS 'یافته‌های هوش مصنوعی پروژه';

-- ─────────────────────────────────────────────────────────────────────────────
-- ۲۰. project_control_ai_agent_recommendations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_control_ai_agent_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_control_project_id UUID REFERENCES project_control_projects(id) ON DELETE CASCADE,
    project_control_task_id UUID REFERENCES project_control_tasks(id) ON DELETE SET NULL,
    project_control_ai_agent_run_id UUID REFERENCES project_control_ai_agent_runs(id) ON DELETE SET NULL,
    project_control_ai_agent_insight_id UUID REFERENCES project_control_ai_agent_insights(id) ON DELETE SET NULL,
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('schedule_adjustment', 'resource_reallocation', 'risk_mitigation', 'scope_change', 'process_improvement', 'cost_optimization')),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    action_items JSONB DEFAULT '[]'::jsonb CHECK (jsonb_typeof(action_items) = 'array'),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    estimated_impact TEXT DEFAULT '',
    confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 1),
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected', 'implemented')),
    implemented_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    implemented_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_par_project_id ON project_control_ai_agent_recommendations(project_control_project_id);
CREATE INDEX IF NOT EXISTS idx_par_task_id ON project_control_ai_agent_recommendations(project_control_task_id);
CREATE INDEX IF NOT EXISTS idx_par_run_id ON project_control_ai_agent_recommendations(project_control_ai_agent_run_id);
CREATE INDEX IF NOT EXISTS idx_par_insight_id ON project_control_ai_agent_recommendations(project_control_ai_agent_insight_id);
CREATE INDEX IF NOT EXISTS idx_par_status ON project_control_ai_agent_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_par_priority ON project_control_ai_agent_recommendations(priority);

ALTER TABLE project_control_ai_agent_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "par_admin_all" ON project_control_ai_agent_recommendations
    USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));

CREATE POLICY "par_member_read" ON project_control_ai_agent_recommendations
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM project_control_project_members pm
        WHERE pm.project_control_project_id = project_control_ai_agent_recommendations.project_control_project_id
        AND pm.user_id = auth.uid()
    ));

COMMENT ON TABLE project_control_ai_agent_recommendations IS 'توصیه‌های هوش مصنوعی پروژه';

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: set_updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers: updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_pcp_projects_updated_at
    BEFORE UPDATE ON project_control_projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pcp_project_members_updated_at
    BEFORE UPDATE ON project_control_project_members
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pwbs_items_updated_at
    BEFORE UPDATE ON project_control_wbs_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pct_tasks_updated_at
    BEFORE UPDATE ON project_control_tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pct_assignments_updated_at
    BEFORE UPDATE ON project_control_task_assignments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pct_comments_updated_at
    BEFORE UPDATE ON project_control_comments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pblockers_updated_at
    BEFORE UPDATE ON project_control_blockers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pmilestones_updated_at
    BEFORE UPDATE ON project_control_milestones
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_prisks_updated_at
    BEFORE UPDATE ON project_control_risks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Additional Cross-Table Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pct_project_status ON project_control_tasks(project_control_project_id, status);
CREATE INDEX IF NOT EXISTS idx_pct_assignee_status ON project_control_tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_pwbs_project_level ON project_control_wbs_items(project_control_project_id, wbs_level);
CREATE INDEX IF NOT EXISTS idx_pwbs_parent_active ON project_control_wbs_items(parent_wbs_item_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pct_task_due_date ON project_control_tasks(planned_due_date, status);
CREATE INDEX IF NOT EXISTS idx_pct_overdue ON project_control_tasks(planned_due_date, status, assignee_id) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_pn_unread ON project_control_notifications(recipient_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_pnd_pending ON project_control_notification_deliveries(status, created_at) WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_pai_unread ON project_control_ai_agent_insights(project_control_project_id, is_dismissed, severity) WHERE is_dismissed = false;
CREATE INDEX IF NOT EXISTS idx_par_proposed ON project_control_ai_agent_recommendations(project_control_project_id, status, priority) WHERE status = 'proposed';

-- ─────────────────────────────────────────────────────────────────────────────
-- Additional Foreign Keys (cross-table references not covered by inline REFERENCES)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE project_control_tasks
    ADD CONSTRAINT fk_pct_wbs_item
    FOREIGN KEY (wbs_item_id) REFERENCES project_control_wbs_items(id) ON DELETE SET NULL;

ALTER TABLE project_control_tasks
    ADD CONSTRAINT fk_pct_parent_task
    FOREIGN KEY (parent_task_id) REFERENCES project_control_tasks(id) ON DELETE SET NULL;

ALTER TABLE project_control_task_updates
    ADD CONSTRAINT fk_ptu_task
    FOREIGN KEY (project_control_task_id) REFERENCES project_control_tasks(id) ON DELETE CASCADE;

ALTER TABLE project_control_time_logs
    ADD CONSTRAINT fk_ptl_task
    FOREIGN KEY (project_control_task_id) REFERENCES project_control_tasks(id) ON DELETE CASCADE;

ALTER TABLE project_control_attachments
    ADD CONSTRAINT fk_pa_task
    FOREIGN KEY (project_control_task_id) REFERENCES project_control_tasks(id) ON DELETE CASCADE;

ALTER TABLE project_control_attachments
    ADD CONSTRAINT fk_pa_project
    FOREIGN KEY (project_control_project_id) REFERENCES project_control_projects(id) ON DELETE CASCADE;

ALTER TABLE project_control_comments
    ADD CONSTRAINT fk_pc_task
    FOREIGN KEY (project_control_task_id) REFERENCES project_control_tasks(id) ON DELETE CASCADE;

ALTER TABLE project_control_comments
    ADD CONSTRAINT fk_pc_project
    FOREIGN KEY (project_control_project_id) REFERENCES project_control_projects(id) ON DELETE CASCADE;

ALTER TABLE project_control_comments
    ADD CONSTRAINT fk_pc_parent_comment
    FOREIGN KEY (parent_comment_id) REFERENCES project_control_comments(id) ON DELETE CASCADE;

ALTER TABLE project_control_approvals
    ADD CONSTRAINT fk_pa_task
    FOREIGN KEY (project_control_task_id) REFERENCES project_control_tasks(id) ON DELETE CASCADE;

ALTER TABLE project_control_blockers
    ADD CONSTRAINT fk_pb_task
    FOREIGN KEY (project_control_task_id) REFERENCES project_control_tasks(id) ON DELETE CASCADE;

ALTER TABLE project_control_milestones
    ADD CONSTRAINT fk_pm_project
    FOREIGN KEY (project_control_project_id) REFERENCES project_control_projects(id) ON DELETE CASCADE;

ALTER TABLE project_control_risks
    ADD CONSTRAINT fk_pr_project
    FOREIGN KEY (project_control_project_id) REFERENCES project_control_projects(id) ON DELETE CASCADE;

ALTER TABLE project_control_notification_rules
    ADD CONSTRAINT fk_pnr_project
    FOREIGN KEY (project_control_project_id) REFERENCES project_control_projects(id) ON DELETE CASCADE;

ALTER TABLE project_control_notifications
    ADD CONSTRAINT fk_pn_project
    FOREIGN KEY (project_control_project_id) REFERENCES project_control_projects(id) ON DELETE CASCADE;

ALTER TABLE project_control_notifications
    ADD CONSTRAINT fk_pn_task
    FOREIGN KEY (project_control_task_id) REFERENCES project_control_tasks(id) ON DELETE CASCADE;

ALTER TABLE project_control_notification_deliveries
    ADD CONSTRAINT fk_pnd_notification
    FOREIGN KEY (project_control_notification_id) REFERENCES project_control_notifications(id) ON DELETE CASCADE;

ALTER TABLE project_control_user_notification_preferences
    ADD CONSTRAINT fk_punp_project
    FOREIGN KEY (project_control_project_id) REFERENCES project_control_projects(id) ON DELETE CASCADE;

ALTER TABLE project_control_ai_agent_runs
    ADD CONSTRAINT fk_piar_project
    FOREIGN KEY (project_control_project_id) REFERENCES project_control_projects(id) ON DELETE CASCADE;

ALTER TABLE project_control_ai_agent_runs
    ADD CONSTRAINT fk_piar_task
    FOREIGN KEY (project_control_task_id) REFERENCES project_control_tasks(id) ON DELETE SET NULL;

ALTER TABLE project_control_ai_agent_insights
    ADD CONSTRAINT fk_pai_project
    FOREIGN KEY (project_control_project_id) REFERENCES project_control_projects(id) ON DELETE CASCADE;

ALTER TABLE project_control_ai_agent_insights
    ADD CONSTRAINT fk_pai_task
    FOREIGN KEY (project_control_task_id) REFERENCES project_control_tasks(id) ON DELETE SET NULL;

ALTER TABLE project_control_ai_agent_insights
    ADD CONSTRAINT fk_pai_run
    FOREIGN KEY (project_control_ai_agent_run_id) REFERENCES project_control_ai_agent_runs(id) ON DELETE SET NULL;

ALTER TABLE project_control_ai_agent_recommendations
    ADD CONSTRAINT fk_par_project
    FOREIGN KEY (project_control_project_id) REFERENCES project_control_projects(id) ON DELETE CASCADE;

ALTER TABLE project_control_ai_agent_recommendations
    ADD CONSTRAINT fk_par_task
    FOREIGN KEY (project_control_task_id) REFERENCES project_control_tasks(id) ON DELETE SET NULL;

ALTER TABLE project_control_ai_agent_recommendations
    ADD CONSTRAINT fk_par_run
    FOREIGN KEY (project_control_ai_agent_run_id) REFERENCES project_control_ai_agent_runs(id) ON DELETE SET NULL;

ALTER TABLE project_control_ai_agent_recommendations
    ADD CONSTRAINT fk_par_insight
    FOREIGN KEY (project_control_ai_agent_insight_id) REFERENCES project_control_ai_agent_insights(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Additional CHECK Constraints
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE project_control_wbs_items
    ADD CONSTRAINT chk_pwbs_level CHECK (wbs_level >= 1 AND wbs_level <= 5);

ALTER TABLE project_control_tasks
    ADD CONSTRAINT chk_pct_weight CHECK (weight >= 0 AND weight <= 100);

ALTER TABLE project_control_tasks
    ADD CONSTRAINT chk_pct_estimated_hours CHECK (estimated_hours >= 0);

ALTER TABLE project_control_tasks
    ADD CONSTRAINT chk_pct_actual_hours CHECK (actual_hours >= 0);

ALTER TABLE project_control_tasks
    ADD CONSTRAINT chk_pct_progress CHECK (progress >= 0 AND progress <= 100);

ALTER TABLE project_control_task_assignments
    ADD CONSTRAINT chk_pta_role CHECK (role IN ('assignee', 'reviewer', 'approver', 'observer'));

ALTER TABLE project_control_task_updates
    ADD CONSTRAINT chk_ptu_status_to CHECK (status_to IN ('draft', 'ready', 'assigned', 'in_progress', 'review', 'approved', 'blocked', 'completed', 'cancelled'));

ALTER TABLE project_control_time_logs
    ADD CONSTRAINT chk_ptl_hours CHECK (hours > 0 AND hours <= 24);

ALTER TABLE project_control_milestones
    ADD CONSTRAINT chk_pm_status CHECK (status IN ('pending', 'in_progress', 'achieved', 'missed', 'cancelled'));

ALTER TABLE project_control_risks
    ADD CONSTRAINT chk_pr_probability CHECK (probability >= 1 AND probability <= 5);

ALTER TABLE project_control_risks
    ADD CONSTRAINT chk_pr_impact CHECK (impact >= 1 AND impact <= 5);

ALTER TABLE project_control_notification_deliveries
    ADD CONSTRAINT chk_pnd_retry_count CHECK (retry_count >= 0);

ALTER TABLE project_control_ai_agent_runs
    ADD CONSTRAINT chk_piar_tokens CHECK (tokens_used >= 0);

ALTER TABLE project_control_ai_agent_runs
    ADD CONSTRAINT chk_piar_duration CHECK (duration_ms >= 0);

ALTER TABLE project_control_ai_agent_insights
    ADD CONSTRAINT chk_pai_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

ALTER TABLE project_control_ai_agent_recommendations
    ADD CONSTRAINT chk_par_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

-- ─────────────────────────────────────────────────────────────────────────────
-- Schema Summary
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    tbl_count INTEGER;
    idx_count INTEGER;
    fk_count INTEGER;
    rl_tables TEXT[];
BEGIN
    SELECT count(*) INTO tbl_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE 'project_control_%';

    SELECT count(*) INTO idx_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_p%' OR indexname LIKE 'uix_p%' OR indexname LIKE 'pct_%';

    SELECT count(*) INTO fk_count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_name LIKE 'project_control_%';

    RAISE NOTICE '=== Project Control WBS MVP Schema Summary ===';
    RAISE NOTICE 'Tables created: %', tbl_count;
    RAISE NOTICE 'Indexes created: %', idx_count;
    RAISE NOTICE 'Foreign keys created: %', fk_count;
    RAISE NOTICE 'RLS enabled on all project_control_ tables';
    RAISE NOTICE 'Triggers: set_updated_at on 11 tables';
    RAISE NOTICE 'Generated columns: tasks.is_active, risks.level';
END;
$$;

COMMENT ON SCHEMA public IS 'آذرمهر صنعت — سامانه مدیریت و کنترل پروژه مبتنی بر WBS';
