/**
 * WhatsApp Broadcast — minimal dry-run endpoint
 * ===============================================
 * GET  /api/whatsapp_broadcast
 *      → safe empty campaign history: []
 * GET  /api/whatsapp_broadcast?id={id}
 *      → safe default object (no storage lookup; persistence not approved)
 * GET  /api/whatsapp_broadcast?preview=1&grades=...&statuses=...&segments=...&customer_ids=...
 *      → preview audience from crm_customers (consent + active filters applied)
 * POST /api/whatsapp_broadcast
 *      → dry-run only; no real WhatsApp send, no persistence
 *
 * Auth: requireAdmin (admin JWT compatible with admin-panel protected APIs).
 * Source-of-truth for audience fields: supabase/crm-production-baseline.sql (crm_customers).
 */

const { supabase, cors, requireAdmin } = require('./_lib');

function selectRecipientNumber(row) {
  // Prefer: whatsapp → mobile → phone
  if (row.whatsapp && String(row.whatsapp).trim() !== '') return String(row.whatsapp).trim();
  if (row.mobile && String(row.mobile).trim() !== '') return String(row.mobile).trim();
  if (row.phone && String(row.phone).trim() !== '') return String(row.phone).trim();
  return null;
}

function parseListParam(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method === 'OPTIONS') return; // cors already ended response

  // Auth gate — admin JWT only. Fail-closed; no public fallback.
  let me;
  try {
    me = requireAdmin(req);
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message || 'Unauthorized' });
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const id = url.searchParams.get('id');
    const isPreview = url.searchParams.get('preview') === '1';

    // ── GET detail by id (safe default, no storage) ──
    if (req.method === 'GET' && id) {
      return res.json({
        id,
        title: '',
        message: '',
        status: 'not_persisted',
        recipients: [],
        logs: [],
        dry_run: true,
      });
    }

    // ── GET list (safe empty history) ──
    if (req.method === 'GET' && !isPreview) {
      return res.json([]);
    }

    // ── GET preview (audience query from crm_customers) ──
    if (req.method === 'GET' && isPreview) {
      const grades = parseListParam(url.searchParams.get('grades'));
      const statuses = parseListParam(url.searchParams.get('statuses'));
      const segments = parseListParam(url.searchParams.get('segments'));
      const customerIds = parseListParam(url.searchParams.get('customer_ids'));

      let query = supabase
        .from('crm_customers')
        .select('id, name, whatsapp, mobile, phone, grade, customer_status, sales_segment')
        .is('deleted_at', null)
        .not('legal_consent_version', 'is', null)
        .not('legal_consent_at', 'is', null);

      if (grades.length > 0) query = query.in('grade', grades);
      if (statuses.length > 0) query = query.in('customer_status', statuses);
      if (segments.length > 0) query = query.in('sales_segment', segments);
      if (customerIds.length > 0) query = query.in('id', customerIds.map((x) => parseInt(x, 10) || x));

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const customers = (data || [])
        .map((row) => {
          const phone = selectRecipientNumber(row);
          if (!phone) return null; // only include rows with a usable recipient number
          return {
            id: row.id,
            name: row.name || '',
            phone,
            grade: row.grade || '',
            customer_status: row.customer_status || '',
            sales_segment: row.sales_segment || '',
          };
        })
        .filter(Boolean);

      return res.json({
        count: customers.length,
        customers,
        dry_run: true,
      });
    }

    // ── POST dry-run (no send, no persistence) ──
    if (req.method === 'POST') {
      let body = {};
      try {
        const raw = await new Promise((resolve) => {
          let b = '';
          req.on('data', (c) => (b += c));
          req.on('end', () => resolve(b));
        });
        body = raw ? JSON.parse(raw) : {};
      } catch (_) {
        body = {};
      }

      // Validate minimal payload shape (no send, no store)
      if (!body || typeof body !== 'object' || !body.message || String(body.message).trim() === '') {
        return res.status(400).json({ error: 'message is required' });
      }

      return res.json({
        success: true,
        message: 'Dry-run only. No WhatsApp messages were sent.',
        dry_run: true,
        sent: 0,
        created: false,
      });
    }

    // ── Method not allowed ──
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Internal Server Error' });
  }
};
