-- ENABLE RLS ON ALL TABLES
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: drop policy if exists
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN (
    'projects','project_members','project_tasks','task_status_history',
    'task_attachments','task_progress_updates','task_blockers',
    'meetings','meeting_action_items','ai_drafts','audit_logs'
  ) LOOP
    EXECUTE format('DROP POLICY %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 1. PROJECTS & MEMBERS
CREATE POLICY "projects_admin_all" ON projects USING (auth.jwt() ->> 'system_role' IN ('super_admin','admin'));
CREATE POLICY "projects_member_read" ON projects FOR SELECT USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid()));

CREATE POLICY "pm_admin_all" ON project_members USING (auth.jwt() ->> 'system_role' IN ('super_admin','admin'));
CREATE POLICY "pm_user_read" ON project_members FOR SELECT USING (user_id = auth.uid());

-- 2. TASKS & CHILDREN (Using project_id as anchor)
CREATE POLICY "tasks_admin_all" ON project_tasks USING (auth.jwt() ->> 'system_role' IN ('super_admin','admin'));
CREATE POLICY "tasks_member_read" ON project_tasks FOR SELECT USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = project_tasks.project_id AND user_id = auth.uid()));
CREATE POLICY "tasks_assignee_update" ON project_tasks FOR UPDATE USING (assigned_to = auth.uid());

-- Simple policies for task children (inheriting from task)
CREATE POLICY "task_children_read" ON task_status_history FOR SELECT USING (EXISTS (SELECT 1 FROM project_tasks WHERE id = task_status_history.project_task_id AND (assigned_to = auth.uid() OR creator_id = auth.uid())));
CREATE POLICY "task_children_read_2" ON task_attachments FOR SELECT USING (EXISTS (SELECT 1 FROM project_tasks WHERE id = task_attachments.project_task_id AND (assigned_to = auth.uid() OR creator_id = auth.uid())));

-- 3. MEETINGS
CREATE POLICY "meetings_admin_all" ON meetings USING (auth.jwt() ->> 'system_role' IN ('super_admin','admin'));
CREATE POLICY "meetings_member_read" ON meetings FOR SELECT USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = meetings.project_id AND user_id = auth.uid()));

-- 4. AI & AUDIT
CREATE POLICY "ai_drafts_owner" ON ai_drafts FOR ALL USING (created_by = auth.uid());
CREATE POLICY "audit_logs_admin" ON audit_logs FOR SELECT USING (auth.jwt() ->> 'system_role' IN ('super_admin','admin'));