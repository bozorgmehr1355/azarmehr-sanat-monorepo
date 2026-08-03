/**
 * reports.js — Reporting API Handler
 *
 * ۶ endpoint گزارش‌گیری:
 *   GET /api/reports/projects/summary
 *   GET /api/reports/tasks/summary
 *   GET /api/reports/tasks/overdue
 *   GET /api/reports/tasks/blocked
 *   GET /api/reports/users/performance
 *   GET /api/reports/meetings/summary
 *
 * Authorization:
 *   - admin/super_admin: دسترسی کامل به همه داده‌ها
 *   - non-admin: فقط داده‌های projectهایی که در project_members عضو هستند
 *   - identity فقط از JWT (requireAuth) استخراج می‌شود
 *
 * ⚠️ محدودیت‌های شناخته‌شده:
 *   - avg_completion_time_days موقتاً nullable است (ستون completed_at وجود ندارد)
 *   - aggregation در backend انجام می‌شود (Supabase JS GROUP BY ندارد)
 *   - در حجم زیاد داده، performance نیاز به RPC خواهد داشت
 */

const { supabase, cors, requireAuth } = require('./_lib');

// ─── وضعیت‌های پایانی تسک (terminal states) ───
// TERMINAL = APPROVED, REJECTED, CANCELLED, ARCHIVED (canonical definition)
const TERMINAL_STATUSES = ['APPROVED', 'REJECTED', 'CANCELLED', 'ARCHIVED'];
const COMPLETED_STATUSES = ['APPROVED'];

// ─── Helper: دریافت ID پروژه‌های عضو ───
async function getMemberProjectIds(userId) {
  const { data, error } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  if (error) {
    console.error('[reports] getMemberProjectIds error:', error.message);
    return [];
  }
  return (data || []).map(m => m.project_id);
}

// ─── Helper: بررسی ادمین بودن ───
function isAdmin(decoded) {
  return decoded.system_role === 'super_admin' || decoded.system_role === 'admin';
}

// ─── Helper: parses query date params ───
function parseDateParam(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ─── Helper: parse int with default ───
function parseIntParam(val, defaultVal) {
  const n = parseInt(val, 10);
  return isNaN(n) ? defaultVal : n;
}

// ─── Handler Entry Point ───
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const me = requireAuth(req);

    // فقط GET مجاز است
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'فقط GET مجاز است' });
    }

    // ─── Route Parsing ───
    // /api/reports/projects/summary → parts = ['api','reports','projects','summary']
    // segments = parts.slice(2) = ['projects','summary']
    const pathname = (req.url || '').split('?')[0];
    const parts = pathname.split('/').filter(Boolean);
    const segments = parts.slice(2); // حذف 'api' و 'reports'

    const resource = segments[0]; // projects, tasks, users, meetings
    const reportType = segments[1]; // summary, overdue, blocked, performance

    // ─── دریافت scope پروژه‌ها ───
    const memberProjectIds = isAdmin(me) ? null : await getMemberProjectIds(me.id);

    // ─── Validate project_id parameter ───
    const projectFilter = req.query?.project_id || null;
    const scopeResult = getProjectScope(memberProjectIds, projectFilter);

    // Handle validation errors
    if (scopeResult.error) {
      return res.status(400).json({ error: scopeResult.error });
    }

    // ─── Admin-only routes: reject non-admin BEFORE scope check ───
    // users/performance is admin-only
    if (resource === 'users' && reportType === 'performance') {
      if (!isAdmin(me)) {
        return res.status(403).json({ error: 'فقط ادمین به این گزارش دسترسی دارد' });
      }
    }

    // Non-admin with no access (unauthorized project or no membership)
    if (scopeResult.scope === 'none') {
      return res.json(getEmptyResponse(resource, reportType));
    }

    // ─── مسیریابی ───
    if (resource === 'projects' && reportType === 'summary') {
      return await projectsSummary(req, res, me, scopeResult);
    }
    if (resource === 'tasks' && reportType === 'summary') {
      return await tasksSummary(req, res, me, scopeResult);
    }
    if (resource === 'tasks' && reportType === 'overdue') {
      return await tasksOverdue(req, res, me, scopeResult);
    }
    if (resource === 'tasks' && reportType === 'blocked') {
      return await tasksBlocked(req, res, me, scopeResult);
    }
    if (resource === 'users' && reportType === 'performance') {
      return await usersPerformance(req, res, me, scopeResult);
    }
    if (resource === 'meetings' && reportType === 'summary') {
      return await meetingsSummary(req, res, me, scopeResult);
    }

    return res.status(404).json({ error: 'مسیر گزارش پیدا نشد' });

  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};

