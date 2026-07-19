const { supabase, cors, requireAuth, requireAdmin, requireSuperAdmin } = require('./_lib');
const { writeAuditLog } = require('./_audit');

// ─── ثابت‌های وضعیت (منبع واحد حقیقت - SSOT) ───
// TERMINAL = همه حالت‌های پایانی که دیگر ترنزیشن ندارند
const TERMINAL_STATUSES = ['APPROVED', 'REJECTED', 'CANCELLED', 'ARCHIVED'];
// SUCCESSFULLY_COMPLETED = فقط APPROVED (موفقیت واقعی)
const SUCCESSFULLY_COMPLETED_STATUSES = ['APPROVED'];
// FINAL_WITH_COMPLETED_AT = حالت‌هایی که completed_at می‌گیرند
const FINAL_WITH_COMPLETED_AT = ['APPROVED', 'REJECTED', 'ARCHIVED'];

// transitions مجاز:
const TRANSITIONS = {
  ASSIGNED:          ['SEEN', 'ACKNOWLEDGED', 'NEEDS_CLARIFICATION', 'CANCELLED'],
  SEEN:              ['ACKNOWLEDGED', 'NEEDS_CLARIFICATION', 'CANCELLED'],
  ACKNOWLEDGED:      ['IN_PROGRESS', 'NEEDS_CLARIFICATION', 'CANCELLED'],
  IN_PROGRESS:       ['SUBMITTED', 'BLOCKED', 'NEEDS_CLARIFICATION', 'CANCELLED'],
  NEEDS_CLARIFICATION: ['ACKNOWLEDGED', 'IN_PROGRESS', 'CANCELLED'],
  BLOCKED:           ['IN_PROGRESS', 'CANCELLED'],
  SUBMITTED:         ['APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'CANCELLED'],
  REVISION_REQUESTED: ['IN_PROGRESS', 'CANCELLED'],
  APPROVED:          ['ARCHIVED'],
  REJECTED:          ['ARCHIVED', 'CANCELLED'],
  CANCELLED:         ['ARCHIVED'],
  OVERDUE:           ['IN_PROGRESS', 'CANCELLED'],
  ARCHIVED:          [], // terminal state
};

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    requireAuth(req);

    const pathname = (req.url || '').split('?')[0];
    const parts = pathname.split('/').filter(Boolean); // e.g. ['api', 'project-tasks', 'uuid', 'seen']
    const segments = parts.slice(2); // حذف 'api' و 'project-tasks'

    // ─── مسیر فرعی: /api/project-tasks/:id/:action ───
    if (segments.length >= 2 && segments[0] && segments[1]) {
      const taskId = segments[0];
      const action = segments[1];

      // POST /api/project-tasks/:id/seen
      if (req.method === 'POST' && action === 'seen') {
        return await handleStatusTransition(taskId, 'SEEN', req, res);
      }

      // POST /api/project-tasks/:id/acknowledge
      if (req.method === 'POST' && action === 'acknowledge') {
        return await handleStatusTransition(taskId, 'ACKNOWLEDGED', req, res);
      }

      // POST /api/project-tasks/:id/start
      if (req.method === 'POST' && action === 'start') {
        return await handleStatusTransition(taskId, 'IN_PROGRESS', req, res);
      }

      // POST /api/project-tasks/:id/submit
      if (req.method === 'POST' && action === 'submit') {
        return await handleSubmit(taskId, req, res);
      }

      // POST /api/project-tasks/:id/review (admin only)
      if (req.method === 'POST' && action === 'review') {
        return await handleReview(taskId, req, res);
      }

      // POST /api/project-tasks/:id/progress
      if (req.method === 'POST' && action === 'progress') {
        return await handleProgressUpdate(taskId, req, res);
      }

      // POST /api/project-tasks/:id/blockers
      if (req.method === 'POST' && action === 'blockers') {
        return await handleBlocker(taskId, req, res);
      }

      // POST /api/project-tasks/:id/cancel (admin only)
      if (req.method === 'POST' && action === 'cancel') {
        return await handleStatusTransition(taskId, 'CANCELLED', req, res, { requireAdminRole: true });
      }

      // POST /api/project-tasks/:id/archive (admin only)
      if (req.method === 'POST' && action === 'archive') {
        return await handleStatusTransition(taskId, 'ARCHIVED', req, res, { requireAdminRole: true });
      }

      // POST /api/project-tasks/:id/clarify
      if (req.method === 'POST' && action === 'clarify') {
        return await handleStatusTransition(taskId, 'NEEDS_CLARIFICATION', req, res);
      }

      return res.status(405).json({ error: `عملیات '${action}' مجاز نیست` });
    }

    // ─── مسیر فرعی: /api/project-tasks/:id (GET/PUT/DELETE) ───
    if (segments.length === 1 && segments[0]) {
      const taskId = segments[0];

      if (req.method === 'GET') {
        return await getTask(taskId, res);
      }

      if (req.method === 'PUT') {
        return await updateTask(taskId, req, res);
      }

      if (req.method === 'DELETE') {
        return await deleteTask(taskId, req, res);
      }
    }

    // ─── مسیر اصلی: /api/project-tasks ───
    if (req.method === 'GET') {
      return await listTasks(req, res);
    }

    if (req.method === 'POST') {
      return await createTask(req, res);
    }

    return res.status(405).json({ error: 'متد مجاز نیست' });

  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
};

