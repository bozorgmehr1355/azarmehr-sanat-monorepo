/**
 * aiAgentService.js — موتور Omnichannel AI Agent (فاز ۱)
 *
 * قوانین حاکمیتی:
 *  - خروجی AI هرگز مستقیم در جدول رسمی (meeting_minutes / tasks) ذخیره نمی‌شود؛
 *    ابتدا در ai_drafts با وضعیت DRAFT ذخیره و سپس با تأیید انسان (approveDraft)
 *    به رکورد رسمی تبدیل می‌شود.
 *  - در نبود provider پیکربندی‌شده، استخراج به‌صورت قطعی (rule-based) انجام می‌شود
 *    تا جریان end-to-end بدون سرویس خارجی قابل تست باشد.
 *
 * متغیرهای محیطی اختیاری: AI_PROVIDER_URL، AI_PROVIDER_KEY، AI_PROVIDER_MODEL
 */

const { supabase } = require('../handlers/_lib');

const DRAFT_STATUS = 'DRAFT';
const APPROVED_STATUS = 'APPROVED';
const REJECTED_STATUS = 'REJECTED';

const AI_PROVIDER_URL = process.env.AI_PROVIDER_URL || '';
const AI_PROVIDER_KEY = process.env.AI_PROVIDER_KEY || '';
const AI_PROVIDER_MODEL = process.env.AI_PROVIDER_MODEL || '';

// ─── ثبت audit (اسکیمای فاز ۱: action / changes) ──────────────────
async function logAudit({ entityType, entityId, action, actorId, changes }) {
  const { error } = await supabase.from('audit_logs').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_id: actorId || null,
    changes: changes || null,
  });
  if (error) {
    console.error('[aiAgent] audit insert failed:', error.message);
  }
}

