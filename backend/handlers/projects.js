const { supabase, cors, requireAuth, requireAdmin, requireSuperAdmin } = require('./_lib');
const { writeAuditLog } = require('./_audit');
const { createProjectCore } = require('../services/projectControl/createProjectCore');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    requireAuth(req);

    // ─── GET: لیست پروژه‌ها ────────────────────────────────────────
    if (req.method === 'GET') {
      let query = supabase
        .from('project_control_projects')
        .select('*');

      // پشتیبانی از id=eq.X (عدد یا UUID)
      if (req.query.id) {
        const val = req.query.id.replace(/^eq\./, '');
        if (val) query = query.eq('id', val);
      }

      // فیلتر بر اساس status
      if (req.query.status) {
        const val = String(req.query.status).replace(/^eq\./, '');
        query = query.eq('status', val);
      }

      // فیلتر بر اساس order_id
      if (req.query.order_id) {
        const val = String(req.query.order_id).replace(/^eq\./, '');
        query = query.eq('order_id', val);
      }

      // فیلتر بر اساس code
      if (req.query.code) {
        const val = String(req.query.code).replace(/^eq\./, '');
        query = query.eq('code', val);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || []);
    }

    // ─── POST: ایجاد پروژه (دستی توسط ادمین یا تبدیل سفارش) ──────
    if (req.method === 'POST') {
      requireAdmin(req);
      const me = requireAuth(req);
      const {
        code,
        title,
        description,
        client,
        manager_id,
        planned_start_date,
        planned_end_date,
        budget,
        value,
        priority,
        risk_level,
        order_id,
        wbs_items,
        tasks,
      } = req.body || {};

      if (!title) return res.status(400).json({ error: 'عنوان پروژه الزامی است' });

      // تولید code اگر ارائه نشده باشد (project_control_projects.code NOT NULL)
      const finalCode = code || `PRJ-${Date.now()}`;

      // استفاده از سرویس مشترک ایجاد پروژه
      const result = await createProjectCore({
        code: finalCode,
        title,
        description: description || '',
        client: client || '',
        manager_id: manager_id || me.id,
        planned_start_date: planned_start_date || null,
        planned_end_date: planned_end_date || null,
        budget: budget || 0,
        value: value || 0,
        priority: priority || 'normal',
        risk_level: risk_level || 'low',
        order_id: order_id || null,
        created_by: me.id,
        wbsItems: wbs_items || [],
        tasks: tasks || [],
      });

      if (result.error) {
        const status = result.error === 'DUPLICATE_ORDER_ID' ? 409 : 500;
        return res.status(status).json({ error: result.message });
      }

      // اگر order_id دارد، مدیر سفارش را به عنوان عضو اضافه کن
      if (order_id && manager_id) {
        try {
          await supabase
            .from('project_control_project_members')
            .insert({ project_control_project_id: result.project.id, user_id: manager_id, role: 'manager' });
        } catch (_) {} // ignore duplicate
      }

      // ثبت audit log
      await writeAuditLog(supabase, {
        actor_id: me.id,
        action: 'create',
        entity_type: 'project_control_project',
        entity_id: result.project.id,
        old_values: null,
        new_values: {
          code,
          title,
          description,
          client,
          manager_id: result.project.manager_id,
          order_id,
          priority: result.project.priority,
          risk_level: result.project.risk_level,
        },
      });

      return res.status(201).json(result);
    }

    // ─── PUT: ویرایش پروژه ─────────────────────────────────────────
    if (req.method === 'PUT') {
      requireAdmin(req);
      const me = requireAuth(req);
      const { id, ...rest } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id الزامی است' });

      const allowed = [
        'code', 'title', 'description', 'client', 'manager_id',
        'planned_start_date', 'planned_end_date', 'actual_start_date',
        'actual_end_date', 'budget', 'value', 'priority', 'risk_level',
        'status', 'progress_planned', 'progress_actual', 'notes',
      ];
      const payload = {};
      for (const [k, v] of Object.entries(rest)) {
        if (allowed.includes(k)) payload[k] = v;
      }

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: 'هیچ فیلدی برای آپدیت ارسال نشده' });
      }

      const { data, error } = await supabase
        .from('project_control_projects')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'پروژه پیدا نشد' });

      await writeAuditLog(supabase, {
        actor_id: me.id,
        action: 'update',
        entity_type: 'project_control_project',
        entity_id: id,
        old_values: null,
        new_values: payload,
      });

      return res.json(data);
    }

    // ─── DELETE: حذف پروژه ─────────────────────────────────────────
    if (req.method === 'DELETE') {
      requireSuperAdmin(req);
      const me = requireAuth(req);
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id الزامی است' });

      const { error } = await supabase
        .from('project_control_projects')
        .delete()
        .eq('id', id);

      if (error) return res.status(500).json({ error: error.message });

      await writeAuditLog(supabase, {
        actor_id: me.id,
        action: 'delete',
        entity_type: 'project_control_project',
        entity_id: id,
        old_values: null,
        new_values: null,
      });

      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'متد مجاز نیست' });

  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
};