// ─── لیست وظایف ───────────────────────────────────────────
async function listTasks(req, res) {
  let query = supabase.from('project_tasks').select('*');

  if (req.query.project_id) {
    const val = String(req.query.project_id).replace(/^eq\./, '');
    query = query.eq('project_id', val);
  }
  if (req.query.assigned_to) {
    const val = String(req.query.assigned_to).replace(/^eq\./, '');
    query = query.eq('assigned_to', val);
  }
  if (req.query.status) {
    const val = String(req.query.status).replace(/^eq\./, '');
    query = query.eq('status', val);
  }
  if (req.query.priority) {
    const val = String(req.query.priority).replace(/^eq\./, '');
    query = query.eq('priority', val);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
}

// ─── جزئیات یک وظیفه ─────────────────────────────────────
async function getTask(taskId, res) {
  const { data, error } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'وظیفه پیدا نشد' });
  return res.json(data);
}

// ─── ایجاد وظیفه ──────────────────────────────────────────
async function createTask(req, res) {
  requireAdmin(req);
  const me = requireAuth(req);
  const { project_id, title, description, assigned_to, priority, due_date } = req.body || {};

  if (!project_id) return res.status(400).json({ error: 'project_id الزامی است' });
  if (!title) return res.status(400).json({ error: 'عنوان وظیفه الزامی است' });

  const status = 'ASSIGNED';

  const { data, error } = await supabase
    .from('project_tasks')
    .insert({
      project_id,
      title,
      description: description || '',
      assigned_to: assigned_to || null,
      creator_id: me.id,
      priority: priority || 'medium',
      due_date: due_date || null,
      status
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // ثبت در audit log
  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'create',
    entity_type: 'task',
    entity_id: data.id,
    old_values: null,
    new_values: { title, project_id, assigned_to, priority, status }
  });

  return res.status(201).json(data);
}

// ─── ویرایش وظیفه (فقط فیلدهای اصلی) ─────────────────────
async function updateTask(taskId, req, res) {
  requireAdmin(req);
  const me = requireAuth(req);
  const { id, ...rest } = req.body || {};

  const allowed = ['title', 'description', 'assigned_to', 'priority', 'due_date'];
  const payload = {};
  for (const [k, v] of Object.entries(rest)) {
    if (allowed.includes(k)) payload[k] = v;
  }

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'هیچ فیلدی برای آپدیت ارسال نشده' });
  }

  // گرفتن وضعیت قبلی
  const { data: old } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  const { data, error } = await supabase
    .from('project_tasks')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'وظیفه پیدا نشد' });

  // ثبت audit
  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'update',
    entity_type: 'task',
    entity_id: taskId,
    old_values: old ? { title: old.title, priority: old.priority, assigned_to: old.assigned_to } : null,
    new_values: payload
  });

  return res.json(data);
}

