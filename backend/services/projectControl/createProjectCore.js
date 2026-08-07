/**
 * createProjectCore.js Ã¢â‚¬â€ Ã˜Â³Ã˜Â±Ã™Ë†Ã›Å’Ã˜Â³ Ã™â€¦Ã˜Â´Ã˜ÂªÃ˜Â±ÃšÂ© Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯ Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡
 *
 * Ã˜Â¯Ã™Ë† Ã™â€¦Ã˜Â³Ã›Å’Ã˜Â± Ã˜Â§Ã˜Â² Ã˜Â§Ã›Å’Ã™â€  Ã˜Â³Ã˜Â±Ã™Ë†Ã›Å’Ã˜Â³ Ã˜Â§Ã˜Â³Ã˜ÂªÃ™ÂÃ˜Â§Ã˜Â¯Ã™â€¡ Ã™â€¦Ã›Å’Ã¢â‚¬Å’ÃšÂ©Ã™â€ Ã™â€ Ã˜Â¯:
 *  1. Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯ Ã™â€¦Ã˜Â³Ã˜ÂªÃ™â€šÃ›Å’Ã™â€¦ Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡ (POST /api/projects)
 *  2. Ã˜ÂªÃ˜Â¨Ã˜Â¯Ã›Å’Ã™â€ž Ã˜Â³Ã™ÂÃ˜Â§Ã˜Â±Ã˜Â´ Ã˜Â¨Ã™â€¡ Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡ (POST /api/crm-order-to-project)
 *
 * Ã™â€šÃ™Ë†Ã˜Â§Ã™â€ Ã›Å’Ã™â€ :
 *  - Guard Ã˜ÂªÃšÂ©Ã˜Â±Ã˜Â§Ã˜Â±Ã›Å’ Ã˜Â¨Ã˜Â± Ã˜Â§Ã˜Â³Ã˜Â§Ã˜Â³ order_id (crm_order_id)
 *  - Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡ Ã˜Â¯Ã˜Â± project_control_projects Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯ Ã™â€¦Ã›Å’Ã¢â‚¬Å’Ã˜Â´Ã™Ë†Ã˜Â¯
 *  - WBS root Ã˜Â¢Ã™Â¾Ã˜Â´Ã™â€ Ã˜Â§Ã™â€ž Ã˜Â§Ã˜Â³Ã˜Âª
 *  - Tasks Ã˜Â¢Ã™Â¾Ã˜Â´Ã™â€ Ã˜Â§Ã™â€ž Ã™â€¡Ã˜Â³Ã˜ÂªÃ™â€ Ã˜Â¯ Ã™Ë† Ã˜Â¯Ã˜Â± project_control_tasks Ã˜Â°Ã˜Â®Ã›Å’Ã˜Â±Ã™â€¡ Ã™â€¦Ã›Å’Ã¢â‚¬Å’Ã˜Â´Ã™Ë†Ã™â€ Ã˜Â¯
 *  - crm_order_tasks Ã˜Â¬Ã˜Â¯Ã˜Â§ÃšÂ¯Ã˜Â§Ã™â€ Ã™â€¡ Ã˜Â¨Ã˜Â§Ã™â€šÃ›Å’ Ã™â€¦Ã›Å’Ã¢â‚¬Å’Ã™â€¦Ã˜Â§Ã™â€ Ã˜Â¯ (Ã˜Â¯Ã˜Â³Ã˜ÂªÃ˜Â±Ã˜Â³Ã›Å’ Ã™â€ Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â¯)
 *  - Response: { project, wbs?: [...], tasks?: [...] }
 */

const { supabase } = require('../../handlers/_lib');

