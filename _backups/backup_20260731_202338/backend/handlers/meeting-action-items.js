const { supabase, cors, requireAuth, requireAdmin } = require('./_lib');
const { writeAuditLog } = require('./_audit');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    requireAuth(req);

    const pathname = (req.url || '').split('?')[0];
    const parts = pathname.split('/').filter(Boolean); // e.g. ['api', 'meeting-action-items', 'uuid', 'convert-to-task']
    const segments = parts.slice(2); // حذف 'api' و 'meeting-action-items'

    // ─── /api/meeting-action-items/:id/convert-to-task ───
    if (segments.length >= 2 && segments[0] && segments[1] === 'convert-to-task') {
      const itemId = segments[0];

      if (req.method === 'POST') {
        return await convertToTask(itemId, req, res);
      }

      return res.status(405).json({ error: 'متد مجاز نیست' });
    }

    // ─── /api/meeting-action-items/:id (PUT — update status) ───
    if (segments.length === 1 && segments[0]) {
      const itemId = segments[0];

      if (req.method === 'PUT') {
        return await updateActionItem(itemId, req, res);
      }
    }

    return res.status(405).json({ error: 'مسیر مجاز نیست' });

  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
};

// ─── تبدیل آیتم اقدام به وظیفه رسمی ──────────────────────
async function convertToTask(itemId, req, res) {
  requireAdmin(req);
  const me = requireAuth(req);

  // گرفتن آیتم اقدام
  const { data: item, error: fetchErr } = await supabase
    .from('meeting_action_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!item) return res.status(404).json({ error: 'آیتم اقدام پیدا نشد' });

  if (item.status === 'CONVERTED') {
    return res.status(400).json({ error: 'این آیتم قبلاً تبدیل شده است' });
  }

  // پیدا کردن پروژه مربوطه از جلسه
  let projectId = null;
  if (item.meeting_id) {
    const { data: meeting } = await supabase
      .from('meetings')
      .select('project_id')
      .eq('id', item.meeting_id)
      .single();
    projectId = meeting ? meeting.project_id : null;
  }

  if (!projectId) {
    return res.status(400).json({ error: 'جلسه مربوطه پروژه‌ای ندارد — ابتدا project_id جلسه را تنظیم کنید' });
  }

  // ایجاد وظیفه رسمی
  const { data: task, error: taskErr } = await supabase
    .from('project_tasks')
    .insert({
      project_id: projectId,
      title: item.suggested_task_title,
      description: item.suggested_task_description || '',
      assigned_to: item.assignee_id || null,
      creator_id: me.id,
      due_date: item.due_date || null,
      priority: 'medium',
      status: item.assignee_id ? 'ASSIGNED' : 'pending',
    })
    .select()
    .single();

  if (taskErr) return res.status(500).json({ error: taskErr.message });

  // آپدیت وضعیت آیتم اقدام
  await supabase
    .from('meeting_action_items')
    .update({ status: 'CONVERTED' })
    .eq('id', itemId);

  // audit
  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'create',
    entity_type: 'task',
    entity_id: task.id,
    old_values: null,
    new_values: {
      title: item.suggested_task_title,
      source: 'meeting_action_item',
      meeting_id: item.meeting_id,
      action_item_id: itemId,
    }
  });

  return res.status(201).json({
    task,
    source_action_item: { id: itemId, status: 'CONVERTED' }
  });
}

// ─── ویرایش آیتم اقدام ───────────────────────────────────
async function updateActionItem(itemId, req, res) {
  requireAdmin(req);
  const me = requireAuth(req);
  const { id, ...rest } = req.body || {};

  const allowed = ['suggested_task_title', 'suggested_task_description', 'assignee_id', 'due_date', 'status'];
  const payload = {};
  for (const [k, v] of Object.entries(rest)) {
    if (allowed.includes(k)) payload[k] = v;
  }

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'هیچ فیلدی برای آپدیت ارسال نشده' });
  }

  const { data, error } = await supabase
    .from('meeting_action_items')
    .update(payload)
    .eq('id', itemId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'آیتم اقدام پیدا نشد' });

  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'update',
    entity_type: 'meeting_action_item',
    entity_id: itemId,
    old_values: null,
    new_values: payload
  });

  return res.json(data);
}
