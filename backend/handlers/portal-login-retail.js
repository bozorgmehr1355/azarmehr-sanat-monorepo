const { supabase, jwt, JWT_SECRET, cors } = require('./_lib');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { name, phone } = req.body || {};
    if (!name || !phone) {
      return res.status(400).json({ error: 'نام و شماره تماس الزامی است' });
    }
    const trimmedPhone = phone.trim();
    const trimmedName = name.trim();

    // ── Look up existing customer by phone ───────────────────────────
    const { data: existing, error: lookupErr } = await supabase
      .from('crm_customers')
      .select('*')
      .eq('phone', trimmedPhone)
      .maybeSingle();

    if (lookupErr) {
      return res.status(500).json({ error: 'خطا در بررسی مشتری' });
    }

    let customer;
    if (existing) {
      // Update name if changed
      if (existing.name !== trimmedName) {
        await supabase
          .from('crm_customers')
          .update({ name: trimmedName, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
      customer = { ...existing, name: trimmedName };
    } else {
      // ── Create new retail customer ─────────────────────────────
      const { data: newCust, error: createErr } = await supabase
        .from('crm_customers')
        .insert({
          name: trimmedName,
          phone: trimmedPhone,
          customer_type: 'retail',
          customer_kind: 'B2C',
          type: 'B2C',
          sales_segment: 'retail',
          source_channel: 'wholesale-portal',
          grade: 'standard',
          status: 'active',
          portal_active: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createErr) {
        console.error('[portal-login-retail] create customer failed:', createErr.message);
        return res.status(500).json({ error: 'خطا در ایجاد حساب' });
      }
      customer = newCust;
    }

    // ── Issue JWT ──────────────────────────────────────────────────
    const token = jwt.sign(
      { id: customer.id, phone: trimmedPhone, type: 'customer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: customer.id,
        name: trimmedName,
        phone: trimmedPhone,
        type: 'customer',
      },
    });
  } catch (e) {
    console.error('[portal-login-retail] unexpected error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