// ─── پاسخ خالی برای کاربر بدون پروژه ───
function getEmptyResponse(resource, reportType) {
  if (resource === 'projects' && reportType === 'summary') {
    return { total: 0, by_status: {}, projects: [] };
  }
  if (resource === 'tasks' && reportType === 'summary') {
    return { total: 0, by_status: {}, overdue_count: 0, blocked_count: 0, due_soon_count: 0 };
  }
  if (resource === 'tasks' && (reportType === 'overdue' || reportType === 'blocked')) {
    return { total: 0, items: [] };
  }
  if (resource === 'users' && reportType === 'performance') {
    return { users: [] };
  }
  if (resource === 'meetings' && reportType === 'summary') {
    return { total: 0, upcoming: 0, action_items_open: 0, meetings: [] };
  }
  return { total: 0 };
}

// ─── Helper: Validate UUID format ───
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ─── Helper: Centralized project scope authorization ───
/**
 * Determines the effective project scope for a query based on user role and membership.
 * @param {Array|null} memberProjectIds - Array of project IDs user is member of (null for admin)
 * @param {string|null} projectFilter - Requested project_id from query params
 * @returns {Object} { scope: 'all' | 'member' | 'single' | 'none', projectIds: Array<string>, error?: string }
 */
function getProjectScope(memberProjectIds, projectFilter) {
  // Admin: unrestricted access
  if (memberProjectIds === null) {
    if (projectFilter) {
      if (!isValidUUID(projectFilter)) {
        return { scope: 'error', projectIds: [], error: 'Invalid project_id format' };
      }
      return { scope: 'single', projectIds: [projectFilter] };
    }
    return { scope: 'all', projectIds: [] };
  }

  // Non-admin: must have membership
  if (memberProjectIds.length === 0) {
    return { scope: 'none', projectIds: [] };
  }

  if (projectFilter) {
    if (!isValidUUID(projectFilter)) {
      return { scope: 'error', projectIds: [], error: 'Invalid project_id format' };
    }
    // Check if requested project is within user's membership
    if (!memberProjectIds.includes(projectFilter)) {
      return { scope: 'none', projectIds: [] }; // Unauthorized - return empty
    }
    return { scope: 'single', projectIds: [projectFilter] };
  }

  // No filter - return all member projects
  return { scope: 'member', projectIds: memberProjectIds };
}

// ─── Helper: Apply project scope to query ───
/**
 * Applies project scope filter to a Supabase query.
 * @param {Object} query - Supabase query builder
 * @param {Object} scopeResult - Result from getProjectScope()
 * @param {string} columnName - Column to filter on (default: 'project_id', use 'id' for projects table)
 */
function applyProjectScope(query, scopeResult, columnName = 'project_id') {
  if (scopeResult.scope === 'single') {
    return query.eq(columnName, scopeResult.projectIds[0]);
  }
  if (scopeResult.scope === 'member') {
    // Guard against empty array - should not happen due to earlier checks
    if (scopeResult.projectIds.length === 0) {
      return query.eq(columnName, '00000000-0000-0000-0000-000000000000'); // Impossible UUID
    }
    return query.in(columnName, scopeResult.projectIds);
  }
  // scope === 'all' (admin no filter) or 'none' (handled before query)
  return query;
}

