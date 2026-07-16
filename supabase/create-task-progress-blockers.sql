CREATE TABLE IF NOT EXISTS task_progress_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_task_id UUID,
    user_id UUID,
    progress_percent INTEGER,
    text TEXT NOT NULL,
    condition TEXT,
    next_step TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS task_blockers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_task_id UUID,
    reported_by UUID,
    blocker_type TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT DEFAULT 'MEDIUM',
    status TEXT DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMP WITH TIME ZONE
);
