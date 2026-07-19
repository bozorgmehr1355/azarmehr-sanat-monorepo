/**
 * _audit.js — کمک‌کننده ثبت رویدادها (Audit Log)
 *
 * قانون طلایی: writeAuditLog هرگز نباید throw کند.
 * اگر ثبت audit fail شد، عملیات اصلی تحت تأثیر قرار نمی‌گیرد.
 *
 * Usage:
 *   const { writeAuditLog } = require('./_audit');
 *   await writeAuditLog(supabase, {
 *     actor_id: me.id,
 *     action: 'create',
 *     entity_type: 'task',
 *     entity_id: data.id,
 *     old_values: null,
 *     new_values: { title, status }
 *   });
 */

const { supabase } = require('./_lib');

/**
 * ثبت یک رکورد در audit_logs.
 *
 * @param {object} client - آبجکت supabase (اختیاری، اگر null باشد از سراسری استفاده می‌شود)
 * @param {object} params
 * @param {string} params.actor_id     - UUID کاربر انجام‌دهنده
 * @param {string} params.action       - نوع عمل: 'create' | 'update' | 'delete' | 'status_change' | 'approve'
 * @param {string} params.entity_type  - نوع موجودیت: 'project' | 'task' | 'meeting' | 'ai_draft' | ...
 * @param {string} params.entity_id    - UUID رکورد مربوطه
 * @param {object|null} params.old_values - مقادیر قبلی (JSON-serializable)
 * @param {object|null} params.new_values - مقادیر جدید (JSON-serializable)
 * @returns {{ ok: boolean, error?: string, skipped?: boolean }}
 */
async function writeAuditLog(client, params) {
  const db = client || supabase;

  // ─── اعتبارسنجی پایه ───
  if (!params || !params.entity_type || !params.action) {
    return { ok: false, skipped: true, error: 'entity_type and action are required' };
  }

  try {
    const row = {
      entity_type: params.entity_type,
      entity_id:   params.entity_id || null,
      action_type: params.action,
      actor_id:    params.actor_id || null,
      old_values:  params.old_values || null,
      new_values:  params.new_values || null,
    };

    const { error } = await db
      .from('audit_logs')
      .insert(row);

    if (error) {
      console.error('[audit] writeAuditLog insert failed:', error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (e) {
    // هرگز throw نکن — فقط لاگ کن
    console.error('[audit] writeAuditLog exception:', e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = { writeAuditLog };
