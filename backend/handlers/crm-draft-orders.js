const { supabase, cors, requireAuth } = require('./_lib');

module.exports = async (req, res) => {
  if (cors(req, res)) return;

  try {
    const user = requireAuth(req);

    // Only authenticated customers can access their own draft
    if (user.type !== 'customer') {
      return res.status(403).json({ error: 'فقط مشتریان می‌توانند به سبد خرید دسترسی داشته باشند' });
    }

    const customerId = user.id;

    // GET: Load current draft
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('crm_draft_orders')
        .select('*')
        .eq('customer_id', customerId)
        .eq('status', 'draft')
        .is('deleted_at', null)
        .maybeSingle();

      if (error) return res.status(500).json({ error: error.message });

      if (!data) {
        return res.json({ draft: null });
      }

      return res.json({ draft: data });
    }

    // POST: Save/update draft items
    if (req.method === 'POST') {
      const path = req.path || req.originalUrl || '';
      const isSubmit = path.endsWith('/submit');

      if (isSubmit) {
        // Submit draft as order
        const { data: draft, error: draftErr } = await supabase
          .from('crm_draft_orders')
          .select('*')
          .eq('customer_id', customerId)
          .eq('status', 'draft')
          .is('deleted_at', null)
          .maybeSingle();

        if (draftErr) return res.status(500).json({ error: draftErr.message });
        if (!draft) return res.status(400).json({ error: 'سبد خریدی برای ثبت وجود ندارد' });
        if (!draft.items || draft.items.length === 0) {
          return res.status(400).json({ error: 'سبد خرید خالی است' });
        }

        // Create order from draft
        const { data: order, error: orderErr } = await supabase
          .from('crm_orders')
          .insert({
            customer_id: customerId,
            order_type: 'stock',
            sales_channel: draft.sales_channel || 'wholesale',
            source_app: draft.source_app || 'wholesale-portal',
            order_status: 'registered',
            total_amount: draft.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0),
            note: draft.note || null,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (orderErr) return res.status(500).json({ error: orderErr.message });

        // Insert order items
        const orderItems = draft.items.map(item => ({
          order_id: order.id,
          product_id: Number(item.product_id),
          item_name: item.item_name,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          total: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
          unit: item.unit || '',
        }));

        const { error: itemsErr } = await supabase
          .from('crm_order_items')
          .insert(orderItems);

        if (itemsErr) return res.status(500).json({ error: itemsErr.message });

        // Mark draft as converted
        await supabase
          .from('crm_draft_orders')
          .update({ status: 'converted', deleted_at: new Date().toISOString() })
          .eq('id', draft.id);

        return res.json({ ok: true, order_id: order.id });
      }

      // Regular POST: save/update draft items
      const { items } = req.body || {};
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'فیلد items آرایه الزامی است' });
      }

      // Upsert draft
      const { data: existingDraft } = await supabase
        .from('crm_draft_orders')
        .select('id')
        .eq('customer_id', customerId)
        .eq('status', 'draft')
        .is('deleted_at', null)
        .maybeSingle();

      let draftId;
      if (existingDraft) {
        const { data, error } = await supabase
          .from('crm_draft_orders')
          .update({ items, updated_at: new Date().toISOString() })
          .eq('id', existingDraft.id)
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        draftId = data.id;
      } else {
        const { data, error } = await supabase
          .from('crm_draft_orders')
          .insert({
            customer_id: customerId,
            status: 'draft',
            items,
            sales_channel: 'wholesale',
            source_app: 'wholesale-portal',
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        draftId = data.id;
      }

      // Return the updated draft
      const { data: draft, error: fetchErr } = await supabase
        .from('crm_draft_orders')
        .select('*')
        .eq('id', draftId)
        .single();

      if (fetchErr) return res.status(500).json({ error: fetchErr.message });

      return res.json({ draft });
    }

    // DELETE: Clear draft
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('crm_draft_orders')
        .update({ status: 'abandoned', deleted_at: new Date().toISOString() })
        .eq('customer_id', customerId)
        .eq('status', 'draft')
        .is('deleted_at', null);

      if (error) return res.status(500).json({ error: error.message });

      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'متد مجاز نیست' });
  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
};