// ─── Helper: اعمال فیلتر تاریخ ───
function applyDateFilters(query, from, to, dateField) {
  if (from) {
    query = query.gte(dateField, from);
  }
  if (to) {
    query = query.lte(dateField, to);
  }
  return query;
}

// ═══════════════════════════════════════════════════════════════════
// 1. GET /api/reports/projects/summary
// ═══════════════════════════════════════════════════════════════════
async function projectsSummary(req, res, me, scopeResult) {
  const { from, to } = req.query || {};
  const fromDate = parseDateParam(from);
  const toDate = parseDateParam(to);

  // ─── گرفتن پروژه‌ها ───
  let projQuery = supabase.from('projects').select('*');
  projQuery = applyProjectScope(projQuery, scopeResult, 'id');
  if (fromDate) projQuery = projQuery.gte('created_at', fromDate);
  if (toDate) projQuery = projQuery.lte('created_at', toDate);
  projQuery = projQuery.order('created_at', { ascending: false });

  const { data: projects, error: projErr } = await projQuery;
  if (projErr) return res.status(500).json({ error: projErr.message });

  const projectList = projects || [];
  const projectIds = projectList.map(p => p.id);

  if (projectIds.length === 0) {
    return res.json({
      total: 0,
      by_status: {},
      projects: [],
    });
  }

  // ─── گرفتن همه تسک‌های پروژه‌ها ───
  const { data: allTasks, error: taskErr } = await supabase
    .from('project_tasks')
    .select('project_id, status, due_date')
    .in('project_id', projectIds);

  if (taskErr) return res.status(500).json({ error: taskErr.message });

  const tasks = allTasks || [];
  const now = new Date().toISOString();

  // ─── شمارش بر اساس status ───
  const byStatus = {};
  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  }

  // ─── محاسبه overdue برای هر پروژه ───
  const projectStats = projectList.map(p => {
    const projTasks = tasks.filter(t => t.project_id === p.id);
    const completedCount = projTasks.filter(t =>
      COMPLETED_STATUSES.includes(t.status)
    ).length;
    const overdueCount = projTasks.filter(t =>
      t.due_date && t.due_date < now && !TERMINAL_STATUSES.includes(t.status)
    ).length;

    return {
      id: p.id,
      title: p.title,
      status: p.status,
      manager_id: p.manager_id,
      created_at: p.created_at,
      task_count: projTasks.length,
      completed_count: completedCount,
      overdue_count: overdueCount,
    };
  });

  return res.json({
    total: projectList.length,
    by_status: byStatus,
    total_tasks: tasks.length,
    overdue_tasks: tasks.filter(t =>
      t.due_date && t.due_date < now && !TERMINAL_STATUSES.includes(t.status)
    ).length,
    projects: projectStats,
  });
}

