/**
 * createProjectCore.js — سرویس مشترک ایجاد پروژه
 *
 * دو مسیر از این سرویس استفاده می‌کنند:
 *  1. ایجاد مستقیم پروژه (POST /api/projects)
 *  2. تبدیل سفارش به پروژه (POST /api/crm-order-to-project)
 *
 * قوانین:
 *  - Guard تکراری بر اساس order_id (crm_order_id)
 *  - پروژه در project_control_projects ایجاد می‌شود
 *  - WBS root آپشنال است
 *  - Tasks آپشنال هستند و در project_control_tasks ذخیره می‌شوند
 *  - crm_order_tasks جداگانه باقی می‌ماند (دسترسی ندارد)
 *  - Response: { project, wbs?: [...], tasks?: [...] }
 */

const { supabase } = require('../../handlers/_lib');

/**
 * ایجاد پروژه + WBS + Tasks به‌صورت اتمیک
 *
 * @param {object} opts
 * @param {string} opts.code              — کد منحصربه‌فرد پروژه
 * @param {string} opts.title             — عنوان پروژه
 * @param {string} [opts.description]     — توضیحات
 * @param {string} [opts.client]          — نام مشتری
 * @param {string} [opts.manager_id]      — UUID مدیر پروژه
 * @param {string} [opts.planned_start_date] — تاریخ شروع برنامه‌ریزی‌شده
 * @param {string} [opts.planned_end_date]   — تاریخ پایان برنامه‌ریزی‌شده
 * @param {number} [opts.budget]          — بودجه
 * @param {number} [opts.value]           — ارزش پروژه
 * @param {string} [opts.priority]        — low|normal|high|urgent|critical
 * @param {string} [opts.risk_level]      — low|medium|high|critical
 * @param {number} [opts.order_id]        — شناسه سفارش مرتبط (crm_orders.id)
 * @param {string} opts.created_by        — UUID کاربر ایجادکننده
 * @param {Array}  [opts.wbsItems]        — آیتم‌های WBS برای ایجاد
 * @param {Array}  [opts.tasks]           — وظایف اولیه برای ایجاد
 *
 * @returns {object} { project, wbs, tasks } یا { error, message }
 */
// ── Shared helper: insert tasks with parent resolution ───────────
async function insertTasksForProject(supabase, { projectId, tasks, validWbsIds, createdBy, existingTasks = [] }) {
  // Step 1: sanitize tasks and insert them
  const sanitizedTasks = tasks.map((task) => {
    const { parent_code, ...rest } = task;
    return {
      ...rest,
      project_control_project_id: projectId,
      created_by: createdBy,
      reporter_id: task.reporter_id || createdBy,
      wbs_item_id: task.wbs_item_id && validWbsIds.has(task.wbs_item_id) ? task.wbs_item_id : null,
      parent_code, // pass along for parent resolution
    };
  });

  const { data: createdTasksResult, error: tasksError } = await supabase
    .from('project_control_tasks')
    .insert(sanitizedTasks)
    .select();

  if (tasksError) {
    // Fix 5 — log diagnostic info for FK
    console.error('[FK_DEBUG] tasks insert failed', {
      code: tasksError.code,
      details: tasksError.details,
      constraint: tasksError.details,
      hint: tasksError.hint,
      sample: sanitizedTasks?.[0],
    });
    return { error: tasksError.message, warning: `پروژه و WBS ایجاد شد اما وظایف با خطا مواجه شد: ${tasksError.message}` };
  }

  const parentWarning = null;
  const codeToId = new Map([...(existingTasks || []), ...(createdTasksResult || [])]
    .map((t) => [t.code, t.id]));

  const parentUpdates = tasks
    .filter((t) => t.parent_code && codeToId.has(t.parent_code) && codeToId.has(t.code))
    .map((t) => ({
      id: codeToId.get(t.code),
      parent_task_id: codeToId.get(t.parent_code)
    }));

  if (parentUpdates.length > 0) {
    const failedUpdates = [];

    await Promise.all(
      parentUpdates.map(async (u) => {
        // Self-reference guard
        if (u.id === u.parent_task_id) return;

        const { error: pErr } = await supabase
          .from('project_control_tasks')
          .update({ parent_task_id: u.parent_task_id })
          .eq('id', u.id);

        if (pErr) {
          failedUpdates.push(u);
          // FIX 5 — log diagnostic info for FK
          console.error('[FK_DEBUG] parent_task_id update failed', {
            code: pErr.code,
            details: pErr.details,
            constraint: pErr.details,
            hint: pErr.hint,
            update: u,
          });
        }
      })
    );

    if (failedUpdates.length > 0) {
      parentWarning = `والدین ${failedUpdates.length} وظیفه منحل نشد`; // minimal warning
    }
  }

  return {
    data: createdTasksResult || [],
    error: null,
    warning: parentWarning
  };
}

