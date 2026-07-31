/**
 * WhatsApp Inbox — paginated list + manual customer link
 */
const { supabase, cors, requireAuthOrAdmin } = require('./_lib');

function parsePositiveInt(value, fallback, min, max) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

async function readBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString();
  return new Promise((resolve) => {
    let body = '';
    const ok = (v) => { resolve(v); };
    req.on('data', (c) => { body += String(c); });
    req.on('end', () => ok(body));
    req.on('error', () => ok(''));
    setTimeout(() => ok(body), 3000);
  });
}

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method === 'OPTIONS') return;

  let me;
  try {
    me = await requireAuthOrAdmin(req);
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message || 'Unauthorized' });
  }

  // ═══ PATCH: manual customer link ═══════════════════════════
  if (req.method === 'PATCH') {
    try {
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean);
      const msgId = parts.length >= 3 ? parts[parts.length - 1] : null;
      if (!msgId) return res.status(400).json({ error: 'msgId missing' });

      const raw = await readBody(req);
      let body = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch (_) { body = {}; }
      const cid = body.customer_id;
      if (!cid) return res.status(400).json({ error: 'customer_id required' });

      // 1. get sender_phone
      const { data: row, error: rErr } = await supabase
        .from('whatsapp_inbox').select('sender_phone').eq('id', msgId).maybeSingle();
      if (rErr) return res.status(500).json({ error: 'inbox:' + rErr.message });
      if (!row) return res.status(404).json({ error: 'msg not found' });
      const phone = row.sender_phone;
      if (!phone) return res.status(400).json({ error: 'no phone' });

      // 2. verify customer
      const { data: cust, error: cErr } = await supabase
        .from('crm_customers').select('id').eq('id', cid).maybeSingle();
      if (cErr) return res.status(500).json({ error: 'cust:' + cErr.message });
      if (!cust) return res.status(404).json({ error: 'customer not found' });

      // 3. find/create conversation
      const { data: conv, error: vErr } = await supabase
        .from('conversations').select('id')
        .eq('channel', 'whatsapp').eq('external_chat_id', phone).maybeSingle();
      if (vErr) return res.status(500).json({ error: 'conv:' + vErr.message });

      let convId;
      if (!conv) {
        const { data: nc, error: nErr } = await supabase
          .from('conversations').insert({
            channel: 'whatsapp', external_chat_id: phone,
            status: 'open', last_message_at: new Date().toISOString(),
          }).select('id').single();
        if (nErr) return res.status(500).json({ error: 'convCreate:' + nErr.message });
        convId = nc.id;
      } else {
        convId = conv.id;
      }

      // 4. upsert link
      const { error: lErr } = await supabase
        .from('conversation_customer_links')
        .upsert({ conversation_id: convId, crm_customer_id: cid, link_source: 'auto_webhook' },
          { onConflict: 'conversation_id,crm_customer_id' });
      if (lErr) return res.status(500).json({ error: 'link:' + lErr.message });

      return res.json({ ok: true, conversation_id: convId, crm_customer_id: cid });

    } catch (e) {
      return res.status(500).json({ error: e.message || 'PATCH error' });
    }
  }

  // ═══ GET: paginated list + customer enrichment ════════════
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, 'http://localhost');
      const limit = parsePositiveInt(url.searchParams.get('limit'), 30, 1, 100);
      const offset = parsePositiveInt(url.searchParams.get('offset'), 0, 0, 1000000);
      const { data, error, count } = await supabase
        .from('whatsapp_inbox')
        .select('id,sender_phone,message_body,created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;

      // ── Enrich with customer data (batch by phone) ──────
      const rows = data || [];
      const phones = [...new Set(rows.map(r => r.sender_phone).filter(Boolean))];
      const customerMap = {};

      if (phones.length > 0) {
        const { data: customers } = await supabase
          .from('crm_customers')
          .select('id, name, phone, mobile, whatsapp')
          .or(phones.map(p => `phone.eq.${p},mobile.eq.${p},whatsapp.eq.${p}`).join(','));

        for (const c of (customers || [])) {
          const matchPhones = [c.phone, c.mobile, c.whatsapp].filter(Boolean);
          for (const ph of matchPhones) {
            if (!customerMap[ph]) customerMap[ph] = { customer_id: c.id, customer_name: c.name };
          }
        }
      }

      const enriched = rows.map(r => ({
        id: r.id,
        sender_phone: r.sender_phone,
        message_body: r.message_body,
        created_at: r.created_at,
        customer_id: customerMap[r.sender_phone]?.customer_id || null,
        customer_name: customerMap[r.sender_phone]?.customer_name || null,
      }));

      return res.json({ data: enriched, count: count || 0 });
    } catch (e) {
      return res.status(500).json({ error: e.message || 'GET error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
