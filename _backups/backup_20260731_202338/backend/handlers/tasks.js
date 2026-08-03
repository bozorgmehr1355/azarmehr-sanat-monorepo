/**
 * tasks.js — مسیرهای API تسک‌ها و شواهد (فاز ۱)
 *
 *   POST   /api/tasks                        → ایجاد تسک (admin)
 *   GET    /api/tasks                        → لیست تسک‌ها با فیلتر
 *   GET    /api/tasks/:id                    → جزئیات تسک + شواهد
 *   PATCH  /api/tasks/:id/status             → تغییر وضعیت تسک
 *   POST   /api/tasks/:id/evidence           → ثبت شاهد جدید
 */

const { cors, requireAuth, requireAdmin } = require('./_lib');
const {
  createTask,
  updateTaskStatus,
  addTaskEvidence,
  getTaskWithEvidences,
  getTasks,
} = require('../services/taskService');
const {
  validate,
  validateUuid,
  taskCreateSchema,
  taskStatusSchema,
  evidenceSchema,
  tasksQuerySchema,
} = require('../services/validation');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    requireAuth(req);

    const pathname = (req.url || '').split('?')[0];
    const parts = pathname.split('/').filter(Boolean); // e.g. ['api', 'tasks', 'uuid', 'status']
    const segments = parts.slice(2); // حذف 'api' و 'tasks'

    // ─── /api/tasks/:id/:action ───
    if (segments.length >= 2 && segments[0]) {
      const taskId = validateUuid(segments[0], 'شناسه تسک');
      const action = segments[1];

      // PATCH /api/tasks/:id/status
      if (req.method === 'PATCH' && action === 'status') {
        const { newStatus, actorId } = validate(taskStatusSchema, req.body || {});
        const me = requireAuth(req);
        const task = await updateTaskStatus(taskId, newStatus, actorId || me.id);
        return res.json(task);
      }

      // POST /api/tasks/:id/evidence
      if (req.method === 'POST' && action === 'evidence') {
        const body = validate(evidenceSchema, { ...(req.body || {}), taskId });
        const evidence = await addTaskEvidence({
          task_id: taskId,
          evidence_type: body.evidenceType,
          content_url: body.contentUrl || null,
          notes: body.notes || null,
          submitted_by: body.submittedBy || null,
        });
        return res.status(201).json(evidence);
      }

      return res.status(405).json({ error: 'متد یا مسیر مجاز نیست' });
    }

    // ─── /api/tasks/:id (GET) ───
    if (segments.length === 1 && segments[0]) {
      const taskId = validateUuid(segments[0], 'شناسه تسک');
      if (req.method === 'GET') {
        const result = await getTaskWithEvidences(taskId);
        return res.json(result);
      }
      return res.status(405).json({ error: 'متد مجاز نیست' });
    }

    // ─── /api/tasks ───
    if (req.method === 'GET') {
      const query = validate(tasksQuerySchema, {
        status: req.query.status || undefined,
        assigneeId: req.query.assigneeId || req.query.assignee_id || undefined,
        orderId: req.query.orderId || req.query.order_id || undefined,
      });
      const tasks = await getTasks(query);
      return res.json(tasks);
    }

    if (req.method === 'POST') {
      requireAdmin(req);
      const me = requireAuth(req);
      const body = validate(taskCreateSchema, req.body || {});
      const task = await createTask({
        title: body.title,
        description: body.description || null,
        assignee_id: body.assigneeId || null,
        created_by: body.createdBy || me.id,
        customer_id: body.customerId || null,
        order_id: body.orderId || null,
        due_date: body.dueDate || null,
        priority: body.priority || 'MEDIUM',
      });
      return res.status(201).json(task);
    }

    return res.status(405).json({ error: 'متد مجاز نیست' });

  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