async function createProjectCore(opts) {
  const {
    code,
    title,
    description = '',
    client = '',
    manager_id = null,
    planned_start_date = null,
    planned_end_date = null,
    budget = 0,
    value = 0,
    priority = 'normal',
    risk_level = 'low',
    order_id = null,
    created_by,
    wbsItems = [],
    tasks = [],
  } = opts || {};

  if (!title) {
    return { error: 'VALIDATION_ERROR', message: 'عنوان پروژه الزامی است' };
  }
  if (!created_by) {
    return { error: 'VALIDATION_ERROR', message: 'created_by الزامی است' };
  }

  // ── Guard تکراری بر اساس order_id ──────────────────────────────────
  if (order_id) {
    const { data: existing, error: exErr } = await supabase
      .from('project_control_projects')
      .select('id, code')
      .eq('order_id', order_id)
      .limit(1);

    if (exErr) {
      return { error: 'DB_ERROR', message: exErr.message };
    }
    if (existing && existing.length > 0) {
      return {
        error: 'DUPLICATE_ORDER_ID',
        message: 'پروژه برای این سفارش قبلاً ایجاد شده است',
        existing_project: existing[0],
      };
    }
  }

  // ── ۱. ایجاد پروژه ──────────────────────────────────────────────────
  const projectPayload = {
    code: code || null,
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
    created_by,
  };

  const { data: project, error: projectError } = await supabase
    .from('project_control_projects')
    .insert(projectPayload)
    .select()
    .single();

  if (projectError) {
    return { error: 'PROJECT_CREATE_FAILED', message: projectError.message };
  }
  if (!project?.id) {
    return { error: 'PROJECT_ID_MISSING', message: 'شناسه پروژه پس از درج بازگردانده نشد' };
  }

  // ── ۲. ایجاد WBS root (آپشنال) ─────────────────────────────────────
  let wbs = [];
  if (wbsItems.length > 0) {
    const wbsWithProject = wbsItems.map((item) => ({
      ...item,
      project_control_project_id: project.id,
      created_by,
    }));

    const { data: createdWbs, error: wbsError } = await supabase
      .from('project_control_wbs_items')
      .insert(wbsWithProject)
      .select();

    if (wbsError) {
      // Fix 5 — log diagnostic info for FK
      console.error('[FK_DEBUG] wbs insert failed', {
        code: wbsError.code,
        details: wbsError.details,
        constraint: wbsError.details,
        hint: wbsError.hint,
        sample: wbsWithProject?.[0],
      });
      // WBS failure — project is created but WBS is missing; return partial
      return {
        project,
        wbs: null,
        tasks: [],
        warning: `پروژه ایجاد شد اما WBS با خطا مواجه شد: ${wbsError.message}`,
      };
    }

    wbs = createdWbs || [];
  }

  // ── ۳. ایجاد Tasks (آپشنال) ─────────────────────────────────────────
   let createdTasks = [];
   let parentWarning = null;

   if (tasks.length > 0) {
     // Extract valid WBS IDs from the WBS that were actually inserted
     const validWbsIds = new Set((wbs || []).map((w) => w.id));

     const insertResult = await insertTasksForProject(supabase, {
       projectId: project.id,
       tasks,
       validWbsIds,
       createdBy: created_by,
       existingTasks: [],
     });

     if (insertResult.error) {
       return {
         project,
         wbs,
         tasks: null,
         warning: insertResult.warning,
       };
     }

     createdTasks = insertResult.data || [];
     parentWarning = insertResult.warning;
   }

   return { project, wbs, tasks: createdTasks, warning: parentWarning || undefined };
}

module.exports = { createProjectCore };