/**
 * Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯ Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡ + WBS + Tasks Ã˜Â¨Ã™â€¡Ã¢â‚¬Å’Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Âª Ã˜Â§Ã˜ÂªÃ™â€¦Ã›Å’ÃšÂ©
 *
 * @param {object} opts
 * @param {string} opts.code              Ã¢â‚¬â€ ÃšÂ©Ã˜Â¯ Ã™â€¦Ã™â€ Ã˜Â­Ã˜ÂµÃ˜Â±Ã˜Â¨Ã™â€¡Ã¢â‚¬Å’Ã™ÂÃ˜Â±Ã˜Â¯ Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡
 * @param {string} opts.title             Ã¢â‚¬â€ Ã˜Â¹Ã™â€ Ã™Ë†Ã˜Â§Ã™â€  Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡
 * @param {string} [opts.description]     Ã¢â‚¬â€ Ã˜ÂªÃ™Ë†Ã˜Â¶Ã›Å’Ã˜Â­Ã˜Â§Ã˜Âª
 * @param {string} [opts.client]          Ã¢â‚¬â€ Ã™â€ Ã˜Â§Ã™â€¦ Ã™â€¦Ã˜Â´Ã˜ÂªÃ˜Â±Ã›Å’
 * @param {string} [opts.manager_id]      Ã¢â‚¬â€ UUID Ã™â€¦Ã˜Â¯Ã›Å’Ã˜Â± Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡
 * @param {string} [opts.planned_start_date] Ã¢â‚¬â€ Ã˜ÂªÃ˜Â§Ã˜Â±Ã›Å’Ã˜Â® Ã˜Â´Ã˜Â±Ã™Ë†Ã˜Â¹ Ã˜Â¨Ã˜Â±Ã™â€ Ã˜Â§Ã™â€¦Ã™â€¡Ã¢â‚¬Å’Ã˜Â±Ã›Å’Ã˜Â²Ã›Å’Ã¢â‚¬Å’Ã˜Â´Ã˜Â¯Ã™â€¡
 * @param {string} [opts.planned_end_date]   Ã¢â‚¬â€ Ã˜ÂªÃ˜Â§Ã˜Â±Ã›Å’Ã˜Â® Ã™Â¾Ã˜Â§Ã›Å’Ã˜Â§Ã™â€  Ã˜Â¨Ã˜Â±Ã™â€ Ã˜Â§Ã™â€¦Ã™â€¡Ã¢â‚¬Å’Ã˜Â±Ã›Å’Ã˜Â²Ã›Å’Ã¢â‚¬Å’Ã˜Â´Ã˜Â¯Ã™â€¡
 * @param {number} [opts.budget]          Ã¢â‚¬â€ Ã˜Â¨Ã™Ë†Ã˜Â¯Ã˜Â¬Ã™â€¡
 * @param {number} [opts.value]           Ã¢â‚¬â€ Ã˜Â§Ã˜Â±Ã˜Â²Ã˜Â´ Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡
 * @param {string} [opts.priority]        Ã¢â‚¬â€ low|normal|high|urgent|critical
 * @param {string} [opts.risk_level]      Ã¢â‚¬â€ low|medium|high|critical
 * @param {number} [opts.order_id]        Ã¢â‚¬â€ Ã˜Â´Ã™â€ Ã˜Â§Ã˜Â³Ã™â€¡ Ã˜Â³Ã™ÂÃ˜Â§Ã˜Â±Ã˜Â´ Ã™â€¦Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â· (crm_orders.id)
 * @param {string} opts.created_by        Ã¢â‚¬â€ UUID ÃšÂ©Ã˜Â§Ã˜Â±Ã˜Â¨Ã˜Â± Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯ÃšÂ©Ã™â€ Ã™â€ Ã˜Â¯Ã™â€¡
 * @param {Array}  [opts.wbsItems]        Ã¢â‚¬â€ Ã˜Â¢Ã›Å’Ã˜ÂªÃ™â€¦Ã¢â‚¬Å’Ã™â€¡Ã˜Â§Ã›Å’ WBS Ã˜Â¨Ã˜Â±Ã˜Â§Ã›Å’ Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯
 * @param {Array}  [opts.tasks]           Ã¢â‚¬â€ Ã™Ë†Ã˜Â¸Ã˜Â§Ã›Å’Ã™Â Ã˜Â§Ã™Ë†Ã™â€žÃ›Å’Ã™â€¡ Ã˜Â¨Ã˜Â±Ã˜Â§Ã›Å’ Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯
 *
 * @returns {object} { project, wbs, tasks } Ã›Å’Ã˜Â§ { error, message }
 */
