// growth-drafts.js — POST /api/growth/drafts (Slice-1 handoff, no-send)
//
// Safe handoff from the Growth Intervention decision output to an ai_drafts
// record with approval_status = 'PENDING'.
//
// - Requires existing backend auth (Bearer JWT via requireAuth).
// - Refuses to create a draft unless decision === 'SEND_ALLOWED'.
// - Creates exactly one PENDING ai_drafts row (reusing the ai-drafts schema).
// - Audit fields (reason_code, reason_message, evidence, customer_id,
//   conversation_id, channel, template key/text) are stored inside
//   input_text / output_text JSON — NO schema migration.
// - Never sends any WhatsApp/Bale message. Never calls whatsapp-broadcast-api.
//
// The global express.json() parser skips /api/growth paths (see api/index.js
// and server.js), so this handler owns raw-body parsing and returns a clean
// 400 on missing/malformed bodies — exactly like growth-decide.js.

'use strict';

const { supabase, cors, requireAuth } = require('./_lib');
const { writeAuditLog } = require('./_audit');

const DECISION_SEND_ALLOWED = 'SEND_ALLOWED';
const TEMPLATE_KEY = 'growth.whatsapp.hesitation_after_referral.v1';

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1e6) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.resume();
        return;
      }
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', (err) => reject(err));
  });
}

function jsonError(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method === 'OPTIONS') return; // cors already ended response
  if (req.method !== 'POST') return jsonError(res, 405, 'METHOD_NOT_ALLOWED');

  // Auth: existing backend Bearer-JWT pattern. Fail-closed.
  let me;
  try {
    me = requireAuth(req);
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message || 'Unauthorized' });
  }

  let body;
  try {
    const raw = await readRawBody(req);
    if (raw == null || raw.trim() === '') {
      return jsonError(res, 400, 'INVALID_REQUEST');
    }
    body = JSON.parse(raw);
  } catch (e) {
    return jsonError(res, 400, 'INVALID_REQUEST');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError(res, 400, 'INVALID_REQUEST');
  }

  const decision = body.decision;

  // Only SEND_ALLOWED may produce a draft. BLOCKED / REQUIRE_APPROVAL => no draft.
  if (decision !== DECISION_SEND_ALLOWED) {
    return res.status(422).json({
      ok: false,
      decision: decision || null,
      approval_status: 'n/a',
      sent: false,
      draft_id: null,
      error: 'DECISION_NOT_SEND_ALLOWED',
    });
  }

  // Preserve template key exactly as defined in growth-decision.js.
  const template = body.template && typeof body.template === 'object' ? body.template : {};
  const templateKey = template.key || TEMPLATE_KEY;
  const templateText = typeof template.text === 'string' ? template.text : '';

  // Audit fields packed into input_text / output_text JSON — no schema change.
  const inputText = JSON.stringify({
    customer_id: body.customer_id != null ? String(body.customer_id) : null,
    conversation_id: body.conversation_id != null ? String(body.conversation_id) : null,
    channel: body.channel || 'whatsapp',
    reason_code: body.reason_code || null,
    reason_message: body.reason_message || null,
    evidence: body.evidence || null,
    template_key: templateKey,
  });

  const { data, error } = await supabase
    .from('ai_drafts')
    .insert({
      entity_type: 'growth_intervention',
      entity_id: null,
      draft_type: 'whatsapp_message',
      input_text: inputText,
      output_text: templateText,
      created_by: me.id,
      approval_status: 'PENDING',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ ok: false, error: error.message });

  await writeAuditLog(supabase, {
    actor_id: me.id,
    action: 'create',
    entity_type: 'ai_draft',
    entity_id: data.id,
    old_values: null,
    new_values: {
      entity_type: 'growth_intervention',
      draft_type: 'whatsapp_message',
      approval_status: 'PENDING',
      template_key: templateKey,
    },
  });

  return res.status(201).json({
    ok: true,
    draft_id: data.id,
    approval_status: 'PENDING',
    sent: false,
  });
};
