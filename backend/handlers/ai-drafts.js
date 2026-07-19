const { supabase, cors, requireAuth, requireAdmin } = require('./_lib');
const { writeAuditLog } = require('./_audit');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    requireAuth(req);

    const pathname = (req.url || '').split('?')[0];
    const parts = pathname.split('/').filter(Boolean); // e.g. ['api', 'ai-drafts', 'uuid', 'approve']
    const segments = parts.slice(2); // حذف 'api' و 'ai-drafts'

    // ─── /api/ai-drafts/:id/approve ───
    if (segments.length >= 2 && segments[0] && segments[1] === 'approve') {
      if (req.method === 'POST') {
        return await approveRejectDraft(segments[0], 'APPROVED', req, res);
      }
      return res.status(405).json({ error: 'متد یا مسیر مجاز نیست' });
    }

    // ─── /api/ai-drafts/:id/reject ───
    if (segments.length >= 2 && segments[0] && segments[1] === 'reject') {
      if (req.method === 'POST') {
        return await approveRejectDraft(segments[0], 'REJECTED', req, res);
      }
      return res.status(405).json({ error: 'متد یا مسیر مجاز نیست' });
    }

    // ─── /api/ai-drafts/:id ───
    if (segments.length === 1 && segments[0]) {
      const draftId = segments[0];

      if (req.method === 'GET') {
        return await getDraft(draftId, res);
      }
      if (req.method === 'PUT') {
        return await updateDraft(draftId, req, res);
      }
    }

    // ─── /api/ai-drafts ───
    if (req.method === 'GET') {
      return await listDrafts(req, res);
    }

    if (req.method === 'POST') {
      return await createDraft(req, res);
    }

    return res.status(405).json({ error: 'متد یا مسیر مجاز نیست' });

  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
};

// ─── لیست پیش‌نویس‌ها ─────────────────────────────────────
async function listDrafts(req, res) {
  let query = supabase.from('ai_drafts').select('*');

  if (req.query.entity_type) {
    const val = String(req.query.entity_type).replace(/^eq\./, '');
    query = query.eq('entity_type', val);
  }
  if (req.query.entity_id) {
    const val = String(req.query.entity_id).replace(/^eq\./, '');
    query = query.eq('entity_id', val);
  }
  if (req.query.approval_status) {
    const val = String(req.query.approval_status).replace(/^eq\./, '');
    query = query.eq('approval_status', val);
  }
  if (req.query.created_by) {
    const val = String(req.query.created_by).replace(/^eq\./, '');
    query = query.eq('created_by', val);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
}

// ─── جزئیات پیش‌نویس ──────────────────────────────────────
async function getDraft(draftId, res) {
  const { data, error } = await supabase
    .from('ai_drafts')
    .select('*')
    .eq('id', draftId)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'پیش‌نویس پیدا نشد' });
  return res.json(data);
}

// ─── ایجاد پیش‌نویس ──────────────────────────────────────
async function createDraft(req, res) {
  const me = requireAuth(req);
  const { entity_type, entity_id, draft_type, input_text, output_text } = req.body || {};

  if (!entity_type) return res.status(400).json({ error: 'entity_type الزامی است' });
  if (!draft_type) return res.status(400).json({ error: 'draft_type الزامی است' });

  const { data, error } = await supabase
    .from('ai_drafts')
    .insert({
      entity_type,
      entity_id: entity_id || null,
      draft_type,
      input_text: input_text || '',
      output_text: output_text || '',
      created_by: me.id,
      approval_status: 'PENDING',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'create',
    entity_type: 'ai_draft',
    entity_id: data.id,
    old_values: null,
    new_values: { entity_type, draft_type, entity_id }
  });

  return res.status(201).json(data);
}

// ─── ویرایش پیش‌نویس ──────────────────────────────────────
async function updateDraft(draftId, req, res) {
  const me = requireAuth(req);
  const { id, ...rest } = req.body || {};

  const allowed = ['input_text', 'output_text', 'draft_type'];
  const payload = {};
  for (const [k, v] of Object.entries(rest)) {
    if (allowed.includes(k)) payload[k] = v;
  }

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'هیچ فیلدی برای آپدیت ارسال نشده' });
  }

  const { data, error } = await supabase
    .from('ai_drafts')
    .update(payload)
    .eq('id', draftId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'پیش‌نویس پیدا نشد' });

  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'update',
    entity_type: 'ai_draft',
    entity_id: draftId,
    old_values: null,
    new_values: payload
  });

  return res.json(data);
}

// ─── تأیید یا رد پیش‌نویس ────────────────────────────────
async function approveRejectDraft(draftId, decision, req, res) {
  requireAdmin(req);
  const me = requireAuth(req);

  const { data: draft, error: fetchErr } = await supabase
    .from('ai_drafts')
    .select('*')
    .eq('id', draftId)
    .single();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!draft) return res.status(404).json({ error: 'پیش‌نویس پیدا نشد' });

  if (draft.approval_status !== 'PENDING') {
    return res.status(400).json({ error: `این پیش‌نویس قبلاً ${draft.approval_status} شده است` });
  }

  const { data, error } = await supabase
    .from('ai_drafts')
    .update({ approval_status: decision })
    .eq('id', draftId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: decision === 'APPROVED' ? 'approve' : 'update',
    entity_type: 'ai_draft',
    entity_id: draftId,
    old_values: { approval_status: 'PENDING' },
    new_values: { approval_status: decision }
  });

  return res.json(data);
}
