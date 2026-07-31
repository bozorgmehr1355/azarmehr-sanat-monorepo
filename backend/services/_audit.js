/**
 * _audit.js (فاز ۱) — ثبت رویداد در جدول audit_logs با اسکیمای فاز ۱
 *
 * ⚠️ این هلپر با اسکیمای جدید (action / changes) سازگار است و نباید با
 *    backend/handlers/_audit.js (اسکیمای legacy: action_type / old_values)
 *    اشتباه گرفته شود.
 *
 * قانون طلایی: logAudit هرگز throw نمی‌کند — شکست audit روی عملیات اصلی اثر ندارد.
 */

const { supabase } = require('../handlers/_lib');

async function logAudit({ entityType, entityId, action, actorId, changes }) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      entity_type: entityType,
      entity_id: entityId || null,
      action,
      actor_id: actorId || null,
      changes: changes || null,
    });
    if (error) {
      console.error('[audit-phase1] insert failed:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error('[audit-phase1] exception:', e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = { logAudit };