// ─── حذف وظیفه ────────────────────────────────────────────
async function deleteTask(taskId, req, res) {
  requireSuperAdmin(req);
  const me = requireAuth(req);

  const { data: old } = await supabase
    .from('project_tasks')
    .select('title')
    .eq('id', taskId)
    .single();

  const { error } = await supabase
    .from('project_tasks')
    .delete()
    .eq('id', taskId);

  if (error) return res.status(500).json({ error: error.message });

  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'delete',
    entity_type: 'task',
    entity_id: taskId,
    old_values: old || null,
    new_values: null
  });

  return res.json({ ok: true });
}

// ─── تغییر وضعیت عمومی ───────────────────────────────────
async function handleStatusTransition(taskId, newStatus, req, res, opts = {}) {
  const me = requireAuth(req);

  // اگر نیاز به ادمین باشد
  if (opts.requireAdminRole) {
    requireAdmin(req);
  }

  // گرفتن وظیفه فعلی
  const { data: task, error: fetchErr } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!task) return res.status(404).json({ error: 'وظیفه پیدا نشد' });

  // بررسی transition مجاز
  const allowed = TRANSITIONS[task.status] || [];
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({
      error: `تغییر از '${task.status}' به '${newStatus}' مجاز نیست`,
      allowed
    });
  }

  // تعیین وضعیت نهایی با completed_at
  const isFinalWithCompletedAt = FINAL_WITH_COMPLETED_AT.includes(newStatus);
  const wasFinalWithCompletedAt = FINAL_WITH_COMPLETED_AT.includes(task.status);

  // آپدیت وضعیت
  const updatePayload = {
    status: newStatus,
    updated_at: new Date().toISOString()
  };
  if (isFinalWithCompletedAt) {
    updatePayload.completed_at = new Date().toISOString();
  } else if (wasFinalWithCompletedAt) {
    // برگشت از final state به non-final: completed_at پاک شود
    updatePayload.completed_at = null;
  }

  const { data, error } = await supabase
    .from('project_tasks')
    .update(updatePayload)
    .eq('id', taskId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // ثبت در task_status_history
  await supabase.from('task_status_history').insert({
    project_task_id: taskId,
    status: newStatus,
    user_id: me.id,
  });

  // ثبت audit
  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'status_change',
    entity_type: 'task',
    entity_id: taskId,
    old_values: { status: task.status },
    new_values: { status: newStatus }
  });

  return res.json(data);
}

// ─── تحویل نتیجه (submit) ─────────────────────────────────
async function handleSubmit(taskId, req, res) {
  const me = requireAuth(req);
  const { evidence_urls, note } = req.body || {};

  // evidence الزامی نیست در MVP اولیه ولی توصیه شده
  if (evidence_urls && !Array.isArray(evidence_urls)) {
    return res.status(400).json({ error: 'evidence_urls باید آرایه باشد' });
  }

  // گرفتن وظیفه
  const { data: task, error: fetchErr } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!task) return res.status(404).json({ error: 'وظیفه پیدا نشد' });

  if (task.status !== 'IN_PROGRESS') {
    return res.status(400).json({
      error: `تحویل فقط از وضعیت IN_PROGRESS مجاز است (وضعیت فعلی: ${task.status})`
    });
  }

  // آپدیت وضعیت
  const { data, error } = await supabase
    .from('project_tasks')
    .update({ status: 'SUBMITTED', updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // ثبت فایل‌های ضمیمه
  if (evidence_urls && evidence_urls.length > 0) {
    const attachments = evidence_urls.map(url => ({
      project_task_id: taskId,
      file_url: url,
      file_type: 'evidence',
    }));
    await supabase.from('task_attachments').insert(attachments);
  }

  // ثبت تاریخچه
  await supabase.from('task_status_history').insert({
    project_task_id: taskId,
    status: 'SUBMITTED',
    user_id: me.id,
  });

  // audit
  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'status_change',
    entity_type: 'task',
    entity_id: taskId,
    old_values: { status: 'IN_PROGRESS' },
    new_values: { status: 'SUBMITTED', evidence_count: evidence_urls ? evidence_urls.length : 0 }
  });

  return res.json(data);
}