// ═══════════════════════════════════════════════════════════════════
// 2. GET /api/reports/tasks/summary
// ═══════════════════════════════════════════════════════════════════
async function tasksSummary(req, res, me, scopeResult) {
  const { assigned_to, from, to, status } = req.query || {};
  const fromDate = parseDateParam(from);
  const toDate = parseDateParam(to);

  let query = supabase.from('project_tasks').select('id, project_id, status, assigned_to, due_date, priority, created_at');

  // Apply project scope
  query = applyProjectScope(query, scopeResult);

  // فیلتر assignee
  if (assigned_to) {
    query = query.eq('assigned_to', assigned_to);
  }

  // فیلتر status
  if (status) {
    query = query.eq('status', status);
  }

  // فیلتر تاریخ
  query = applyDateFilters(query, fromDate, toDate, 'created_at');

  const { data: tasks, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const allTasks = tasks || [];
  const now = new Date().toISOString();

  // ─── aggregation در backend ───
  const byStatus = {};
  const byPriority = {};
  let overdueCount = 0;
  let dueSoonCount = 0;
  const dueSoonThreshold = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // ۳ روز آینده

  for (const t of allTasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;

    if (t.due_date && t.due_date < now && !TERMINAL_STATUSES.includes(t.status)) {
      overdueCount++;
    }
    if (t.due_date && t.due_date >= now && t.due_date <= dueSoonThreshold && !TERMINAL_STATUSES.includes(t.status)) {
      dueSoonCount++;
    }
  }

  // ─── blocked count (نیاز به query جداگانه) ───
  let blockedCount = 0;
  if (allTasks.length > 0) {
    const taskIds = allTasks.map(t => t.id);
    const { data: blockers } = await supabase
      .from('task_blockers')
      .select('project_task_id')
      .in('project_task_id', taskIds);

    if (blockers) {
      const blockedTaskIds = new Set(blockers.map(b => b.project_task_id));
      blockedCount = blockedTaskIds.size;
    }
  }

  return res.json({
    total: allTasks.length,
    by_status: byStatus,
    by_priority: byPriority,
    overdue_count: overdueCount,
    blocked_count: blockedCount,
    due_soon_count: dueSoonCount,
  });
}

// ═══════════════════════════════════════════════════════════════════
// 3. GET /api/reports/tasks/overdue
// ═══════════════════════════════════════════════════════════════════
async function tasksOverdue(req, res, me, scopeResult) {
  const { assigned_to, limit, page } = req.query || {};
  const pageSize = Math.min(parseIntParam(limit, 50), 200);
  const pageNum = Math.max(parseIntParam(page, 1), 1);

  let query = supabase
    .from('project_tasks')
    .select('id, project_id, title, status, assigned_to, due_date, priority, created_at');

  // Apply project scope
  query = applyProjectScope(query, scopeResult);

  if (assigned_to) {
    query = query.eq('assigned_to', assigned_to);
  }

  const { data: allTasks, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const now = new Date().toISOString();

  // ─── فیلتر overdue در backend ───
  let overdueTasks = (allTasks || []).filter(t =>
    t.due_date && t.due_date < now && !TERMINAL_STATUSES.includes(t.status)
  );

  // ─── مرتب‌سازی بر اساس شدت overdue (قدیمی‌تر اول) ───
  overdueTasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const total = overdueTasks.length;

  // ─── صفحه‌بندی سبک ───
  const start = (pageNum - 1) * pageSize;
  const pagedTasks = overdueTasks.slice(start, start + pageSize);

  // ─── گرفتن نام پروژه‌ها و کاربران (batch) ───
  const projectIds = [...new Set(pagedTasks.map(t => t.project_id).filter(Boolean))];
  const userIds = [...new Set(pagedTasks.map(t => t.assigned_to).filter(Boolean))];

  let projectMap = {};
  let userMap = {};

  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title')
      .in('id', projectIds);
    if (projects) {
      for (const p of projects) projectMap[p.id] = p.title;
    }
  }

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', userIds);
    if (users) {
      for (const u of users) userMap[u.id] = u.full_name;
    }
  }

  // ─── ساخت response ───
  const items = pagedTasks.map(t => ({
    task_id: t.id,
    task_title: t.title,
    status: t.status,
    priority: t.priority,
    project_id: t.project_id,
    project_title: projectMap[t.project_id] || null,
    assigned_to: t.assigned_to,
    assigned_to_name: userMap[t.assigned_to] || null,
    due_date: t.due_date,
    days_overdue: Math.ceil((Date.now() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24)),
    created_at: t.created_at,
  }));

  return res.json({
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
    items,
  });
}

