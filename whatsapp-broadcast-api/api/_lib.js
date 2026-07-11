const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) { throw new Error('JWT_SECRET env var is required'); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cors(req, res) {
  if (res === undefined) {
    res = req;
    req = { method: null };
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return true;
  }
  return false;
}

function requireAuth(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    const err = new Error('┘ä╪╖┘ü╪º┘ï ┘ê╪º╪▒╪» ╪┤┘ê█î╪»');
    err.status = 401;
    throw err;
  }
  const token = auth.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (e) {
    const err = new Error('╪¬┘ê┌⌐┘å ┘å╪º┘à╪╣╪¬╪¿╪▒ ╪º╪│╪¬');
    err.status = 401;
    throw err;
  }
}

function requireRole(req, allowedRoles) {
  const user = requireAuth(req);
  if (!allowedRoles.includes(user.system_role)) {
    const err = new Error('╪┤┘à╪º ╪»╪│╪¬╪▒╪│█î ┘ä╪º╪▓┘à ╪▒╪º ┘å╪»╪º╪▒█î╪»');
    err.status = 403;
    throw err;
  }
  return user;
}

function requireAdmin(req) {
  return requireRole(req, ['super_admin', 'admin']);
}

function requireSuperAdmin(req) {
  return requireRole(req, ['super_admin']);
}

/* ΓöÇΓöÇΓöÇ UltraMsg Gateway ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE || 'instance183062';
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN || '';
const ULTRAMSG_URL = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`;

/**
 * ╪¬╪¿╪»█î┘ä ╪┤┘à╪º╪▒┘ç ┘à┘ê╪¿╪º█î┘ä ╪¿┘ç ┘ü╪▒┘à╪¬ ╪º╪│╪¬╪º┘å╪»╪º╪▒╪» ╪»╪º╪«┘ä█î (09xxxxxxxxx)
 * ┘à╪½╪º┘ä: 989121839563 ΓåÆ 09121839563
 *        +989121839563 ΓåÆ 09121839563
 *        09121839563   ΓåÆ 09121839563
 */
function formatPhone(phone) {
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('98') && cleaned.length === 12) return '0' + cleaned.substring(2);
  if (cleaned.startsWith('0') && cleaned.length === 11) return cleaned;
  return '0' + cleaned.substring(cleaned.length - 10);
}

/**
 * ╪¬╪¿╪»█î┘ä ╪┤┘à╪º╪▒┘ç ┘à┘ê╪¿╪º█î┘ä ╪¿┘ç ┘ü╪▒┘à╪¬ ╪º█î┘å╪¬╪▒┘å╪┤┘å╪º┘ä (98xxxxxxxxx)
 * ╪¿╪▒╪º█î ╪º╪│╪¬┘ü╪º╪»┘ç ╪»╪▒ API┘ç╪º█î ╪«╪º╪▒╪¼█î ┘à╪º┘å┘å╪» UltraMsg
 * ┘à╪½╪º┘ä: 09121839563 ΓåÆ 989121839563
 */
function formatPhoneInternational(phone) {
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) return '98' + cleaned.substring(1);
  if (cleaned.startsWith('98') && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith('98')) return cleaned;
  return '98' + cleaned.substring(cleaned.length - 10);
}

/**
 * ╪º╪▒╪│╪º┘ä ┘╛█î╪º┘à ┘ê╪º╪¬╪│╪º┘╛ ╪º╪▓ ╪╖╪▒█î┘é UltraMsg Gateway
 * @param {string} recipient - ╪┤┘à╪º╪▒┘ç ╪¿┘ç ┘ü╪▒┘à╪¬ ╪º█î┘å╪¬╪▒┘å╪┤┘å╪º┘ä (98912...)
 * @param {string} messageBody - ┘à╪¬┘å ┘╛█î╪º┘à
 * @returns {Promise<{sent: boolean, messageId?: string, error?: string}>}
 */