// ─── استخراج بدون مدل خارجی (fallback قطعی) ────────────────────────
function fallbackExtract(rawNotes) {
  const lines = String(rawNotes || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const decisions = [];
  const actionItems = [];

  for (const line of lines) {
    const clean = line.replace(/^[-*•]\s*/, '');
    if (/^تصمیم/i.test(clean)) {
      decisions.push(clean.replace(/^تصمیم\s*[:：\-]?\s*/i, '').trim());
    } else if (/^اقدام/i.test(clean)) {
      const title = clean.replace(/^اقدام\s*[:：\-]?\s*/i, '').trim();
      if (title) actionItems.push({ title, description: null });
    }
  }

  // در صورت نبود نشانه‌گذار صریح، کل متن به عنوان خلاصه در نظر گرفته می‌شود
  let summary = lines.join(' ');
  if (summary.length > 300) summary = summary.slice(0, 297) + '…';

  return {
    summary: summary || '',
    decisions,
    actionItems,
  };
}

// ─── فراخوانی مدل LLM (در صورت پیکربندی) ───────────────────────────
async function extractWithProvider(rawNotes) {
  const prompt = [
    'متن خام صورت‌جلسه زیر را تحلیل کن و خروجی را دقیقاً به صورت JSON با این ساختار برگردان:',
    '{"summary": "خلاصه جلسه به فارسی", "decisions": ["تصمیم ۱", "تصمیم ۲"], "action_items": [{"title": "عنوان اقدام", "description": "توضیح", "due_date": "ISO یا خالی", "priority": "LOW|MEDIUM|HIGH|CRITICAL یا خالی"}]}',
    '',
    'متن خام:',
    '"""' + rawNotes + '"""',
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(AI_PROVIDER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(AI_PROVIDER_KEY ? { Authorization: `Bearer ${AI_PROVIDER_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: AI_PROVIDER_MODEL || 'default',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      throw new Error(`خطای سرویس مدل (HTTP ${res.status})`);
    }

    const body = await res.json();
    // خروجی می‌تواند مستقیم JSON باشد یا در فیلد content/text
    let content = body;
    if (typeof body.content === 'string') content = JSON.parse(body.content);
    if (typeof body.text === 'string') content = JSON.parse(body.text);
    if (body.choices && body.choices[0]) {
      const msg = body.choices[0].message || body.choices[0].text || '';
      content = typeof msg === 'string' ? JSON.parse(msg) : msg;
    }

    return {
      summary: String(content.summary || ''),
      decisions: Array.isArray(content.decisions) ? content.decisions : [],
      actionItems: Array.isArray(content.action_items) ? content.action_items : [],
    };
  } catch (e) {
    throw new Error(`فراخوانی مدل هوش مصنوعی ناموفق بود: ${e.message}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * استخراج خلاصه، تصمیم‌ها و اکشن‌آیتم‌ها از متن خام صورت‌جلسه
 * و ذخیره در جدول ai_drafts با وضعیت DRAFT.
 *
 * @param {string} rawNotes متن خام صورت‌جلسه یا گفتگو
 */
async function processMeetingNotesToDraft(rawNotes) {
  const extracted = AI_PROVIDER_URL
    ? await extractWithProvider(rawNotes)
    : fallbackExtract(rawNotes);

  const { data: draft, error } = await supabase
    .from('ai_drafts')
    .insert({
      entity_type: 'meeting_minutes',
      draft_type: 'meeting_summary',
      input_text: rawNotes || '',
      summary: extracted.summary || null,
      decisions: extracted.decisions || [],
      action_items: extracted.actionItems || [],
      status: DRAFT_STATUS,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`ذخیره پیش‌نویس در ai_drafts ناموفق بود: ${error.message}`);
  }

  await logAudit({
    entityType: 'ai_draft',
    entityId: draft.id,
    action: 'ai_draft_created',
    changes: { draft_type: 'meeting_summary', status: DRAFT_STATUS },
  });

  return draft;
}

/**
 * تأیید پیش‌نویس توسط انسان و تبدیل آن به رکورد رسمی صورت‌جلسه.
 *
 * @param {string} draftId
 * @param {string} approvedBy UUID کاربر تأییدکننده
 */
async function approveDraft(draftId, approvedBy) {
  // ۱) دریافت و بررسی وضعیت پیش‌نویس
  const { data: draft, error: fetchErr } = await supabase
    .from('ai_drafts')
    .select()
    .eq('id', draftId)
    .single();

  if (fetchErr) {
    throw new Error(`پیش‌نویس یافت نشد: ${fetchErr.message}`);
  }
  if (!draft) {
    const err = new Error('پیش‌نویس یافت نشد');
    err.status = 404;
    throw err;
  }
  if (draft.status !== DRAFT_STATUS) {
    const err = new Error(`این پیش‌نویس قبلاً ${draft.status} شده است`);
    err.status = 400;
    throw err;
  }

  // ۲) به‌روزرسانی وضعیت به APPROVED
  const { data: approved, error: updateErr } = await supabase
    .from('ai_drafts')
    .update({
      status: APPROVED_STATUS,
      approved_by: approvedBy || null,
      processed_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .select()
    .single();

  if (updateErr) {
    throw new Error(`تأیید پیش‌نویس ناموفق بود: ${updateErr.message}`);
  }

  // ۳) تبدیل به رکورد رسمی صورت‌جلسه (فقط پس از موفقیت تأیید)
  const title = (draft.summary || '').slice(0, 80) || 'خلاصه جلسه';
  const { data: meeting, error: meetingErr } = await supabase
    .from('meeting_minutes')
    .insert({
      title,
      raw_notes: draft.input_text || '',
      summary: draft.summary || null,
      decisions: draft.decisions || [],
      action_items: draft.action_items || [],
      created_by: draft.created_by || approvedBy || null,
    })
    .select()
    .single();

  if (meetingErr) {
    throw new Error(`تبدیل پیش‌نویس به صورت‌جلسه رسمی ناموفق بود: ${meetingErr.message}`);
  }

  await logAudit({
    entityType: 'meeting_minutes',
    entityId: meeting.id,
    action: 'ai_draft_approved',
    actorId: approvedBy,
    changes: { draft_id: draftId },
  });

  return { draft: approved, meeting };
}

/**
 * رد پیش‌نویس و به‌روزرسانی وضعیت در ai_drafts.
 *
 * @param {string} draftId
 * @param {string} [reason] دلیل رد (اختیاری)
 */
async function rejectDraft(draftId, reason) {
  const { data: draft, error: fetchErr } = await supabase
    .from('ai_drafts')
    .select()
    .eq('id', draftId)
    .single();

  if (fetchErr) {
    throw new Error(`پیش‌نویس یافت نشد: ${fetchErr.message}`);
  }
  if (!draft) {
    const err = new Error('پیش‌نویس یافت نشد');
    err.status = 404;
    throw err;
  }
  if (draft.status !== DRAFT_STATUS) {
    const err = new Error(`این پیش‌نویس قبلاً ${draft.status} شده است`);
    err.status = 400;
    throw err;
  }

  const { data: rejected, error: updateErr } = await supabase
    .from('ai_drafts')
    .update({
      status: REJECTED_STATUS,
      rejection_reason: reason || null,
      processed_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .select()
    .single();

  if (updateErr) {
    throw new Error(`رد پیش‌نویس ناموفق بود: ${updateErr.message}`);
  }

  await logAudit({
    entityType: 'ai_draft',
    entityId: draftId,
    action: 'ai_draft_rejected',
    changes: { reason: reason || null },
  });

  return rejected;
}

module.exports = {
  processMeetingNotesToDraft,
  approveDraft,
  rejectDraft,
  fallbackExtract,
  DRAFT_STATUS,
  APPROVED_STATUS,
  REJECTED_STATUS,
};
