/**
 * Bale Webhook Handler — Pure Omnichannel Adapter
 * ===============================================
 *
 * مطابق OMNICHANNEL_AI_AGENT_BLUEPRINT و SERVICE_CONTRACTS.md §7:
 * - این adapter فقط normalize → call orchestrator → render می‌کند
 * - هیچ business logic (intent detection, product search, AI) در این فایل نیست
 * - وابستگی به backend orchestrator از طریق HTTP POST انجام می‌شود
 *
 * جریان:
 *   Bale Bot Update → normalizeBaleUpdate → NormalizedRequest
 *   → POST /api/message-orchestrator → ResponseModel
 *   → renderBaleMessage → Bale API-ready payload
 *
 * @see ./bale-text-renderer.js
 * @see ../backend/handlers/message-orchestrator.js (processMessage)
 */

'use strict';

const { renderBaleMessage } = require('./bale-text-renderer');

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────

const ORCHESTRATOR_URL =
  process.env.ORCHESTRATOR_URL ||
  'http://localhost:3000/api/message-orchestrator';

const ORCHESTRATOR_TIMEOUT_MS = Number(process.env.ORCHESTRATOR_TIMEOUT_MS) || 10000;

// ────────────────────────────────────────────────────────────
// Idempotency — in-memory deduplication
// ────────────────────────────────────────────────────────────

const _dedupSet = new Set();
const DEDUP_TTL_MS = 5 * 60 * 1000; // ۵ دقیقه

/**
 * بررسی و ثبت update_id برای جلوگیری از پردازش تکراری
 * (در حد process lifetime — بعد از restart ریست می‌شود)
 * @param {number|string} updateId
 * @returns {boolean} true اگر قبلاً پردازش شده
 */
function isDuplicateUpdate(updateId) {
  const key = String(updateId);
  if (_dedupSet.has(key)) return true;
  _dedupSet.add(key);
  // پاک‌سازی خودکار بعد از TTL
  setTimeout(() => _dedupSet.delete(key), DEDUP_TTL_MS);
  return false;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function generateCorrelationId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `bale_${ts}_${rand}`;
}

/**
 * HTTP POST به backend orchestrator
 * @param {Object} normalizedRequest
 * @returns {Promise<Object>} ResponseModel
 */