async function sendWhatsAppMessage(recipient, messageBody) {
  const params = new URLSearchParams({
    token: ULTRAMSG_TOKEN,
    to: recipient,
    body: messageBody,
    priority: '10',
  });

  const response = await fetch(ULTRAMSG_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const result = await response.json();
  return {
    sent: result.sent === true || result.sent === 'true',
    messageId: result.messageId || result.message_id || null,
    error: result.error || result.message || null,
    raw: result,
  };
}

/* ΓöÇΓöÇΓöÇ Intent Detection Engine ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */

/**
 * ╪¬╪┤╪«█î╪╡ Intent ┘╛█î╪º┘à ┘ê╪▒┘ê╪»█î
 * @param {string} message - ┘à╪¬┘å ┘╛█î╪º┘à
 * @returns {'GREETING' | 'HELP' | 'ORDER' | 'PRODUCT_QUERY'}
 */
function detectIntent(message) {
  if (!message) return 'PRODUCT_QUERY';
  const text = message.toLowerCase().trim();

  // GREETING ΓÇö ╪│┘ä╪º┘à ┘ê ╪º╪¡┘ê╪º┘ä┘╛╪▒╪│█î
  const GREETING_KEYWORDS = [
    '╪│┘ä╪º┘à', '╪»╪▒┘ê╪»', '╪╣╪▒╪╢ ╪º╪»╪¿', '╪│┘ä╪º╪º┘à', '╪│┘ä╪º┘à ╪╣┘ä█î┌⌐┘à',
    'hello', 'hi', 'hey', 'good morning', 'good evening',
    'salam', 'dorood',
  ];
  for (const kw of GREETING_KEYWORDS) {
    if (text === kw || text.startsWith(kw + ' ') || text.startsWith(kw + '\n')) {
      return 'GREETING';
    }
  }
  // ┘ç┘à┌å┘å█î┘å ┘╛█î╪º┘àΓÇî┘ç╪º█î ╪«█î┘ä█î ┌⌐┘ê╪¬╪º┘ç (█▒-█▓ ┌⌐┘ä┘à┘ç) ┌⌐┘ç ┘ü┘é╪╖ ╪│┘ä╪º┘à ╪¿╪º╪┤┘å╪»
  if (text.length < 10 && (
    text.includes('╪│┘ä╪º┘à') || text.includes('╪»╪▒┘ê╪»') || text.includes('hello') || text.includes('hi')
  )) return 'GREETING';

  // HELP ΓÇö ╪»╪▒╪«┘ê╪º╪│╪¬ ╪▒╪º┘ç┘å┘à╪º
  const HELP_KEYWORDS = [
    '┌⌐┘à┌⌐', '╪▒╪º┘ç┘å┘à╪º', '┌å╪╖┘ê╪▒', '╪╖╪▒╪▓', '╪ó┘à┘ê╪▓╪┤', '┘å╪¡┘ê┘ç',
    'help', 'support', 'guide', 'how to',
  ];
  for (const kw of HELP_KEYWORDS) {
    if (text.includes(kw)) return 'HELP';
  }

  // ORDER ΓÇö ╪│┘ü╪º╪▒╪┤ / ╪«╪▒█î╪»
  const ORDER_KEYWORDS = [
    '╪│┘ü╪º╪▒╪┤', '╪«╪▒█î╪»', '╪½╪¿╪¬ ╪│┘ü╪º╪▒╪┤', '╪│┘ü╪º╪▒╪┤ ┘à█î╪»┘à', '╪│┘ü╪º╪▒╪┤ ╪»╪º╪»┘à',
    'order', 'buy', 'purchase', '┘à╪¡╪╡┘ê┘ä',
  ];
  for (const kw of ORDER_KEYWORDS) {
    if (text.includes(kw)) return 'ORDER';
  }

  return 'PRODUCT_QUERY';
}

/**
 * ╪»╪▒█î╪º┘ü╪¬ ┘╛╪º╪│╪« ╪«┘ê╪»┌⌐╪º╪▒ ╪¿╪▒ ╪º╪│╪º╪│ Intent
 * @param {'GREETING' | 'HELP' | 'ORDER' | 'PRODUCT_QUERY'} intent
 * @returns {string}
 */
function getAutoReply(intent) {
  const REPLIES = {
    GREETING: '╪│┘ä╪º┘à╪î ╪¿┘ç ┌»╪▒┘ê┘ç ┘à╪¡╪╡┘ê┘ä╪º╪¬ ╪║╪░╪º█î█î ╪╣┘é╪▒╪¿ ╪«┘ê╪┤ ╪ó┘à╪»█î╪». ┘ä╪╖┘ü╪º┘ï ┘å╪º┘à ┘à╪¡╪╡┘ê┘ä ┘à┘ê╪▒╪» ┘å╪╕╪▒ ╪«┘ê╪» ╪▒╪º ╪º╪▒╪│╪º┘ä ┌⌐┘å█î╪» ╪¬╪º ╪º╪╖┘ä╪º╪╣╪º╪¬ ┌⌐╪º┘à┘ä ╪»╪▒ ╪º╪«╪¬█î╪º╪▒ ╪┤┘à╪º ┘é╪▒╪º╪▒ ┌»█î╪▒╪».',
    HELP: '╪¿╪▒╪º█î ╪»╪▒█î╪º┘ü╪¬ ┘é█î┘à╪¬ █î╪º ╪½╪¿╪¬ ╪│┘ü╪º╪▒╪┤╪î ┌⌐╪º┘ü█î╪│╪¬ ┘å╪º┘à ┘à╪¡╪╡┘ê┘ä ┘à┘ê╪▒╪» ┘å╪╕╪▒ ╪«┘ê╪» ╪▒╪º ╪º╪▒╪│╪º┘ä ┘å┘à╪º█î█î╪».',
    ORDER: '╪¿╪▒╪º█î ╪½╪¿╪¬ ╪│┘ü╪º╪▒╪┤ ┘ä╪╖┘ü╪º┘ï ┘å╪º┘à ┘à╪¡╪╡┘ê┘ä ┘ê ┘à┘é╪»╪º╪▒ ┘à┘ê╪▒╪» ┘å█î╪º╪▓ ╪«┘ê╪» ╪▒╪º ╪º╪▒╪│╪º┘ä ┌⌐┘å█î╪». ┌⌐╪º╪▒╪┤┘å╪º╪│╪º┘å ┘ü╪▒┘ê╪┤ ╪¿╪º ╪┤┘à╪º ╪¬┘à╪º╪│ ╪«┘ê╪º┘ç┘å╪» ┌»╪▒┘ü╪¬.',
    PRODUCT_QUERY: '╪»╪▒ ╪¡╪º┘ä ╪¿╪▒╪▒╪│█î ╪º╪╖┘ä╪º╪╣╪º╪¬ ┘à╪¡╪╡┘ê┘ä ┘à┘ê╪▒╪» ┘å╪╕╪▒ ╪┤┘à╪º ┘ç╪│╪¬█î┘à. ┘ä╪╖┘ü╪º┘ï ┌å┘å╪» ┘ä╪¡╪╕┘ç ┘à┘å╪¬╪╕╪▒ ╪¿┘à╪º┘å█î╪».',
  };
  return REPLIES[intent] || REPLIES.PRODUCT_QUERY;
}

module.exports = {
  supabase,
  cors,
  bcrypt,
  jwt,
  JWT_SECRET,
  requireAuth,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  // UltraMsg
  ULTRAMSG_INSTANCE,
  ULTRAMSG_TOKEN,
  ULTRAMSG_URL,
  formatPhone,
  formatPhoneInternational,
  sendWhatsAppMessage,
  // Intent Engine
  detectIntent,
  getAutoReply,
};
