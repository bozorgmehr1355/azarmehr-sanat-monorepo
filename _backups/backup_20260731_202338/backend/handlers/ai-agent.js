/**
 * ai-agent.js — مسیرهای API موتور Omnichannel AI Agent (فاز ۱)
 *
 *   POST  /api/ai-agent/process-notes             → استخراج از متن خام و ذخیره پیش‌نویس (DRAFT)
 *   POST  /api/ai-agent/drafts/:id/approve        → تأیید انسانی و تبدیل به رکورد رسمی (admin)
 *   POST  /api/ai-agent/drafts/:id/reject         → رد پیش‌نویس (admin)
 */

const { cors, requireAuth, requireAdmin } = require('./_lib');
const {
  processMeetingNotesToDraft,
  approveDraft,
  rejectDraft,
} = require('../services/aiAgentService');
const {
  validate,
  validateUuid,
  processNotesSchema,
  approveDraftSchema,
  rejectDraftSchema,
} = require('../services/validation');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    requireAuth(req);

    const pathname = (req.url || '').split('?')[0];
    const parts = pathname.split('/').filter(Boolean); // e.g. ['api', 'ai-agent', 'drafts', 'uuid', 'approve']
    const segments = parts.slice(2); // حذف 'api' و 'ai-agent'

    // ─── /api/ai-agent/drafts/:id/approve|reject ───
    if (segments.length >= 3 && segments[0] === 'drafts' && segments[1]) {
      requireAdmin(req);
      const me = requireAuth(req);
      const draftId = validateUuid(segments[1], 'شناسه پیش‌نویس');
      const action = segments[2];

      if (req.method === 'POST' && action === 'approve') {
        const body = validate(approveDraftSchema, req.body || {});
        const result = await approveDraft(draftId, body.approvedBy || me.id);
        return res.json(result);
      }

      if (req.method === 'POST' && action === 'reject') {
        const body = validate(rejectDraftSchema, req.body || {});
        const draft = await rejectDraft(draftId, body.reason || null);
        return res.json(draft);
      }

      return res.status(405).json({ error: 'متد یا مسیر مجاز نیست' });
    }

    // ─── /api/ai-agent/process-notes ───
    if (segments.length === 1 && segments[0] === 'process-notes') {
      if (req.method === 'POST') {
        const me = requireAuth(req);
        const body = validate(processNotesSchema, req.body || {});
        const draft = await processMeetingNotesToDraft(body.rawNotes);
        return res.status(201).json({ draft, note: 'پیش‌نویس با وضعیت DRAFT ذخیره شد و در انتظار تأیید انسانی است' });
      }
      return res.status(405).json({ error: 'متد مجاز نیست' });
    }

    return res.status(405).json({ error: 'متد یا مسیر مجاز نیست' });

  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