// Ã¢â€â‚¬Ã¢â€â‚¬ Shared helper: insert tasks with parent resolution Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function insertTasksForProject(supabase, { projectId, tasks, validWbsIds, createdBy, existingTasks = [] }) {
  // Step 1: sanitize tasks and insert them
  const sanitizedTasks = tasks.map((task) => {
    const { parent_code, parent_task_id, ...rest } = task;
    return {
      ...rest,
      project_control_project_id: projectId,
      created_by: createdBy,
      reporter_id: task.reporter_id || createdBy,
      wbs_item_id: task.wbs_item_id && validWbsIds.has(task.wbs_item_id) ? task.wbs_item_id : null,
      parent_task_id: null, // resolved later in pass-2 (FIX 3)
    };
  });

  const { data: createdTasksResult, error: tasksError } = await supabase
    .from('project_control_tasks')
    .insert(sanitizedTasks)
    .select();

  if (tasksError) {
    // Fix 5 Ã¢â‚¬â€ log diagnostic info for FK
    console.error('[FK_DEBUG] tasks insert failed', {
      code: tasksError.code,
      details: tasksError.details,
      constraint: tasksError.constraint ?? null,
      hint: tasksError.hint,
      sample: sanitizedTasks?.[0],
    });
    return { error: tasksError.message, warning: `Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡ Ã™Ë† WBS Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯ Ã˜Â´Ã˜Â¯ Ã˜Â§Ã™â€¦Ã˜Â§ Ã™Ë†Ã˜Â¸Ã˜Â§Ã›Å’Ã™Â Ã˜Â¨Ã˜Â§ Ã˜Â®Ã˜Â·Ã˜Â§ Ã™â€¦Ã™Ë†Ã˜Â§Ã˜Â¬Ã™â€¡ Ã˜Â´Ã˜Â¯: ${tasksError.message}` };
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
          // FIX 5 Ã¢â‚¬â€ log diagnostic info for FK
          console.error('[FK_DEBUG] parent_task_id update failed', {
            code: pErr.code,
            details: pErr.details,
            constraint: pErr.constraint ?? null,
            hint: pErr.hint,
            update: u,
          });
        }
      })
    );

    if (failedUpdates.length > 0) {
      parentWarning = `Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â¯Ã›Å’Ã™â€  ${failedUpdates.length} Ã™Ë†Ã˜Â¸Ã›Å’Ã™ÂÃ™â€¡ Ã™â€¦Ã™â€ Ã˜Â­Ã™â€ž Ã™â€ Ã˜Â´Ã˜Â¯`; // minimal warning
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
    return { error: 'VALIDATION_ERROR', message: 'Ã˜Â¹Ã™â€ Ã™Ë†Ã˜Â§Ã™â€  Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡ Ã˜Â§Ã™â€žÃ˜Â²Ã˜Â§Ã™â€¦Ã›Å’ Ã˜Â§Ã˜Â³Ã˜Âª' };
  }
  if (!created_by) {
    return { error: 'VALIDATION_ERROR', message: 'created_by Ã˜Â§Ã™â€žÃ˜Â²Ã˜Â§Ã™â€¦Ã›Å’ Ã˜Â§Ã˜Â³Ã˜Âª' };
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Guard Ã˜ÂªÃšÂ©Ã˜Â±Ã˜Â§Ã˜Â±Ã›Å’ Ã˜Â¨Ã˜Â± Ã˜Â§Ã˜Â³Ã˜Â§Ã˜Â³ order_id Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
        message: 'Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡ Ã˜Â¨Ã˜Â±Ã˜Â§Ã›Å’ Ã˜Â§Ã›Å’Ã™â€  Ã˜Â³Ã™ÂÃ˜Â§Ã˜Â±Ã˜Â´ Ã™â€šÃ˜Â¨Ã™â€žÃ˜Â§Ã™â€¹ Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯ Ã˜Â´Ã˜Â¯Ã™â€¡ Ã˜Â§Ã˜Â³Ã˜Âª',
        existing_project: existing[0],
      };
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Ã›Â±. Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯ Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡ Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
    return { error: 'PROJECT_ID_MISSING', message: 'Ã˜Â´Ã™â€ Ã˜Â§Ã˜Â³Ã™â€¡ Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡ Ã™Â¾Ã˜Â³ Ã˜Â§Ã˜Â² Ã˜Â¯Ã˜Â±Ã˜Â¬ Ã˜Â¨Ã˜Â§Ã˜Â²ÃšÂ¯Ã˜Â±Ã˜Â¯Ã˜Â§Ã™â€ Ã˜Â¯Ã™â€¡ Ã™â€ Ã˜Â´Ã˜Â¯' };
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Ã›Â². Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯ WBS root (Ã˜Â¢Ã™Â¾Ã˜Â´Ã™â€ Ã˜Â§Ã™â€ž) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
      // Fix 5 Ã¢â‚¬â€ log diagnostic info for FK
      console.error('[FK_DEBUG] wbs insert failed', {
        code: wbsError.code,
        details: wbsError.details,
        constraint: wbsError.constraint ?? null,
        hint: wbsError.hint,
        sample: wbsWithProject?.[0],
      });
      // WBS failure Ã¢â‚¬â€ project is created but WBS is missing; return partial
      return {
        project,
        wbs: null,
        tasks: [],
        warning: `Ã™Â¾Ã˜Â±Ã™Ë†ÃšËœÃ™â€¡ Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯ Ã˜Â´Ã˜Â¯ Ã˜Â§Ã™â€¦Ã˜Â§ WBS Ã˜Â¨Ã˜Â§ Ã˜Â®Ã˜Â·Ã˜Â§ Ã™â€¦Ã™Ë†Ã˜Â§Ã˜Â¬Ã™â€¡ Ã˜Â´Ã˜Â¯: ${wbsError.message}`,
      };
    }

    wbs = createdWbs || [];
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Ã›Â³. Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯ Tasks (Ã˜Â¢Ã™Â¾Ã˜Â´Ã™â€ Ã˜Â§Ã™â€ž) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