// ═══════════════════════════════════════════════════════════════════
// 4. GET /api/reports/tasks/blocked
// ═══════════════════════════════════════════════════════════════════
async function tasksBlocked(req, res, me, scopeResult) {
  const { assigned_to } = req.query || {};

  // ─── گرفتن تسک‌های مسدود ───
  let taskQuery = supabase
    .from('project_tasks')
    .select('id, project_id, title, status, assigned_to, priority, created_at')
    .eq('status', 'BLOCKED');

  taskQuery = applyProjectScope(taskQuery, scopeResult);

  if (assigned_to) {
    taskQuery = taskQuery.eq('assigned_to', assigned_to);
  }

  const { data: blockedTasks, error: taskErr } = await taskQuery;
  if (taskErr) return res.status(500).json({ error: taskErr.message });

  const tasks = blockedTasks || [];

  if (tasks.length === 0) {
    return res.json({ total: 0, items: [] });
  }

  const taskIds = tasks.map(t => t.id);

  // ─── گرفتن blockers ───
  const { data: allBlockers, error: blockerErr } = await supabase
    .from('task_blockers')
    .select('*')
    .in('project_task_id', taskIds)
    .order('created_at', { ascending: false });

  if (blockerErr) return res.status(500).json({ error: blockerErr.message });

  const blockers = allBlockers || [];

  // ─── گروه‌بندی blockers بر اساس task ───
  const blockersByTask = {};
  for (const b of blockers) {
    if (!blockersByTask[b.project_task_id]) blockersByTask[b.project_task_id] = [];
    blockersByTask[b.project_task_id].push(b);
  }

  // ─── گرفتن نام پروژه‌ها و کاربران ───
  const projectIds = [...new Set(tasks.map(t => t.project_id).filter(Boolean))];
  const userIds = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];
  const reporterIds = [...new Set(blockers.map(b => b.reported_by).filter(Boolean))];
  const allUserIds = [...new Set([...userIds, ...reporterIds])];

  let projectMap = {};
  let userMap = {};

  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title')
      .in('id', projectIds);
    if (projects) for (const p of projects) projectMap[p.id] = p.title;
  }

  if (allUserIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', allUserIds);
    if (users) for (const u of users) userMap[u.id] = u.full_name;
  }

  // ─── ساخت response ───
  const items = tasks.map(t => {
    const taskBlockers = blockersByTask[t.id] || [];
    const latestBlockerAt = taskBlockers.length > 0 ? taskBlockers[0].created_at : null;

    return {
      task_id: t.id,
      task_title: t.title,
      status: t.status,
      priority: t.priority,
      project_id: t.project_id,
      project_title: projectMap[t.project_id] || null,
      assigned_to: t.assigned_to,
      assigned_to_name: userMap[t.assigned_to] || null,
      blocker_count: taskBlockers.length,
      latest_blocker_at: latestBlockerAt,
      blockers: taskBlockers.map(b => ({
        id: b.id,
        title: b.title,
        description: b.description,
        severity: b.severity,
        status: b.status,
        reported_by: b.reported_by,
        reported_by_name: userMap[b.reported_by] || null,
        created_at: b.created_at,
      })),
    };
  });

  return res.json({ total: items.length, items });
}

