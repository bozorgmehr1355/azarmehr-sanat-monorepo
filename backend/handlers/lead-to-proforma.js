const { supabase, cors, requireAdmin } = require('./_lib');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'متد مجاز نیست' });
  }

  try {
    requireAdmin(req);

    const leadId = req.body?.lead_id ?? req.body?.id;
    if (!leadId) {
      return res.status(400).json({ error: 'lead_id الزامی است' });
    }

    // ── Fetch lead ────────────────────────────────────────────────
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadErr || !lead) {
      return res.status(404).json({ error: 'لید پیدا نشد' });
    }

    // ── Find or create customer ───────────────────────────────────
    let customerId;

    const { data: existingCustomer } = await supabase
      .from('crm_customers')
      .select('id')
      .eq('phone', lead.mobile)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: createErr } = await supabase
        .from('crm_customers')
        .insert({
          name: lead.name || `مشتری از لید ${lead.mobile}`,
          phone: lead.mobile,
          type: 'B2B',
          source_channel: 'phone',
        })
        .select()
        .single();

      if (createErr || !newCustomer) {
        return res.status(500).json({ error: createErr?.message || 'خطا در ایجاد مشتری' });
      }
      customerId = newCustomer.id;
    }

    // ── Create order with issued proforma ──────────────────────────
    const now = new Date().toISOString();

    const { data: order, error: orderErr } = await supabase
      .from('crm_orders')
      .insert({
        customer_id: customerId,
        order_status: 'registered',
        proforma_status: 'issued',
        proforma_issued_at: now,
        source_app: 'admin-panel',
        sales_channel: 'wholesale',
      })
      .select()
      .single();

    if (orderErr || !order) {
      return res.status(500).json({ error: orderErr?.message || 'خطا در ایجاد سفارش' });
    }

    // ── Update lead status ─────────────────────────────────────────
    await supabase
      .from('leads')
      .update({ status: 'converted' })
      .eq('id', leadId);

    return res.status(200).json({
      ok: true,
      order_id: order.id,
      message: `سفارش #${order.id} با پیش‌فاکتور صادر شد`,
    });

  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'خطای سرور' });
  }
};
