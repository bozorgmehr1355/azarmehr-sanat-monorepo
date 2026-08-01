const { supabase, cors, requireAuth, requireAdmin } = require("./_lib");

// ─── Mapping: هر stage → workflow_status بعدی ─────────────────────────────────
// وقتی یک task با status='done' کامل می‌شود، workflow_status سفارش به stage بعدی
// منتقل می‌شود مگر اینکه task بعدی assignee='customer' باشد (منتظر مشتری)
const STAGE_WORKFLOW_MAP = {
  sales_review:     "proforma_pending",
  proforma_pending: "proforma_sent",
  proforma_sent:    "payment_pending",
  payment_pending:  "preparation",
  preparation:      "exit_approval",
  exit_approval:    "ready_to_ship",
  ready_to_ship:    "shipping",
  shipping:         "shipping" // آخرین مرحله — تغییری نمی‌کند
};

// ─── وضعیت‌های مجاز تسک ───────────────────────────────────────────────────────
const VALID_STATUSES = ["pending", "done", "rejected", "blocked", "returned"];

// وضعیت‌هایی که نیازمند «دلیل توقف» (stopped_reason) اجباری هستند
const STOP_STATUSES = ["blocked", "returned"];

// برچسب فارسی وضعیت‌ها (برای تاریخچه)
const STATUS_LABELS = {
  pending:   "در انتظار",
  done:      "تکمیل‌شده",
  rejected:  "ردشده",
  blocked:   "متوقف",
  returned:  "برگشت‌خورده"
};