// ═══════════════════════════════════════════════════════════════════
// 5. GET /api/reports/users/performance
// ═══════════════════════════════════════════════════════════════════
async function usersPerformance(req, res, me, scopeResult) {
  const { user_id, from, to } = req.query || {};
  const fromDate = parseDateParam(from);
  const toDate = parseDateParam(to);

  // ─── فقط ادمین مجاز است ───
  if (!isAdmin(me)) {
    return res.status(403).json({ error: 'فقط ادمین به این گزارش دسترسی دارد' });
  }

  // ─── گرفتن همه تسک‌ها ───
  let taskQuery = supabase
    .from('project_tasks')
    .select('id, project_id, assigned_to, status, due_date, created_at, updated_at');

  if (user_id) {
    taskQuery = taskQuery.eq('assigned_to', user_id);
  }

  if (fromDate) taskQuery = taskQuery.gte('created_at', fromDate);
  if (toDate) taskQuery = taskQuery.lte('created_at', toDate);

  const { data: allTasks, error: taskErr } = await taskQuery;
  if (taskErr) return res.status(500).json({ error: taskErr.message });

  const tasks = allTasks || [];
  const now = new Date().toISOString();

  // ─── گرفتن لیست کاربرانی که تسک دارند ───
  const userIds = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];

  if (userIds.length === 0) {
    return res.json({ users: [] });
  }

  // ─── گرفتن اطلاعات کاربران ───
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, full_name, username, system_role')
    .in('id', userIds);

  if (userErr) return res.status(500).json({ error: userErr.message });

  // ─── گرفتن completion times از task_status_history ───
  const taskIds = tasks.filter(t => COMPLETED_STATUSES.includes(t.status)).map(t => t.id);

  let completionTimes = {}; // taskId -> completion time in ms

  if (taskIds.length > 0 && taskIds.length <= 200) {
    // محدودیت: اگر تعداد تسک‌ها زیاد باشد، محاسبه avg را skip کنیم
    const { data: history } = await supabase
      .from('task_status_history')
      .select('project_task_id, status, changed_at')
      .in('project_task_id', taskIds)
      .in('status', COMPLETED_STATUSES)
      .order('changed_at', { ascending: false });

    if (history) {
      // برای هر تسک، اولین رکورد completion را پیدا کن (چون مرتب شده descending)
      const seen = new Set();
      for (const h of history) {
        if (!seen.has(h.project_task_id)) {
          seen.add(h.project_task_id);
          const task = tasks.find(t => t.id === h.project_task_id);
          if (task && h.changed_at) {
            const created = new Date(task.created_at).getTime();
            const completed = new Date(h.changed_at).getTime();
            if (completed > created) {
              completionTimes[h.project_task_id] = completed - created;
            }
          }
        }
      }
    }
  }

  // ─── aggregation per user ───
  const userStats = {};
  for (const t of tasks) {
    const uid = t.assigned_to;
    if (!uid) continue;

    if (!userStats[uid]) {
      userStats[uid] = {
        assigned_count: 0,
        completed_count: 0,
        in_progress_count: 0,
        blocked_count: 0,
        overdue_count: 0,
        cancelled_count: 0,
        completion_times: [],
      };
    }

    const s = userStats[uid];
    s.assigned_count++;

    if (COMPLETED_STATUSES.includes(t.status)) {
      s.completed_count++;
      if (completionTimes[t.id]) {
        s.completion_times.push(completionTimes[t.id]);
      }
    }
    if (t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED' || t.status === 'SEEN' || t.status === 'ACKNOWLEDGED') {
      s.in_progress_count++;
    }
    if (t.status === 'BLOCKED') {
      s.blocked_count++;
    }
    if (t.status === 'CANCELLED') {
      s.cancelled_count++;
    }
    if (t.due_date && t.due_date < now && !TERMINAL_STATUSES.includes(t.status)) {
      s.overdue_count++;
    }
  }

  // ─── ساخت response ───
  const userMap = {};
  for (const u of (users || [])) userMap[u.id] = u;

  const result = Object.entries(userStats).map(([uid, s]) => {
    const user = userMap[uid] || {};
    const avgMs = s.completion_times.length > 0
      ? s.completion_times.reduce((a, b) => a + b, 0) / s.completion_times.length
      : null;

    return {
      user_id: uid,
      full_name: user.full_name || null,
      username: user.username || null,
      system_role: user.system_role || null,
      assigned_count: s.assigned_count,
      completed_count: s.completed_count,
      in_progress_count: s.in_progress_count,
      blocked_count: s.blocked_count,
      overdue_count: s.overdue_count,
      cancelled_count: s.cancelled_count,
      completion_rate: s.assigned_count > 0
        ? Math.round((s.completed_count / s.assigned_count) * 100) / 100
        : 0,
      avg_completion_time_days: avgMs !== null
        ? Math.round(avgMs / (1000 * 60 * 60 * 24) * 10) / 10
        : null, // ⚠️ nullable: اگر task_status_history داده کافی نداشته باشد
    };
  });

  // ─── مرتب‌سازی بر اساس completion_rate (بیشترین اول) ───
  result.sort((a, b) => b.completion_rate - a.completion_rate);

  return res.json({
    report_period: {
      from: fromDate || null,
      to: toDate || null,
    },
    total_users: result.length,
    users: result,
  });
}

