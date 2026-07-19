/**
 * WhatsApp Inbox — read-only admin endpoint
 * =========================================
 * GET /api/whatsapp-inbox?limit=30&offset=0
 *   → authenticated paginated list from whatsapp_inbox
 *
 * Auth: requireAdmin (admin JWT compatible with admin-panel protected APIs).
 *
 * Notes:
 * - Read-only.
 * - No WhatsApp send.
 * - No persistence/mutation.
 * - raw_payload is intentionally excluded from the response.
 */

const { supabase, cors, requireAdmin } = require('./_lib');

function parsePositiveInt(value, fallback, min, max) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method === 'OPTIONS') return;

  let me;
  try {
    me = requireAdmin(req);
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message || 'Unauthorized' });
  }

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const url = new URL(req.url, 'http://localhost');
    const limit = parsePositiveInt(url.searchParams.get('limit'), 30, 1, 100);
    const offset = parsePositiveInt(url.searchParams.get('offset'), 0, 0, 1000000);
    const from = offset;
    const to = offset + limit - 1;

    const { data, error, count } = await supabase
      .from('whatsapp_inbox')
      .select('id,sender_phone,message_body,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    return res.json({
      data: Array.isArray(data) ? data : [],
      count: typeof count === 'number' ? count : 0,
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Internal server error' });
  }
};
