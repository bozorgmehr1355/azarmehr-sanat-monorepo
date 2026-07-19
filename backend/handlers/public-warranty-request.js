const { supabase, cors } = require('./_lib');

// Public warranty/return request from wholesale portal.
// Ghost-route fix: frontend (wholesale-portal/index.html:2006) POSTs here,
// but no handler existed. Inserts into warranty_returns with source='portal'.
// No auth (public endpoint). postal_code is intentionally NOT inserted because
// it is absent from the warranty_returns schema (supabase/schema.sql:105-117),
// avoiding a schema/migration change.

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const {
      customer_name,
      customer_phone,
      customer_address,
      product_code,
      reason,
    } = req.body || {};

    // ── Validation ──────────────────────────────────────────────
    if (!customer_phone || !String(customer_phone).trim()) {
      return res.status(400).json({ error: 'شماره تماس مشتری الزامی است' });
    }
    if (!customer_name || !String(customer_name).trim()) {
      return res.status(400).json({ error: 'نام و نام خانوادگی الزامی است' });
    }

    // ── Build record (schema-aligned, no migration) ────────────
    const payload = {
      customer_name: String(customer_name).trim(),
      customer_phone: String(customer_phone).trim(),
      customer_address: customer_address ? String(customer_address).trim() : '',
      product_code: product_code ? String(product_code).trim() : '',
      reason: reason ? String(reason).trim() : '',
      status: 'pending',
      source: 'portal',
    };

    const { data, error } = await supabase
      .from('warranty_returns')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'خطا در ثبت درخواست گارانتی: ' + error.message });
    }

    return res.status(201).json({
      success: true,
      id: data && data.id,
      message: 'درخواست گارانتی شما با موفقیت ثبت شد و در انتظار بررسی است.',
    });

  } catch (e) {
    return res.status(500).json({ error: 'Internal server error', details: e.message });
  }
};