async function callOrchestrator(normalizedRequest) {
  const url = new URL(ORCHESTRATOR_URL);
  const httpModule = url.protocol === 'https:' ? require('https') : require('http');

  return new Promise((resolve, reject) => {
    const body = JSON.stringify(normalizedRequest);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Accept': 'application/json',
      },
      timeout: ORCHESTRATOR_TIMEOUT_MS,
    };

    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`orchestrator_http_${res.statusCode}: ${parsed?.metadata?.error || parsed?.error || 'unknown'}`));
          }
        } catch (parseErr) {
          reject(new Error(`orchestrator_invalid_response: ${parseErr.message}`));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`orchestrator_request_failed: ${err.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('orchestrator_timeout')); });

    req.write(body);
    req.end();
  });
}

/**
 * بررسی صحت ساختار ResponseModel برگشتی از orchestrator
 * @param {Object} response
 * @returns {string|null} null اگر معتبر است، در غیر این صورت پیغام خطا
 */
function validateOrchestratorResponse(response) {
  if (!response || typeof response !== 'object') {
    return 'invalid_response_shape';
  }
  if (typeof response.recipientId !== 'string' && response.recipientId !== null) {
    return 'invalid_recipient_id';
  }
  if (typeof response.messageType !== 'string') {
    return 'invalid_message_type';
  }
  if (typeof response.text !== 'string') {
    return 'invalid_text';
  }
  if (!Array.isArray(response.attachments)) {
    return 'invalid_attachments';
  }
  return null;
}

// ────────────────────────────────────────────────────────────
// Normalize Bale Bot Update → NormalizedRequest
// ────────────────────────────────────────────────────────────

/**
 * Bale Bot API webhook update structure:
 * {
 *   update_id: number,
 *   message?: {
 *     message_id: number,
 *     from: { id: number, first_name?: string, last_name?: string, username?: string, ... },
 *     chat: { id: number, type: 'private'|'group'|'supergroup'|'channel', ... },
 *     date: number,  // unix timestamp
 *     text?: string,
 *     caption?: string,
 *     photo?: Array<{file_id, file_unique_id, width, height, file_size?}>,
 *     document?: { file_id, file_name?, mime_type?, ... },
 *     voice?: { file_id, duration, ... },
 *     reply_to_message?: { ... },
 *     ...
 *   }
 * }
 *
 * @param {Object} update  — raw webhook body from Bale
 * @returns {Object} NormalizedRequest
 */
function normalizeBaleUpdate(update) {
  if (!update || typeof update !== 'object') {
    return null;
  }

  const message = update.message || update.edited_message || update.channel_post || null;
  if (!message) {
    // ممکن است update از نوع callback_query یا inline_query باشد
    // در این نسخه فقط messageها پردازش می‌شوند
    return null;
  }

  const updateId = update.update_id;
  const sender = message.from || {};
  const chat = message.chat || {};

  // ── senderId: اولویت با chat.id (برای private و group) ──
  const senderIdRaw = sender.id || chat.id || null;
  if (!senderIdRaw) return null;

  const senderId = String(senderIdRaw);

  // ── recipientId: آی‌دی ربات ──
  const recipientId = message.via_bot?.id
    ? String(message.via_bot.id)
    : null;

  // ── متن ──
  const text = message.text || message.caption || '';

  // ── پیوست‌ها ──
  const attachments = [];
  if (message.photo && Array.isArray(message.photo)) {
    const biggest = message.photo.reduce((a, b) => (a.width * a.height > b.width * b.height ? a : b));
    attachments.push({
      type: 'image',
      url: biggest.file_id,     // file_id — برای دانلود باید از Bot API getFile استفاده کرد
      name: `photo_${biggest.file_unique_id || ''}`,
      metadata: { width: biggest.width, height: biggest.height },
    });
  }
  if (message.document) {
    attachments.push({
      type: 'document',
      url: message.document.file_id,
      name: message.document.file_name || `doc_${message.document.file_unique_id || ''}`,
      metadata: { mime_type: message.document.mime_type, file_size: message.document.file_size },
    });
  }
  if (message.voice) {
    attachments.push({
      type: 'voice',
      url: message.voice.file_id,
      name: null,
      metadata: { duration: message.voice.duration },
    });
  }
  if (message.sticker) {
    attachments.push({
      type: 'sticker',
      url: message.sticker.file_id,
      name: null,
      metadata: { emoji: message.sticker.emoji || null },
    });
  }

  return {
    channel: 'bale',
    messageType: attachments.length > 0 ? (message.voice ? 'voice' : 'media') : 'text',
    senderId,
    recipientId,
    timestamp: message.date
      ? new Date(message.date * 1000).toISOString()
      : new Date().toISOString(),
    text,
    attachments,
    context: {
      update_id: updateId,
      chat_id: chat.id ? String(chat.id) : null,
      user_id: sender.id ? String(sender.id) : null,
      chat_type: chat.type || null,
      message_id: message.message_id || null,
      raw_event: update,
    },
    correlation_id: generateCorrelationId(),
  };
}

// ────────────────────────────────────────────────────────────
// Main Handler
// ────────────────────────────────────────────────────────────

/**
 * پردازش کامل یک webhook update از Bale
 *
 * @param {Object} baleUpdate  — raw body از Bale Bot API webhook
 * @returns {Promise<Object>} نتیجه پردازش:
 *   {
 *     ok: boolean,
 *     correlation_id: string,
 *     baleResponse?: { text, parse_mode?, reply_markup? },
 *     error?: string,
 *     skipped?: boolean,   // true اگر به‌دلیل dedup یا invalid نادیده گرفته شد
 *   }
 */
async function handleBaleWebhook(baleUpdate) {
  // ── 1. Idempotency ──────────────────────────────────
  const updateId = baleUpdate?.update_id;
  if (updateId != null && isDuplicateUpdate(updateId)) {
    return {
      ok: true,
      correlation_id: null,
      skipped: true,
      detail: 'duplicate_update',
    };
  }

  // ── 2. Normalize ────────────────────────────────────
  let normalizedRequest;
  try {
    normalizedRequest = normalizeBaleUpdate(baleUpdate);
  } catch (normErr) {
    return {
      ok: false,
      correlation_id: null,
      error: 'normalization_failed',
      detail: process.env.NODE_ENV === 'development' ? normErr.message : undefined,
    };
  }

  if (!normalizedRequest) {
    return {
      ok: true,
      correlation_id: null,
      skipped: true,
      detail: 'unsupported_update_type',
    };
  }

  const correlationId = normalizedRequest.correlation_id;

  // ── 3. Call orchestrator ────────────────────────────
  let orchestratorResponse;
  try {
    orchestratorResponse = await callOrchestrator(normalizedRequest);
  } catch (orchErr) {
    console.error(`[bale-webhook] orchestrator call failed | corr=${correlationId} | ${orchErr.message}`);
    // fallback مطمئن — بدون stack trace
    return {
      ok: true,   // هنوز به Bale OK برمی‌گردانیم تا webhook دوباره ارسال نشود
      correlation_id: correlationId,
      baleResponse: renderBaleMessage({
        recipientId: normalizedRequest.senderId,
        messageType: 'text',
        text: 'متأسفیم! در حال حاضر سامانه با مشکل موقت روبرو است. لطفاً لحظاتی بعد تلاش کنید.',
        attachments: [],
        quickReplies: [],
        actions: [],
      }),
      error: 'orchestrator_unreachable',
    };
  }

  // ── 4. Validate orchestrator response ───────────────
  const validationError = validateOrchestratorResponse(orchestratorResponse);
  if (validationError) {
    console.error(`[bale-webhook] invalid orchestrator response | corr=${correlationId} | err=${validationError}`);
    return {
      ok: true,
      correlation_id: correlationId,
      baleResponse: renderBaleMessage({
        recipientId: normalizedRequest.senderId,
        messageType: 'text',
        text: 'متأسفیم! سامانه با خطای داخلی مواجه شد. لطفاً بعداً تلاش کنید.',
        attachments: [],
        quickReplies: [],
        actions: [],
      }),
      error: `invalid_orchestrator_response: ${validationError}`,
    };
  }

  // ── 5. Inject recipientId from normalizedRequest (orchestrator sets this to senderId) ──
  if (!orchestratorResponse.recipientId) {
    orchestratorResponse.recipientId = normalizedRequest.senderId;
  }

  // ── 6. Map orchestrator fields → renderer-expected fields ───
  //    orchestrator outputs `quickReplies[]`, renderer reads `suggestedActions[]`
  //    (adapter مسئول تطبیق field names است، نه orchestrator و نه renderer)
  if (Array.isArray(orchestratorResponse.quickReplies) && orchestratorResponse.quickReplies.length > 0) {
    orchestratorResponse.suggestedActions = orchestratorResponse.quickReplies.map((qr) => ({
      label: qr.label || qr.value || 'گزینه',
      value: qr.value || qr.label || '',
      type: qr.type || 'quick_reply',
    }));
  }
  // اگر orchestator `suggestedActions` هم داشت، با quickReplies ادغام نشود
  // (quickReplies اولویت دارد چون از orchestrator می‌آید)

  // ── 7. Render via Bale renderer ────────────────────
  let baleResponse;
  try {
    baleResponse = renderBaleMessage(orchestratorResponse);
  } catch (renderErr) {
    console.error(`[bale-webhook] render failed | corr=${correlationId} | ${renderErr.message}`);
    return {
      ok: true,
      correlation_id: correlationId,
      baleResponse: renderBaleMessage({
        recipientId: normalizedRequest.senderId,
        messageType: 'text',
        text: 'پیام شما دریافت شد. در صورت نیاز، اپراتور با شما تماس خواهد گرفت.',
        attachments: [],
        quickReplies: [],
        actions: [],
      }),
      error: 'render_failed',
    };
  }

  return {
    ok: true,
    correlation_id: correlationId,
    baleResponse,
  };
}

// ────────────────────────────────────────────────────────────
// Vercel-style HTTP Handler (برای استفاده مستقیم)
// ────────────────────────────────────────────────────────────

/**
 * Vercel Serverless / Express handler
 *
 * POST  → پردازش webhook
 * GET   → health check
 *
 * @param {Object} req
 * @param {Object} res
 */
async function handler(req, res) {
  // ── CORS + OPTIONS ─────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── GET: health ────────────────────────────────
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'bale-adapter',
      status: 'active',
      timestamp: new Date().toISOString(),
    });
  }

  // ── POST: process webhook ──────────────────────
  if (req.method === 'POST') {
    const result = await handleBaleWebhook(req.body);
    return res.status(200).json(result);
  }

  // ── Other methods ──────────────────────────────
  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
}

module.exports = {
  handleBaleWebhook,
  normalizeBaleUpdate,
  handler,
  callOrchestrator,  // exported برای تست
};
