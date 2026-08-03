const { supabase, cors, requireAdmin } = require('./_lib');
const { createProjectCore } = require('../services/projectControl/createProjectCore');

// ─── Mapping مراحل کاری به وظایف project_control_tasks ──────────────
// هر مرحله: stage name, assignee (username), توضیحات، اولویت
// ⚠️ جدول هدف این مراحل project_control_tasks است (نه crm_order_tasks).
// crm_order_tasks جداگانه باقی می‌ماند و در این تبدیل دخالت ندارد.
const TASK_STAGES = [
  {
    stage: 'sales_review',
    assignee: 'ardestani',
    title: 'بررسی اولیه فروش و تعیین نوع پرداخت',
    description: 'بررسی اولیه فروش و تعیین نوع پرداخت (نقدی/اعتباری/ترکیبی)',
    priority: 'high',
    details: { action: 'determine_payment_type' },
  },
  {
    stage: 'proforma_pending',
    assignee: 'dolatkhah',
    title: 'آماده‌سازی و صدور پیش‌فاکتور',
    description: 'آماده‌سازی و صدور پیش‌فاکتور',
    priority: 'high',
    details: { action: 'prepare_proforma' },
  },
  {
    stage: 'proforma_sent',
    assignee: 'customer',
    title: 'بررسی و تأیید پیش‌فاکتور توسط مشتری',
    description: 'بررسی و تأیید پیش‌فاکتور توسط مشتری',
    priority: 'normal',
    details: { action: 'customer_self_assign' },
  },
  {
    stage: 'payment_pending',
    assignee: 'dolatkhah',
    title: 'پیگیری و ثبت پرداخت مشتری',
    description: 'پیگیری و ثبت پرداخت مشتری',
    priority: 'high',
    details: { action: 'follow_payment' },
  },
  {
    stage: 'preparation',
    assignee: 'hosseini',
    title: 'آماده‌سازی کالا در انبار',
    description: 'آماده‌سازی کالا در انبار',
    priority: 'normal',
    details: { action: 'prepare_goods' },
  },
  {
    stage: 'exit_approval',
    assignee: 'serajeddin',
    title: 'صدور فاکتور نهایی، ثبت در سپیدار و تأیید خروج',
    description: 'صدور فاکتور نهایی، ثبت در سپیدار و تأیید خروج',
    priority: 'critical',
    details: { action: 'generate_invoice_and_sepidar', generate_invoice: true, sepidar_registration: true },
  },
  {
    stage: 'ready_to_ship',
    assignee: 'moradi',
    title: 'آماده‌سازی برای بارگیری',
    description: 'آماده‌سازی برای بارگیری',
    priority: 'normal',
    details: { action: 'prepare_shipping' },
  },
  {
    stage: 'shipping',
    assignee: 'moradi',
    title: 'حمل و ارسال کالا به مشتری',
    description: 'حمل و ارسال کالا به مشتری',
    priority: 'normal',
    details: { action: 'ship_order' },
  },
];

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'متد مجاز نیست' });
  }

  try {
    // ── Auth: فقط admin/super_admin ──────────────────────────────────
    const admin = requireAdmin(req);

    // ── Validate input ───────────────────────────────────────────────
    const { order_id } = req.body || {};
    if (!order_id) {
      return res.status(400).json({ error: 'order_id الزامی است' });
    }

    const parsedId = Number(order_id);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      return res.status(400).json({ error: 'order_id معتبر نیست' });
    }

    // ── دریافت سفارش ─────────────────────────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from('crm_orders')
      .select('*, crm_customers!inner(name, status)')
      .eq('id', parsedId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'سفارش پیدا نشد' });
    }

    // ── تعیین مسیر چرخه حیات ─────────────────────────────────────────
    const rawOrderType = order.order_type || order.sales_channel || 'wholesale';
    const orderType = (rawOrderType === 'retail' || rawOrderType === 'wholesale')
      ? rawOrderType
      : (order.sales_channel === 'retail' ? 'retail' : 'wholesale');
    const customerName = order.crm_customers?.name || null;

    if (orderType === 'retail') {
      // ── مسیر خرده‌فروشی: ساخت فاکتور نهایی ──────────────────────
      // گارد تکراری: آیا فاکتوری برای این سفارش ساخته شده؟
      const { data: existingInvoice, error: invoiceCheckError } = await supabase
        .from('crm_invoices')
        .select('id')
        .eq('order_id', parsedId)
        .limit(1);

      if (invoiceCheckError) {
        return res.status(500).json({
          error: `خطا در بررسی فاکتور قبلی: ${invoiceCheckError.message}`,
        });
      }

      if (existingInvoice && existingInvoice.length > 0) {
        return res.status(409).json({
          error: 'برای این سفارش قبلاً فاکتور نهایی ایجاد شده است',
          order_id: parsedId,
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
        issue_date: new Date().toISOString(),
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from('crm_invoices')
        .insert(invoicePayload)
        .select()
        .single();

      if (invoiceError) {
        return res.status(500).json({
          error: invoiceError.message || 'خطا در ایجاد فاکتور نهایی',
        });
      }

      // وضعیت سفارش → آماده صدور فاکتور
      if (order.order_status !== 'proforma_issued') {
        await supabase
          .from('crm_orders')
          .update({ order_status: 'proforma_issued' })
          .eq('id', parsedId);
      }

      // ── ثبت در تاریخچه (بهترین‌تلاش) ──────────────────────────────
      await supabase
        .from('crm_order_history')
        .insert({
          order_id: parsedId,
          from_status: order.workflow_status || 'submitted',
          to_status: order.workflow_status || 'submitted',
          changed_by: admin.username || admin.id?.toString() || 'system',
          notes: `مسیر خرده‌فروشی: فاکتور نهایی «${invoiceNumber}» برای سفارش #${parsedId} صادر شد (بدون پروژه/مراحل کاری)`,
          created_at: new Date().toISOString(),
        });

      return res.status(201).json({
        ok: true,
        converted: true,
        mode: 'retail',
        order_id: parsedId,
        order_type: 'retail',
        invoice,
        invoice_number: invoiceNumber,
        workflow_status: order.workflow_status || 'submitted',
      });
    }

    // ── مسیر عمده‌فروشی (wholesale): تبدیل سفارش به پروژه ──────────
    const projectTitle = `سفارش شماره ${parsedId}`;
    const projectDescription = order.note || (customerName ? `مشتری: ${customerName}` : '');

    // ── ساخت WBS root item ──────────────────────────────────────────
    const wbsItems = [
      {
        code: `WBS-${parsedId}`,
        title: projectTitle,
        description: projectDescription,
        wbs_level: 1,
        sort_order: 0,
        is_milestone: false,
      },
    ];

    // ── ساخت Tasks از مراحل کاری ──────────────────────────────────
    const paymentType = order.payment_type || 'cash';
    const workflowStatus = order.workflow_status || 'submitted';

    const tasks = TASK_STAGES.map((stageDef, index) => ({
      code: stageDef.stage,
      title: stageDef.title,
      description: stageDef.description,
      priority: stageDef.priority,
      status: 'draft',
      severity: 'normal',
      weight: 10,
      expected_output: stageDef.details.action,
      acceptance_criteria: `مرحله ${stageDef.stage} تکمیل شود`,
      metadata: {
        assignee_username: stageDef.stage === 'proforma_sent' ? 'customer' : undefined,
        payment_type: paymentType,
        order_workflow_status: workflowStatus,
        original_stage: stageDef.stage,
        order_index: index + 1,
      },
    }));

    // ── استفاده از سرویس مشترک ایجاد پروژه ─────────────────────────
    const result = await createProjectCore({
      code: `PRJ-${parsedId}`,
      title: projectTitle,
      description: projectDescription,
      client: customerName || '',
      manager_id: admin.id,
      priority: 'normal',
      risk_level: 'low',
      order_id: parsedId,
      created_by: admin.id,
      wbsItems,
      tasks,
    });

    const warnings = [];
    let projectCreated = false;
    let projectAlreadyExists = false;
    let existingProject = null;

    if (result.error) {
      if (result.error === 'DUPLICATE_ORDER_ID') {
        // ── Recovery path: project exists, recover crm_order_tasks if missing ──
        projectAlreadyExists = true;
        existingProject = result.existing_project;
      } else {
        const status = result.error === 'DB_ERROR' ? 503 : 500;
        return res.status(status).json({
          ok: false,
          converted: false,
          projectCreated: false,
          projectAlreadyExists: false,
          orderWorkflowCreated: false,
          orderWorkflowSkipped: false,
          error: result.message,
          warnings,
        });
      }
    } else {
      projectCreated = true;
      existingProject = result.project;

      // Propagate core warnings (e.g., WBS or tasks partial failure)
      if (result.warning) {
        warnings.push(result.warning);
      }
    }

    // ── Restore: ساخت crm_order_tasks برای workflow سفارش ──────────
    // گارد تکراری: آیا قبلاً مراحل کاری برای این سفارش ساخته شده؟
    const { data: existingTasks, error: tasksCheckError } = await supabase
      .from('crm_order_tasks')
      .select('id')
      .eq('order_id', parsedId)
      .limit(1);

    let orderWorkflowCreated = false;
    let orderWorkflowSkipped = false;

    if (tasksCheckError) {
      warnings.push(`خطا در بررسی مراحل کاری قبلی: ${tasksCheckError.message}`);
    } else if (!existingTasks || existingTasks.length === 0) {
      // crm_order_tasks وجود ندارد → ساخت
      const crmTasks = TASK_STAGES.map((stageDef, index) => ({
        order_id: parsedId,
        stage: stageDef.stage,
        assignee: stageDef.assignee,
        status: 'pending',
        details: {
          ...stageDef.details,
          payment_type: paymentType,
          order_workflow_status: workflowStatus,
        },
        order_index: index + 1,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('crm_order_tasks')
        .insert(crmTasks);

      if (insertError) {
        warnings.push(`ساخت مراحل کاری سفارش با خطا مواجه شد: ${insertError.message}`);
      } else {
        orderWorkflowCreated = true;
      }
    } else {
      orderWorkflowSkipped = true;
    }

    // ── ثبت در تاریخچه (بهترین‌تلاش) ──────────────────────────────
    await supabase
      .from('crm_order_history')
      .insert({
        order_id: parsedId,
        from_status: workflowStatus,
        to_status: workflowStatus,
        changed_by: admin.username || admin.id?.toString() || 'system',
        notes: projectAlreadyExists
          ? `بازیابی workflow سفارش #${parsedId}: مراحل کاری ${orderWorkflowCreated ? 'ساخته شد' : 'موجود بود'} — پروژه قبلاً وجود داشت`
          : `تبدیل سفارش #${parsedId} به پروژه «${projectTitle}» با ${tasks.length} مرحله کاری`,
        created_at: new Date().toISOString(),
      });

    // ── عضو تیم پروژه (بهترین‌تلاش) ────────────────────────────────
    if (!projectAlreadyExists) {
      try {
        await supabase
          .from('project_control_project_members')
          .insert({ project_control_project_id: existingProject.id, user_id: admin.id, role: 'manager' });
      } catch (_) {} // ignore duplicate
    }

    // ── Response ─────────────────────────────────────────────────────
    const statusCode = projectAlreadyExists ? 200 : 201;
    return res.status(statusCode).json({
      ok: true,
      converted: true,
      mode: 'wholesale',
      order_id: parsedId,
      workflow_status: workflowStatus,
      payment_type: paymentType,
      customer_status: order.crm_customers?.status || 'unknown',
      projectCreated,
      projectAlreadyExists,
      orderWorkflowCreated,
      orderWorkflowSkipped,
      warnings,
      project: existingProject,
      wbs: result.wbs || [],
      tasks: result.tasks || [],
      total_stages: result.tasks?.length || 0,
    });

  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'خطای سرور' });
  }
};
