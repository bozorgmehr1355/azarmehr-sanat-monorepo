CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    project_id UUID,
    organizer_id UUID,
    meeting_date TIMESTAMP WITH TIME ZONE,
    transcript_text TEXT,
    summary_text TEXT,
    decisions_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS meeting_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID,
    suggested_task_title TEXT NOT NULL,
    suggested_task_description TEXT,
    assignee_id UUID,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS ai_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- meeting, task_update, blocker, report
    entity_id UUID,
    draft_type TEXT NOT NULL,  -- summary, action_items, rewrite, manager_review
    input_text TEXT,
    output_text TEXT,
    created_by UUID,
    approval_status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- project, task, meeting, ai_draft
    entity_id UUID,
    action_type TEXT NOT NULL, -- create, update, delete, status_change, approve
    actor_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
