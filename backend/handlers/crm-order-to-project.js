const { supabase, cors, requireAdmin } = require('./_lib');

// ─── Mapping مراحل کاری ──────────────────────────────────────────────────────
// هر مرحله: stage name, assignee (username), توضیحات
// ⚠️ جدول هدف این مراحل همیشه crm_order_tasks است (لاجیک پیشرفت workflow_status
// در crm-order-tasks.js بر اساس همین جدول است). جدول project_tasks صرفاً برای
// تسک‌های عمومی و متغیر پروژه‌هاست و در این تبدیل دخالت ندارد.
const TASK_STAGES = [
  {
    stage: 'sales_review',
    assignee: 'ardestani',
    details: {
      action: 'determine_payment_type',
      description: 'بررسی اولیه فروش و تعیین نوع پرداخت (نقدی/اعتباری/ترکیبی)'
    }
  },
  {
    stage: 'proforma_pending',
    assignee: 'dolatkhah',
    details: {
      action: 'prepare_proforma',
      description: 'آماده‌سازی و صدور پیش‌فاکتور'
    }
  },
  {
    stage: 'proforma_sent',
    assignee: 'customer',
    details: {
      action: 'customer_self_assign',
      description: 'بررسی و تأیید پیش‌فاکتور توسط مشتری'
    }
  },
  {
    stage: 'payment_pending',
    assignee: 'dolatkhah',
    details: {
      action: 'follow_payment',
      description: 'پیگیری و ثبت پرداخت مشتری'
    }
  },
  {
    stage: 'preparation',
    assignee: 'hosseini',
    details: {
      action: 'prepare_goods',
      description: 'آماده‌سازی کالا در انبار'
    }
  },
  {
    stage: 'exit_approval',
    assignee: 'serajeddin',
    details: {
      action: 'generate_invoice_and_sepidar',
      description: 'صدور فاکتور نهایی، ثبت در سپیدار و تأیید خروج',
      generate_invoice: true,
      sepidar_registration: true
    }
  },
  {
    stage: 'ready_to_ship',
    assignee: 'moradi',
    details: {
      action: 'prepare_shipping',
      description: 'آماده‌سازی برای بارگیری'
    }
  },
  {
    stage: 'shipping',
    assignee: 'moradi',
    details: {
      action: 'ship_order',
      description: 'حمل و ارسال کالا به مشتری'
    }
  }
];

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'متد مجاز نیست' });
  }

  try {
    // ── Auth: فقط admin/super_admin ──────────────────────────────────────────
    const admin = requireAdmin(req);

    // ── Validate input ───────────────────────────────────────────────────────
    const { order_id } = req.body || {};
    if (!order_id) {
      return res.status(400).json({ error: 'order_id الزامی است' });
    }

    const parsedId = Number(order_id);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      return res.status(400).json({ error: 'order_id معتبر نیست' });
    }

    // ── دریافت سفارش ─────────────────────────────────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from('crm_orders')
      .select('*, crm_customers!inner(name, status)')
      .eq('id', parsedId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'سفارش پیدا نشد' });
    }

    // ── گاردهای تکراری (idempotency) ─────────────────────────────────────────
    // ۱) آیا قبلاً مراحل کاری برای این سفارش ساخته شده؟
    const { data: existingTasks, error: tasksCheckError } = await supabase
      .from('crm_order_tasks')
      .select('id')
      .eq('order_id', parsedId)
      .limit(1);

    if (tasksCheckError) {
      return res.status(500).json({
        error: `خطا در بررسی مراحل کاری قبلی: ${tasksCheckError.message}`
      });
    }

    if (existingTasks && existingTasks.length > 0) {
      return res.status(409).json({
        error: 'مراحل کاری برای این سفارش قبلاً ایجاد شده است',
        order_id: parsedId
      });
    }

    // ۲) آیا قبلاً پروژه‌ای برای این سفارش ساخته شده؟
    const { data: existingProject, error: projectCheckError } = await supabase
      .from('projects')
      .select('id')
      .eq('order_id', parsedId)
      .limit(1);

    if (projectCheckError) {
      return res.status(500).json({
        error: `خطا در بررسی پروژه قبلی: ${projectCheckError.message}`
      });
    }

    if (existingProject && existingProject.length > 0) {
      return res.status(409).json({
        error: 'برای این سفارش قبلاً پروژه ایجاد شده است',
        order_id: parsedId
      });
    }

    // ── تعیین مسیر چرخه حیات ─────────────────────────────────────────────────
    // wholesale → پروژه + ۸ مرحله کاری (crm_order_tasks)
    // retail    → فاکتور نهایی (crm_invoices) مستقیم، بدون پروژه و مراحل کاری
    // اگر order_type معتبر نبود (مثلاً 'stock' یا NULL در سفارش‌های قدیمی)،
    // از sales_channel استفاده می‌شود تا مایگریشن order_type نادیده گرفته نشود.
    const rawOrderType = order.order_type || order.sales_channel || 'wholesale';
    const orderType = (rawOrderType === 'retail' || rawOrderType === 'wholesale')
      ? rawOrderType
      : (order.sales_channel === 'retail' ? 'retail' : 'wholesale');
    const customerName = order.crm_customers?.name || null;

    if (orderType === 'retail') {
      // ── مسیر خرده‌فروشی: ساخت فاکتور نهایی ──────────────────────────────────
      // گارد تکراری: آیا فاکتوری برای این سفارش ساخته شده؟
      const { data: existingInvoice, error: invoiceCheckError } = await supabase
        .from('crm_invoices')
        .select('id')
        .eq('order_id', parsedId)
        .limit(1);

      if (invoiceCheckError) {
        return res.status(500).json({
          error: `خطا در بررسی فاکتور قبلی: ${invoiceCheckError.message}`
        });
      }

      if (existingInvoice && existingInvoice.length > 0) {
        return res.status(409).json({
          error: 'برای این سفارش قبلاً فاکتور نهایی ایجاد شده است',
          order_id: parsedId
        });
      }

      const invoiceNumber = order.tracking_code
        ? `INV-${order.tracking_code.replace(/^ORD-/, '')}`
        : `INV-${parsedId}`;

      const invoicePayload = {
        order_id: parsedId,
        customer_id: order.customer_id || null,
        invoice_number: invoiceNumber,
        invoice_type: 'official',
        total: order.total_amount || order.amount || 0,
        notes: order.note || (customerName ? `مشتری: ${customerName}` : ''),
        issue_date: new Date().toISOString()
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from('crm_invoices')
        .insert(invoicePayload)
        .select()
        .single();

      if (invoiceError) {
        return res.status(500).json({
          error: invoiceError.message || 'خطا در ایجاد فاکتور نهایی'
        });
      }

      // وضعیت سفارش → آماده صدور فاکتور (مسیر retail مستقیم به فاکتور می‌رود)
      if (order.order_status !== 'proforma_issued') {
        await supabase
          .from('crm_orders')
          .update({ order_status: 'proforma_issued' })
          .eq('id', parsedId);
      }

      // ── ثبت در تاریخچه (بهترین‌تلاش) ────────────────────────────────────────
      await supabase
        .from('crm_order_history')
        .insert({
          order_id: parsedId,
          from_status: order.workflow_status || 'submitted',
          to_status: order.workflow_status || 'submitted',
          changed_by: admin.username || admin.id?.toString() || 'system',
          notes: `مسیر خرده‌فروشی: فاکتور نهایی «${invoiceNumber}» برای سفارش #${parsedId} صادر شد (بدون پروژه/مراحل کاری)`,
          created_at: new Date().toISOString()
        });

      return res.status(201).json({
        ok: true,
        converted: true,
        mode: 'retail',
        order_id: parsedId,
        order_type: 'retail',
        invoice: invoice,
        invoice_number: invoiceNumber,
        workflow_status: order.workflow_status || 'submitted'
      });
    }

    // ── مسیر عمده‌فروشی (wholesale) ───────────────────────────────────────────
    // عنوان بر مبنای شماره سفارش ساخته می‌شود (یک مشتری ممکن است چندین سفارش
    // داشته باشد)؛ نام مشتری در توضیحات ذخیره می‌شود. manager_id = ادمین درخواست‌دهنده
    const projectTitle = `سفارش شماره ${parsedId}`;
    const projectDescription = order.note || (customerName ? `مشتری: ${customerName}` : '');

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        order_id: parsedId,
        title: projectTitle,
        description: projectDescription,
        manager_id: admin.id,
        status: 'active'
      })
      .select()
      .single();

    if (projectError) {
      return res.status(500).json({ error: projectError.message || 'خطا در ایجاد پروژه' });
    }

    // ── گام B: ایجاد ۸ مرحله کاری ────────────────────────────────────────────
    const paymentType = order.payment_type || 'cash';
    const workflowStatus = order.workflow_status || 'submitted';

    const tasks = TASK_STAGES.map((stageDef, index) => {
      const stageDetails = {
        ...stageDef.details,
        payment_type: paymentType,
        order_workflow_status: workflowStatus
      };

      return {
        order_id: parsedId,
        stage: stageDef.stage,
        assignee: stageDef.assignee,
        status: 'pending',
        details: stageDetails,
        order_index: index + 1,
        created_at: new Date().toISOString()
      };
    });

    const { data: createdTasks, error: insertError } = await supabase
      .from('crm_order_tasks')
      .insert(tasks)
      .select();

    // ── جبران (compensation): اگر ساخت مراحل شکست خورد، پروژهٔ ایجادشده حذف شود ──
    // تا دیتابیس در وضعیت ناقص (پروژه بدون مراحل) نماند.
    if (insertError) {
      await supabase.from('projects').delete().eq('id', project.id).select();
      return res.status(500).json({
        error: insertError.message || 'خطا در ایجاد مراحل کاری — پروژه حذف و عملیات لغو شد'
      });
    }

    // ── ثبت در تاریخچه (بهترین‌تلاش — شکستش کل عملیات را لغو نمی‌کند) ───────────
    await supabase
      .from('crm_order_history')
      .insert({
        order_id: parsedId,
        from_status: workflowStatus,
        to_status: workflowStatus,
        changed_by: admin.username || admin.id?.toString() || 'system',
        notes: `ایجاد ${tasks.length} مرحله کاری و پروژه «${projectTitle}» برای سفارش #${parsedId}`,
        created_at: new Date().toISOString()
      });

    // ── عضو تیم پروژه (بهترین‌تلاش — هماهنگ با projects.js) ───────────────────
    try {
      await supabase
        .from('project_members')
        .insert({ project_id: project.id, user_id: admin.id, role: 'manager' });
    } catch (_) {} // ignore duplicate

    // ── Response ─────────────────────────────────────────────────────────────
    return res.status(201).json({
      ok: true,
      converted: true,
      mode: 'wholesale',
      order_id: parsedId,
      workflow_status: workflowStatus,
      payment_type: paymentType,
      customer_status: order.crm_customers?.status || 'unknown',
      project: project,
      tasks: createdTasks || [],
      total_stages: createdTasks?.length || 0
    });

  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'خطای سرور' });
  }
};
