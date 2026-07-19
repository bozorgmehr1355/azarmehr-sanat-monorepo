const { supabase, cors, requireAuth, requireAdmin } = require('./_lib');

// Admin warranty-returns list + status update.
// Ghost-route fix: admin-panel/index.html calls GET /api/warranty-returns (line 4478)
// and PATCH /api/warranty-returns?id=eq.X (lines 4587, 4904), but no handler existed.
// Table `warranty_returns` is defined in supabase/schema.sql:105-117 (no migration needed).
//
// Frontend contract:
//   GET  ?order=created_at.desc  -> expects a DIRECT array  (Array.isArray(r)?r:[])
//   PATCH id=eq.<id> + body { status, admin_note, tracking_code }
//
// Data-contract notes (pre-existing, NOT changed here — no migration):
//   - schema column is `admin_notes` (plural); frontend sends `admin_note` -> mapped below.
//   - frontend `status` values include reviewing/approved/done, but schema CHECK allows
//     pending/processing/completed/rejected. We accept a non-empty string and let the DB
//     CHECK enforce the allowed set (graceful error if it rejects); reconciling the enum
//     is a separate data-contract task.
//   - `tracking_code` is sent by the frontend but has NO column in the schema; it is
//     dropped (never forwarded to the DB) to avoid writing an unknown field.

const ALLOWED_UPDATE_FIELDS = new Set(['status', 'admin_notes']);

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET list requires auth (same pattern as crm-guarantee-claims.js)
    if (req.method === 'GET') {
      requireAuth(req);

      let query = supabase.from('warranty_returns').select('*');

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
          return res.status(404).json({ ok: false, error: 'warranty_returns table not found' });
        }
        return res.status(500).json({ ok: false, error: error.message });
      }
      // Frontend expects a direct array.
      return res.json(data || []);
    }

    // PATCH status / admin note (admin only)
    if (req.method === 'PATCH') {
      requireAdmin(req);

      const match = req.query.id && String(req.query.id).match(/^eq\.(\d+)$/);
      if (!match) {
        return res.status(400).json({ ok: false, error: 'id=eq.X در query الزامی است' });
      }

      const body = req.body || {};
      const update = { updated_at: new Date().toISOString() };

      // status: non-empty string only (DB CHECK enforces allowed enum)
      if (body.status !== undefined) {
        if (typeof body.status !== 'string' || !body.status.trim()) {
          return res.status(400).json({ ok: false, error: 'status باید رشته غیرخالی باشد' });
        }
        update.status = body.status.trim();
      }

      // admin_note (singular, from frontend) -> admin_notes (schema column)
      if (body.admin_note !== undefined) {
        update.admin_notes = typeof body.admin_note === 'string' ? body.admin_note : String(body.admin_note);
      }

      // NOTE: body.tracking_code is intentionally ignored — no such column in schema.

      // Reject any other/unexpected field (defense-in-depth whitelist)
      for (const key of Object.keys(body)) {
        if (key !== 'status' && key !== 'admin_note' && key !== 'tracking_code') {
          return res.status(400).json({ ok: false, error: `فیلد نامعتبر: ${key}` });
        }
      }

      const { data, error } = await supabase
        .from('warranty_returns')
        .update(update)
        .eq('id', match[1])
        .select()
        .single();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
      if (!data) {
        return res.status(404).json({ ok: false, error: 'رکورد پیدا نشد' });
      }
      return res.json(data);
    }

    // Any other method (POST, PUT, DELETE, ...) -> 405 (not a ghost route)
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  } catch (e) {
    return res.status(e.status || 403).json({ ok: false, error: e.message });
  }
};