// ═══════════════════════════════════════════════════════════════════
// 6. GET /api/reports/meetings/summary
// ═══════════════════════════════════════════════════════════════════
async function meetingsSummary(req, res, me, scopeResult) {
  const { from, to } = req.query || {};
  const fromDate = parseDateParam(from);
  const toDate = parseDateParam(to);

  // ─── گرفتن جلسات ───
  let meetQuery = supabase.from('meetings').select('*');
  meetQuery = applyProjectScope(meetQuery, scopeResult);
  if (fromDate) meetQuery = meetQuery.gte('meeting_date', fromDate);
  if (toDate) meetQuery = meetQuery.lte('meeting_date', toDate);
  meetQuery = meetQuery.order('meeting_date', { ascending: false });

  const { data: meetings, error: meetErr } = await meetQuery;
  if (meetErr) return res.status(500).json({ error: meetErr.message });

  const allMeetings = meetings || [];

  if (allMeetings.length === 0) {
    return res.json({
      total: 0,
      upcoming: 0,
      action_items_open: 0,
      meetings: [],
    });
  }

  // ─── گرفتن action items ───
  const meetingIds = allMeetings.map(m => m.id);
  const { data: allActionItems } = await supabase
    .from('meeting_action_items')
    .select('id, meeting_id, status, created_at')
    .in('meeting_id', meetingIds);

  const actionItems = allActionItems || [];

  // ─── شمارش action items بر اساس status ───
  const aiByMeeting = {};
  for (const ai of actionItems) {
    if (!aiByMeeting[ai.meeting_id]) {
      aiByMeeting[ai.meeting_id] = { total: 0, draft: 0, converted: 0 };
    }
    aiByMeeting[ai.meeting_id].total++;
    if (ai.status === 'DRAFT') aiByMeeting[ai.meeting_id].draft++;
    if (ai.status === 'CONVERTED') aiByMeeting[ai.meeting_id].converted++;
  }

  const now = new Date().toISOString();

  // ─── شمارش جلسات ───
  const upcomingCount = allMeetings.filter(m =>
    m.meeting_date && m.meeting_date >= now
  ).length;

  const totalOpenAI = actionItems.filter(ai => ai.status === 'DRAFT').length;

  // ─── گرفتن نام پروژه‌ها و برگزارکنندگان ───
  const projectIds = [...new Set(allMeetings.map(m => m.project_id).filter(Boolean))];
  const organizerIds = [...new Set(allMeetings.map(m => m.organizer_id).filter(Boolean))];

  let projectMap = {};
  let userMap = {};

  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title')
      .in('id', projectIds);
    if (projects) for (const p of projects) projectMap[p.id] = p.title;
  }

  if (organizerIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', organizerIds);
    if (users) for (const u of users) userMap[u.id] = u.full_name;
  }

  // ─── ساخت response ───
  const meetingList = allMeetings.map(m => {
    const aiStats = aiByMeeting[m.id] || { total: 0, draft: 0, converted: 0 };
    return {
      id: m.id,
      title: m.title,
      project_id: m.project_id,
      project_title: projectMap[m.project_id] || null,
      organizer_id: m.organizer_id,
      organizer_name: userMap[m.organizer_id] || null,
      meeting_date: m.meeting_date,
      is_upcoming: m.meeting_date && m.meeting_date >= now,
      action_items_total: aiStats.total,
      action_items_open: aiStats.draft,
      action_items_converted: aiStats.converted,
      created_at: m.created_at,
    };
  });

  return res.json({
    total: allMeetings.length,
    upcoming: upcomingCount,
    action_items_open: totalOpenAI,
    meetings: meetingList,
  });
}