module.exports = async (req, res) => {
  if (cors(req, res)) return;

  try {
    requireAuth(req);

    // ═══════════════════════════════════════════════════════════════════════
    // GET: لیست مراحل کاری یک سفارش
    // ═══════════════════════════════════════════════════════════════════════
    if (req.method === "GET") {
      const { order_id } = req.query;

      if (!order_id) {
        return res.status(400).json({ error: "order_id در query الزامی است" });
      }

      const parsedId = Number(order_id);
      if (!Number.isFinite(parsedId) || parsedId <= 0) {
        return res.status(400).json({ error: "order_id معتبر نیست" });
      }

      const { data: tasks, error } = await supabase
        .from("crm_order_tasks")
        .select("*")
        .eq("order_id", parsedId)
        .order("order_index", { ascending: true });

      if (error) {
        return res.status(500).json({ error: error.message || "خطا در دریافت مراحل کاری" });
      }

      return res.json({
        ok: true,
        order_id: parsedId,
        tasks: tasks || [],
        total: (tasks || []).length
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUT: بروزرسانی وضعیت یک task
    // ═══════════════════════════════════════════════════════════════════════
    if (req.method === "PUT") {
      requireAdmin(req);
      const admin = requireAuth(req);

      const { id, status, notes, stop_reason } = req.body || {};

      // ── Validate ───────────────────────────────────────────────────────
      const parsedId = Number(id);
      if (!id || !Number.isFinite(parsedId) || parsedId <= 0) {
        return res.status(400).json({ error: "id معتبر نیست" });
      }

      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: "status باید pending, done, rejected, blocked یا returned باشد" });
      }

      // تغییر وضعیت به blocked/returned ← دلیل توقف اجباری است
      const isStop = STOP_STATUSES.includes(status);
      const reason = (stop_reason !== undefined && stop_reason !== null)
        ? String(stop_reason).trim()
        : (notes !== undefined && notes !== null ? String(notes).trim() : "");

      if (isStop && !reason) {
        return res.status(400).json({
          error: `برای تغییر وضعیت به «${STATUS_LABELS[status]}» وارد کردن دلیل توقف الزامی است`
        });
      }

      if (notes !== undefined && notes !== null && typeof notes !== "string") {
        return res.status(400).json({ error: "notes باید متن باشد" });
      }

      // ── دریافت task فعلی ──────────────────────────────────────────────
      const { data: task, error: fetchError } = await supabase
        .from("crm_order_tasks")
        .select("id, order_id, stage, status, assignee")
        .eq("id", parsedId)
        .single();

      if (fetchError || !task) {
        return res.status(404).json({ error: "مرحله کاری پیدا نشد" });
      }

      const now = new Date().toISOString();

      // ── محاسبه ستون‌های رصد زمان ──────────────────────────────────────
      // started_at: اولین لحظه‌ای که کار روی تسک شروع می‌شود (خروج از pending)
      const isStarting = task.status === "pending" && status !== "pending";
      const startedAt = isStarting && !task.started_at ? now : (task.started_at || null);

      // stopped_reason: برای blocked/returned ذخیره می‌شود؛ برای بقیه پاک می‌شود
      const stoppedReason = isStop ? reason : null;

      // برای سادگی از دو مرحله استفاده می‌کنیم (read + write)
      // در فاز بعدی: تبدیل به RPC
      const currentDetails = task.details || {};
      const updatedDetails = notes
        ? { ...currentDetails, notes, updated_by: admin.username || admin.id?.toString(), updated_at: now }
        : currentDetails;

      const { data: updatedTask, error: updateError } = await supabase
        .from("crm_order_tasks")
        .update({
          status,
          completed_at: (status === "done" || status === "rejected") ? now : null,
          started_at: startedAt,
          stopped_reason: stoppedReason,
          details: updatedDetails
        })
        .eq("id", parsedId)
        .eq("status", task.status) // optimistic lock
        .select("id, order_id, stage, assignee, status, details, order_index, created_at, completed_at, started_at, stopped_reason")
        .single();

      if (updateError) {
        console.error("[crm-order-tasks] update error:", updateError.message);
        return res.status(500).json({ error: updateError.message || "خطا در بروزرسانی مرحله" });
      }

      if (!updatedTask) {
        return res.status(409).json({ error: "وضعیت مرحله در این لحظه تغییر کرده است" });
      }

      // ── ثبت در crm_order_history (سازگاری) ────────────────────────────
      const historyNotes = isStop
        ? (reason ? `توقف مرحله ${task.stage} — دلیل: ${reason}` : `توقف مرحله ${task.stage} (${STATUS_LABELS[status]})`)
        : (notes || `وضعیت مرحله ${task.stage} به ${STATUS_LABELS[status] || status} تغییر یافت`);

      await supabase
        .from("crm_order_history")
        .insert({
          order_id: task.order_id,
          from_status: task.stage,
          to_status: `${task.stage}:${status}`,
          changed_by: admin.username || admin.id?.toString() || "system",
          notes: historyNotes,
          created_at: now
        });

      // ── ثبت در crm_order_status_log (تاریخچه اختصاصی تسک‌ها) ───────────
      await supabase
        .from("crm_order_status_log")
        .insert({
          task_id: parsedId,
          order_id: task.order_id,
          stage: task.stage,
          from_status: task.status,
          to_status: status,
          reason: isStop ? reason : null,
          changed_by: (typeof admin.id === "number" || /^\d+$/.test(String(admin.id || ""))) ? Number(admin.id) : null,
          created_at: now
        });

      // ── اگر task done شد → workflow_status را به stage بعدی ببر ────────
      if (status === "done") {
        const nextWorkflow = STAGE_WORKFLOW_MAP[task.stage];
        if (nextWorkflow && nextWorkflow !== task.stage) {
          // فقط اگر task بعدی مشتری نیست یا اگر هست صرفاً ذخیره می‌کنیم
          const { data: orderData } = await supabase
            .from("crm_orders")
            .select("workflow_status")
            .eq("id", task.order_id)
            .single();

          if (orderData) {
            await supabase
              .from("crm_orders")
              .update({
                workflow_status: nextWorkflow,
                current_owner: nextWorkflow === "proforma_sent" ? "customer" : null
              })
              .eq("id", task.order_id);

            // ثبت transition در تاریخچه
            await supabase
              .from("crm_order_history")
              .insert({
                order_id: task.order_id,
                from_status: orderData.workflow_status || task.stage,
                to_status: nextWorkflow,
                changed_by: "system",
                notes: `transition خودکار: ${task.stage} کامل شد → ${nextWorkflow}`,
                created_at: now
              });
          }
        }
      }

      // ── Response ──────────────────────────────────────────────────────
      return res.json({
        ok: true,
        task: updatedTask,
        workflow_transition: (status === "done") ? (STAGE_WORKFLOW_MAP[task.stage] || null) : null
      });
    }

    return res.status(405).json({ error: "متد مجاز نیست" });

  } catch (e) {
    console.error("[crm-order-tasks] error:", e.message || e);
    return res.status(e.status || 500).json({ error: e.message || "خطای سرور" });
  }
};
