const { supabase, cors, requireAuth, requireAdmin } = require('./_lib');

// Customer support ticket submission from wholesale portal.
// Ghost-route fix: frontend (wholesale-portal/index.html:2342) POSTs here,
// but no handler existed. The customer sends an authenticated Bearer token
// (same apiCall/API_BASE path as every other wholesale-portal endpoint).
//
// DB_STORAGE: no valid `support_tickets` / `support_requests` /
// `customer_support_tickets` table is defined in the database source-of-truth
// (supabase/*.sql — see DB_STORAGE_DECISION). Per task rules, no migration is
// executed and data is NOT written to a guessed/inferred table. Until a
// persistence table is defined and migrated, valid POSTs return a controlled
// 503 whose message matches the wholesale-portal error handler
// ("سامانه پشتیبانی در حال راه‌اندازی است").

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method === 'OPTIONS') return; // cors already ended response

  // ── GET: admin list of support tickets (direct array, like warranty-returns) ──
  if (req.method === 'GET') {
    try {
      requireAdmin(req); // admin/super_admin only (fail-closed via _lib)

      let query = supabase.from('support_tickets').select('*');

      // order=created_at.desc (or .asc) per admin-panel contract; default desc
      if (req.query.order) {
        const parts = String(req.query.order).split('.');
        if (parts.length === 2) {
          query = query.order(parts[0], { ascending: parts[1] === 'asc' });
        }
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (req.query.limit) {
        query = query.limit(Number(req.query.limit));
      }

      const { data, error } = await query;
      if (error) {
        if (error.message && error.message.includes('does not exist')) {
          return res.status(404).json({ error: 'support_tickets table not found' });
        }
        return res.status(500).json({ error: error.message });
      }
      // Frontend (admin-panel) expects a direct array.
      return res.json(data || []);
    } catch (e) {
      return res.status(e.status || 403).json({ error: e.message });
    }
  }

  // ── PATCH: admin update of support ticket (status / admin_notes) ──
  if (req.method === 'PATCH') {
    try {
      requireAdmin(req); // admin/super_admin only (fail-closed via _lib)

      // id from query, expected form id=eq.<numeric_id> (admin-panel contract)
      const match = req.query.id && String(req.query.id).match(/^eq\.(\d+)$/);
      if (!match) {
        return res.status(400).json({ error: 'id=eq.X در query الزامی است' });
      }

      const body = req.body || {};
      const update = { updated_at: new Date().toISOString() };
      let hasAllowed = false;

      // status: non-empty string only (DB CHECK enforces allowed enum)
      if (body.status !== undefined) {
        if (typeof body.status !== 'string' || !body.status.trim()) {
          return res.status(400).json({ error: 'status باید رشته غیرخالی باشد' });
        }
        update.status = body.status.trim();
        hasAllowed = true;
      }

      // admin_notes: admin reply/note (nullable)
      if (body.admin_notes !== undefined) {
        update.admin_notes = typeof body.admin_notes === 'string' ? body.admin_notes : String(body.admin_notes);
        hasAllowed = true;
      }

      // Reject any field other than status/admin_notes (defense-in-depth whitelist)
      for (const key of Object.keys(body)) {
        if (key !== 'status' && key !== 'admin_notes') {
          return res.status(400).json({ error: `فیلد نامعتبر: ${key}` });
        }
      }

      // No allowed field supplied -> nothing to update
      if (!hasAllowed) {
        return res.status(400).json({ error: 'حداقل یکی از status یا admin_notes باید ارسال شود' });
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .update(update)
        .eq('id', match[1])
        .select()
        .single();

      if (error) {
        if (error.message && error.message.includes('does not exist')) {
          return res.status(404).json({ error: 'support_tickets table not found' });
        }
        return res.status(500).json({ error: error.message });
      }
      if (!data) {
        return res.status(404).json({ error: 'رکورد پیدا نشد' });
      }
      // Frontend (admin-panel) expects the updated record object.
      return res.json(data);
    } catch (e) {
      return res.status(e.status || 403).json({ error: e.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Auth: customer Bearer token (fail-closed) ──
  let user;
  try {
    user = requireAuth(req);
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message || 'لطفاً وارد شوید' });
  }

  try {
    const { subject, category, order_id, message } = req.body || {};

    // ── Validation ──
    if (!subject || !String(subject).trim() || !message || !String(message).trim()) {
      return res.status(400).json({ error: 'subject and message are required' });
    }

    const safeCategory = category && String(category).trim() ? String(category).trim() : 'order_tracking';
    const safeOrderId = order_id != null && order_id !== '' ? Number(order_id) : null;
    const safeMessage = String(message).trim();
    const safeSubject = String(subject).trim();
    const customerId = user && user.id != null ? user.id : null;

    // ── Persistence ──
    // Insert into public.support_tickets (migration applied on staging per owner approval).
    // Mapping: user_id<-customerId, subject<-safeSubject, description<-safeMessage, status='open'.
    // category/order_id have no confirmed column in the SoT schema, so they are NOT sent.
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: customerId,
        subject: safeSubject,
        description: safeMessage,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      if (error.message && error.message.includes('does not exist')) {
        return res.status(404).json({ error: 'support_tickets table not found' });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({
      ok: true,
      ticket_id: data.id,
      ticket: data,
      message: 'درخواست شما ثبت شد',
    });
  } catch (e) {
    return res.status(500).json({ error: 'Internal server error', details: e.message });
  }
};
