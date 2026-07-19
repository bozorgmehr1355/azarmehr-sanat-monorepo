const { supabase, cors, requireAuth, requireAdmin } = require('./_lib');
const { writeAuditLog } = require('./_audit');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    requireAuth(req);

    const pathname = (req.url || '').split('?')[0];
    const parts = pathname.split('/').filter(Boolean); // e.g. ['api', 'meetings', 'uuid', 'action-items']
    const segments = parts.slice(2); // حذف 'api' و 'meetings'

    // ─── مسیر فرعی: /api/meetings/:id/... ───
    if (segments.length >= 1 && segments[0]) {
      const meetingId = segments[0];
      const sub = segments[1]; // e.g. 'action-items', 'decisions'

      // GET /api/meetings/:id
      if (req.method === 'GET' && !sub) {
        return await getMeeting(meetingId, res);
      }

      // PUT /api/meetings/:id
      if (req.method === 'PUT' && !sub) {
        return await updateMeeting(meetingId, req, res);
      }

      // POST /api/meetings/:id/action-items
      if (req.method === 'POST' && sub === 'action-items') {
        return await addActionItem(meetingId, req, res);
      }

      // GET /api/meetings/:id/action-items
      if (req.method === 'GET' && sub === 'action-items') {
        return await listActionItems(meetingId, res);
      }

      return res.status(405).json({ error: 'متد یا مسیر مجاز نیست' });
    }

    // ─── مسیر اصلی ───
    if (req.method === 'GET') {
      return await listMeetings(req, res);
    }

    if (req.method === 'POST') {
      return await createMeeting(req, res);
    }

    return res.status(405).json({ error: 'متد مجاز نیست' });

  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
};

// ─── لیست جلسات ───────────────────────────────────────────
async function listMeetings(req, res) {
  let query = supabase.from('meetings').select('*');

  if (req.query.project_id) {
    const val = String(req.query.project_id).replace(/^eq\./, '');
    query = query.eq('project_id', val);
  }
  if (req.query.organizer_id) {
    const val = String(req.query.organizer_id).replace(/^eq\./, '');
    query = query.eq('organizer_id', val);
  }

  query = query.order('meeting_date', { ascending: false });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
}

// ─── جزئیات جلسه ──────────────────────────────────────────
async function getMeeting(meetingId, res) {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'جلسه پیدا نشد' });
  return res.json(data);
}

// ─── ایجاد جلسه ──────────────────────────────────────────
async function createMeeting(req, res) {
  requireAdmin(req);
  const me = requireAuth(req);
  const { title, project_id, meeting_date, transcript_text, summary_text, decisions_text } = req.body || {};

  if (!title) return res.status(400).json({ error: 'عنوان جلسه الزامی است' });

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      title,
      project_id: project_id || null,
      organizer_id: me.id,
      meeting_date: meeting_date || new Date().toISOString(),
      transcript_text: transcript_text || '',
      summary_text: summary_text || '',
      decisions_text: decisions_text || '',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'create',
    entity_type: 'meeting',
    entity_id: data.id,
    old_values: null,
    new_values: { title, project_id }
  });

  return res.status(201).json(data);
}

// ─── ویرایش جلسه ──────────────────────────────────────────
async function updateMeeting(meetingId, req, res) {
  requireAdmin(req);
  const me = requireAuth(req);
  const { id, ...rest } = req.body || {};

  const allowed = ['title', 'project_id', 'meeting_date', 'transcript_text', 'summary_text', 'decisions_text'];
  const payload = {};
  for (const [k, v] of Object.entries(rest)) {
    if (allowed.includes(k)) payload[k] = v;
  }

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'هیچ فیلدی برای آپدیت ارسال نشده' });
  }

  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('meetings')
    .update(payload)
    .eq('id', meetingId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'جلسه پیدا نشد' });

  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'update',
    entity_type: 'meeting',
    entity_id: meetingId,
    old_values: null,
    new_values: payload
  });

  return res.json(data);
}

// ─── افزودن آیتم اقدام به جلسه ───────────────────────────
async function addActionItem(meetingId, req, res) {
  const me = requireAuth(req);
  const { suggested_task_title, suggested_task_description, assignee_id, due_date } = req.body || {};

  if (!suggested_task_title) {
    return res.status(400).json({ error: 'عنوان پیشنهادی الزامی است' });
  }

  // بررسی وجود جلسه
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id')
    .eq('id', meetingId)
    .single();

  if (!meeting) return res.status(404).json({ error: 'جلسه پیدا نشد' });

  const { data, error } = await supabase
    .from('meeting_action_items')
    .insert({
      meeting_id: meetingId,
      suggested_task_title,
      suggested_task_description: suggested_task_description || '',
      assignee_id: assignee_id || null,
      due_date: due_date || null,
      status: 'DRAFT',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'create',
    entity_type: 'meeting_action_item',
    entity_id: data.id,
    old_values: null,
    new_values: { meeting_id: meetingId, suggested_task_title, assignee_id }
  });

  return res.status(201).json(data);
}

// ─── لیست آیتم‌های اقدام یک جلسه ──────────────────────────
async function listActionItems(meetingId, res) {
  const { data, error } = await supabase
    .from('meeting_action_items')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
}