// ─── بازبینی (review) — فقط ادمین ──────────────────────────
async function handleReview(taskId, req, res) {
  requireAdmin(req);
  const me = requireAuth(req);
  const { decision, revision_note } = req.body || {};

  if (!decision || !['APPROVED', 'REJECTED', 'REVISION_REQUESTED'].includes(decision)) {
    return res.status(400).json({ error: 'decision باید یکی از: APPROVED, REJECTED, REVISION_REQUESTED' });
  }

  const { data: task, error: fetchErr } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!task) return res.status(404).json({ error: 'وظیفه پیدا نشد' });

  if (task.status !== 'SUBMITTED') {
    return res.status(400).json({
      error: `بازبینی فقط از وضعیت SUBMITTED مجاز است (وضعیت فعلی: ${task.status})`
    });
  }

  // completed_at فقط برای FINAL_WITH_COMPLETED_AT
  const completedAt = FINAL_WITH_COMPLETED_AT.includes(decision)
    ? new Date().toISOString()
    : null;

  const { data, error } = await supabase
    .from('project_tasks')
    .update({
      status: decision,
      updated_at: new Date().toISOString(),
      completed_at: completedAt
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // ثبت تاریخچه
  await supabase.from('task_status_history').insert({
    project_task_id: taskId,
    status: decision,
    user_id: me.id,
  });

  // audit
  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: decision === 'APPROVED' ? 'approve' : 'update',
    entity_type: 'task',
    entity_id: taskId,
    old_values: { status: 'SUBMITTED' },
    new_values: { status: decision, revision_note: revision_note || null }
  });

  return res.json(data);
}

// ─── ثبت پیشرفت ──────────────────────────────────────────
async function handleProgressUpdate(taskId, req, res) {
  const me = requireAuth(req);
  const { text, progress_percent, condition, next_step } = req.body || {};

  if (!text) return res.status(400).json({ error: 'متن پیشرفت الزامی است' });

  const { data: task, error: fetchErr } = await supabase
    .from('project_tasks')
    .select('status')
    .eq('id', taskId)
    .single();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!task) return res.status(404).json({ error: 'وظیفه پیدا نشد' });

  if (task.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'ثبت پیشرفت فقط در وضعیت IN_PROGRESS مجاز است' });
  }

  const { data, error } = await supabase
    .from('task_progress_updates')
    .insert({
      project_task_id: taskId,
      user_id: me.id,
      text,
      progress_percent: progress_percent || 0,
      condition: condition || 'on_track',
      next_step: next_step || null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'update',
    entity_type: 'task_progress',
    entity_id: taskId,
    old_values: null,
    new_values: { text, progress_percent, condition }
  });

  return res.status(201).json(data);
}

// ─── گزارش مانع (blocker) ─────────────────────────────────
async function handleBlocker(taskId, req, res) {
  const me = requireAuth(req);
  const { title, description } = req.body || {};

  if (!title) return res.status(400).json({ error: 'عنوان مانع الزامی است' });

  const { data: task, error: fetchErr } = await supabase
    .from('project_tasks')
    .select('status')
    .eq('id', taskId)
    .single();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!task) return res.status(404).json({ error: 'وظیفه پیدا نشد' });

  if (task.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'گزارش مانع فقط در وضعیت IN_PROGRESS مجاز است' });
  }

  // ثبت مانع
  const { data: blocker, error: blockerErr } = await supabase
    .from('task_blockers')
    .insert({
      project_task_id: taskId,
      reported_by: me.id,
      title,
      description: description || '',
    })
    .select()
    .single();

  if (blockerErr) return res.status(500).json({ error: blockerErr.message });

  // تغییر وضعیت به BLOCKED (completed_at = null چون BLOCKED final نیست)
  const { error: statusErr } = await supabase
    .from('project_tasks')
    .update({ status: 'BLOCKED', updated_at: new Date().toISOString(), completed_at: null })
    .eq('id', taskId);

  if (statusErr) return res.status(500).json({ error: statusErr.message });

  await supabase.from('task_status_history').insert({
    project_task_id: taskId,
    status: 'BLOCKED',
    user_id: me.id,
  });

  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'status_change',
    entity_type: 'task',
    entity_id: taskId,
    old_values: { status: 'IN_PROGRESS' },
    new_values: { status: 'BLOCKED', blocker_title: title }
  });

  return res.status(201).json({ blocker, task_status: 'BLOCKED' });
}