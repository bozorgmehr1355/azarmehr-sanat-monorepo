/**
 * meeting-minutes.js — مسیرهای API صورت‌جلسات (فاز ۱) — مالک مسیر /api/meetings
 *
 *   POST  /api/meetings                     → ثبت صورت‌جلسه جدید (admin)
 *   GET   /api/meetings                     → لیست صورت‌جلسات
 *   GET   /api/meetings/:id                 → جزئیات صورت‌جلسه
 *   POST  /api/meetings/:id/convert-action-item → تبدیل اکشن‌آیتم به تسک رسمی (admin)
 */

const { cors, requireAuth, requireAdmin } = require('./_lib');
const { logAudit } = require('../services/_audit');
const {
  createMeetingMinute,
  getMeetingMinutes,
  getMeetingMinute,
  convertActionItemToTask,
} = require('../services/meetingService');
const {
  validate,
  validateUuid,
  meetingCreateSchema,
  convertActionItemSchema,
} = require('../services/validation');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    requireAuth(req);

    const pathname = (req.url || '').split('?')[0];
    const parts = pathname.split('/').filter(Boolean); // e.g. ['api', 'meetings', 'uuid', 'convert-action-item']
    const segments = parts.slice(2); // حذف 'api' و 'meetings'

    // ─── /api/meetings/:id/... ───
    if (segments.length >= 1 && segments[0]) {
      const meetingId = validateUuid(segments[0], 'شناسه صورت‌جلسه');
      const sub = segments[1];

      // GET /api/meetings/:id
      if (req.method === 'GET' && !sub) {
        const meeting = await getMeetingMinute(meetingId);
        return res.json(meeting);
      }

      // POST /api/meetings/:id/convert-action-item
      if (req.method === 'POST' && sub === 'convert-action-item') {
        requireAdmin(req);
        const me = requireAuth(req);
        const body = validate(convertActionItemSchema, req.body || {});
        const task = await convertActionItemToTask(meetingId, body.actionItemIndex, body.assigneeId || me.id);

        await logAudit({
          entityType: 'meeting_minutes',
          entityId: meetingId,
          action: 'action_item_converted_to_task',
          actorId: me.id,
          changes: { action_item_index: body.actionItemIndex, task_id: task.id },
        });

        return res.status(201).json({ task, meeting_id: meetingId });
      }

      return res.status(405).json({ error: 'متد یا مسیر مجاز نیست' });
    }

    // ─── /api/meetings ───
    if (req.method === 'GET') {
      const minutes = await getMeetingMinutes();
      return res.json(minutes);
    }

    if (req.method === 'POST') {
      requireAdmin(req);
      const me = requireAuth(req);
      const body = validate(meetingCreateSchema, req.body || {});
      const meeting = await createMeetingMinute({
        title: body.title,
        raw_notes: body.rawNotes,
        summary: body.summary || null,
        decisions: body.decisions || [],
        action_items: body.actionItems || [],
        session_date: body.sessionDate || undefined,
        created_by: body.createdBy || me.id,
      });

      await logAudit({
        entityType: 'meeting_minutes',
        entityId: meeting.id,
        action: 'meeting_created',
        actorId: me.id,
        changes: { title: meeting.title },
      });

      return res.status(201).json(meeting);
    }

    return res.status(405).json({ error: 'متد مجاز نیست' });

  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
