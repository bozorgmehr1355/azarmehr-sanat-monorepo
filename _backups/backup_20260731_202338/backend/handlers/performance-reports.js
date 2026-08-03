const { supabase, cors, requireAdmin } = require('./_lib');

const COMPLETED_STATUSES = ['APPROVED', 'ARCHIVED'];

function toIsoDate(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return trimmed.slice(0, 10);
}

function roundTo(value, digits) {
  if (value == null || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    requireAdmin(req);

    const { userId, startDate, endDate } = req.body || {};
    const normalizedStartDate = toIsoDate(startDate);
    const normalizedEndDate = toIsoDate(endDate);

    if (!userId || !normalizedStartDate || !normalizedEndDate) {
      return res.status(400).json({
        error: 'userId, startDate, and endDate are required'
      });
    }

    if (normalizedStartDate > normalizedEndDate) {
      return res.status(400).json({
        error: 'startDate must be less than or equal to endDate'
      });
    }

    const rangeStart = `${normalizedStartDate}T00:00:00.000Z`;
    const rangeEnd = `${normalizedEndDate}T23:59:59.999Z`;

    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, status, created_at, due_date, assigned_to')
      .eq('assigned_to', userId)
      .gte('created_at', rangeStart)
      .lte('created_at', rangeEnd);

    if (tasksError) {
      return res.status(500).json({ error: tasksError.message });
    }

    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const totalTasks = safeTasks.length;
    const completedTasksList = safeTasks.filter((task) =>
      COMPLETED_STATUSES.includes(task.status)
    );
    const completedTaskIds = completedTasksList.map((task) => task.id);

    let statusHistoryByTaskId = new Map();

    if (completedTaskIds.length > 0) {
      // ⚠️ ستون‌های واقعی task_status_history: project_task_id و status
      // (نه task_id / to_status) — منطبق با create-projects-tasks.sql و reports.js:637
      const { data: statusHistoryRows, error: statusHistoryError } = await supabase
        .from('task_status_history')
        .select('project_task_id, status, changed_at')
        .in('project_task_id', completedTaskIds)
        .in('status', COMPLETED_STATUSES)
        .order('changed_at', { ascending: true });

      if (statusHistoryError) {
        return res.status(500).json({ error: statusHistoryError.message });
      }

      for (const row of statusHistoryRows || []) {
        if (!statusHistoryByTaskId.has(row.project_task_id)) {
          statusHistoryByTaskId.set(row.project_task_id, row);
        }
      }
    }

    let completionHoursSum = 0;
    let completionHoursCount = 0;
    let approvedCount = 0;
    let archivedCount = 0;
    let missingCompletionHistoryCount = 0;

    for (const task of completedTasksList) {
      if (task.status === 'APPROVED') approvedCount += 1;
      if (task.status === 'ARCHIVED') archivedCount += 1;

      const completionEvent = statusHistoryByTaskId.get(task.id);
      if (!completionEvent) {
        missingCompletionHistoryCount += 1;
        continue;
      }

      const createdAtMs = new Date(task.created_at).getTime();
      const completedAtMs = new Date(completionEvent.changed_at).getTime();

      if (Number.isNaN(createdAtMs) || Number.isNaN(completedAtMs) || completedAtMs < createdAtMs) {
        continue;
      }

      completionHoursSum += (completedAtMs - createdAtMs) / (1000 * 60 * 60);
      completionHoursCount += 1;
    }

    const completedTasks = completedTasksList.length;
    const avgCompletionTimeHours =
      completionHoursCount > 0 ? roundTo(completionHoursSum / completionHoursCount, 2) : null;
    const qualityScore =
      totalTasks > 0 ? roundTo((completedTasks / totalTasks) * 100, 2) : null;

    const rawData = {
      completed_statuses: COMPLETED_STATUSES,
      approved_count: approvedCount,
      archived_count: archivedCount,
      missing_completion_history_count: missingCompletionHistoryCount,
      completion_time_sample_size: completionHoursCount,
      filtered_by: {
        assigned_to: userId,
        created_at_gte: rangeStart,
        created_at_lte: rangeEnd
      }
    };

    const payload = {
      user_id: userId,
      start_date: normalizedStartDate,
      end_date: normalizedEndDate,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      avg_completion_time_hours: avgCompletionTimeHours,
      quality_score: qualityScore,
      raw_data: rawData,
      computed_at: new Date().toISOString()
    };

    const { data: savedScore, error: upsertError } = await supabase
      .from('performance_scores')
      .upsert(payload, {
        onConflict: 'user_id,start_date,end_date'
      })
      .select()
      .single();

    if (upsertError) {
      return res.status(500).json({ error: upsertError.message });
    }

    return res.status(200).json({
      success: true,
      data: savedScore,
      summary: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        avg_completion_time_hours: avgCompletionTimeHours,
        quality_score: qualityScore
      }
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Internal server error' });
  }
};
