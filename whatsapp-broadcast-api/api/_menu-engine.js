/**
 * Dynamic Hierarchical Menu Engine
 * =================================
 * ┘╛█î┘à╪º█î╪┤ ╪»╪▒╪«╪¬ ┘à┘å┘ê█î ╪»█î┘å╪º┘à█î┌⌐ ╪░╪«█î╪▒┘çΓÇî╪┤╪»┘ç ╪»╪▒ Supabase.
 *
 * ╪¬┘à╪º┘à ┘à╪¬┘ê┘å╪î ╪│╪º╪«╪¬╪º╪▒ ╪»╪▒╪«╪¬█î ┘ê segment restriction ╪º╪▓ ╪¼╪»┘ê┘ä
 * `whatsapp_menu_nodes` ┘ä┘ê╪» ┘à█îΓÇî╪┤┘ê╪» ΓÇö ╪¿╪»┘ê┘å ┘à╪¬┘å ┘ç╪º╪▒╪»┌⌐╪» ╪»╪▒ ╪«╪▒┘ê╪¼█î ┘å┘ç╪º█î█î.
 *
 * ┘å┌»╪º╪┤╪¬ ╪│╪¬┘ê┘åΓÇî┘ç╪º█î ╪»█î╪¬╪º╪¿█î╪│:
 *   body_text       ΓåÉ message_body (prompt terminology)
 *   action_type     ΓåÉ response_type (prompt terminology)
 *   segment         ΓåÉ segment_restriction (prompt terminology)
 *
 * ┘ê╪º╪¿╪│╪¬┌»█îΓÇî┘ç╪º: supabase client ╪º╪▓ _lib.js
 */
const { supabase } = require('./_lib');

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// Cache ΓÇö In-Memory ╪¿╪º TTL ┘é╪º╪¿┘ä ╪¬┘å╪╕█î┘à
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
const CACHE_TTL_MS = 5 * 60 * 1000; // █╡ ╪»┘é█î┘é┘ç (300s)

/** @type {{ data: Array|null, expiresAt: number }} */
let menuCache = {
  data: null,
  expiresAt: 0,
};

/**
 * ┘╛╪º┌⌐ ┌⌐╪▒╪»┘å ┌⌐╪┤ ΓÇö ┘ü╪▒╪º╪«┘ê╪º┘å█î ╪º╪▓ ╪º╪»┘à█î┘å ┘╛┘å┘ä █î╪º ╪¿╪╣╪» ╪º╪▓ ╪¬╪║█î█î╪▒╪º╪¬ ╪»╪▒ ╪»█î╪¬╪º╪¿█î╪│
 */
function invalidateCache() {
  menuCache = { data: null, expiresAt: 0 };
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// Fallback Text Constants ΓÇö ┘ü┘é╪╖ ┘ê┘é╪¬█î ╪»█î╪¬╪º╪¿█î╪│ ╪»╪▒ ╪»╪│╪¬╪▒╪│ ┘å█î╪│╪¬ ╪º╪│╪¬┘ü╪º╪»┘ç ┘à█îΓÇî╪┤┘ê╪»
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
const FALLBACK_NODE_NOT_FOUND = '┌»╪▓█î┘å┘ç ┘à┘ê╪▒╪» ┘å╪╕╪▒ █î╪º┘ü╪¬ ┘å╪┤╪». ┘ä╪╖┘ü╪º┘ï ┘à╪¼╪»╪»╪º┘ï ╪¬┘ä╪º╪┤ ┌⌐┘å█î╪» █î╪º 0 ╪▒╪º ╪¿╪▒╪º█î ┘à┘å┘ê█î ╪º╪╡┘ä█î ╪¿╪▓┘å█î╪».';
const FALLBACK_WARRANTY_TEXT = '┘à╪¡╪╡┘ê┘ä╪º╪¬█î ┌⌐┘ç ╪▒┘ê█î ╪¿╪│╪¬┘çΓÇî╪¿┘å╪»█î ╪ó┘å┘ç╪º ╪╣╪¿╪º╪▒╪¬ "╪╢┘à╪º┘å╪¬ ╪¿╪º╪▓┌»╪┤╪¬ ┘ê╪¼┘ç" ╪»╪▒╪¼ ╪┤╪»┘ç ╪¿╪º╪┤╪»╪î ┘à╪┤┘à┘ê┘ä ┌»╪º╪▒╪º┘å╪¬█î ┘ç╪│╪¬┘å╪».';
const FALLBACK_SUPPORT_TEXT = '╪»╪▒╪«┘ê╪º╪│╪¬ ╪┤┘à╪º ╪¿┘ç ╪¬█î┘à ┘╛╪┤╪¬█î╪¿╪º┘å█î ╪º╪▒╪│╪º┘ä ╪┤╪».';
const FALLBACK_EXIT_TEXT = '╪¿╪º╪▓┌»╪┤╪¬ ╪¿┘ç ┘à┘å┘ê█î ╪º╪╡┘ä█î.';
const FALLBACK_BACK_TO_ROOT = '╪¿╪▒╪º█î ╪¿╪º╪▓┌»╪┤╪¬ ╪¿┘ç ┘à┘å┘ê█î ╪º╪╡┘ä█î╪î 0 ╪▒╪º ╪º╪▒╪│╪º┘ä ┌⌐┘å█î╪».';

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ╪¬╪º╪¿╪╣ ┘ç╪│╪¬┘ç: ╪¿╪º╪▒┌»╪░╪º╪▒█î ┘ç┘à┘ç ┘å┘ê╪»┘ç╪º█î ┘ü╪╣╪º┘ä ╪»╪▒ ╪¡╪º┘ü╪╕┘ç
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
/**
 * ╪¿╪º╪▒┌»╪░╪º╪▒█î ╪¬┘à╪º┘à ┘å┘ê╪»┘ç╪º█î ┘ü╪╣╪º┘ä ╪º╪▓ Supabase ╪¿╪º ┌⌐╪┤█î┘å┌» ╪»╪▒┘ê┘åΓÇî╪¿╪▒┘å╪º┘à┘çΓÇî╪º█î
 * @returns {Promise<Array>} ╪ó╪▒╪º█î┘çΓÇî╪º█î ╪º╪▓ ╪¬┘à╪º┘à ┘å┘ê╪»┘ç╪º█î ┘ü╪╣╪º┘ä
 */
async function loadAllNodes() {
  const now = Date.now();

  // Cache hit ΓÇö still within TTL
  if (menuCache.data && now < menuCache.expiresAt) {
    return menuCache.data;
  }

  // Cache miss or expired ΓÇö fetch from DB
  const { data, error } = await supabase
    .from('whatsapp_menu_nodes')
    .select('id, parent_id, node_key, title, body_text, footer_text, sort_order, segment, action_type, action_value, media_url, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[MenuEngine] DB load error:', error.message);
    // Return stale cache if available (degraded mode)
    if (menuCache.data) return menuCache.data;
    return [];
  }

  menuCache = {
    data: data || [],
    expiresAt: now + CACHE_TTL_MS,
  };
  return menuCache.data;
}

// ΓöÇΓöÇΓöÇ Public API ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * ╪»╪▒█î╪º┘ü╪¬ ┘å┘ê╪» ╪▒█î╪┤┘ç (node_key = 'root')
 */
async function getRootNode() {
  const nodes = await loadAllNodes();
  return nodes.find(n => n.node_key === 'root') || null;
}

/**
 * ╪»╪▒█î╪º┘ü╪¬ ┘ü╪▒╪▓┘å╪»╪º┘å ┘à╪│╪¬┘é█î┘à █î┌⌐ ┘å┘ê╪» ╪¿╪º ┘ü█î┘ä╪¬╪▒ ╪│┌»┘à┘å╪¬
 * @param {string|null} parentId - UUID ┘ê╪º┘ä╪» (null = ╪▒█î╪┤┘ç)
 * @param {string} segment - 'all', 'retail', 'wholesale'
 * @returns {Array} ╪ó╪▒╪º█î┘çΓÇî╪º█î ╪º╪▓ ┘å┘ê╪»┘ç╪º█î ┘ü╪▒╪▓┘å╪»
 */
async function getChildren(parentId, segment = 'all') {
  const nodes = await loadAllNodes();
  const children = nodes.filter(n => n.parent_id === parentId);

  // Normalize segment: strip "known_" prefix from effectiveStatus
  const effectiveSegment = String(segment || 'all')
    .replace(/^known_/, '')
    .toLowerCase();

  // Segment Guard Rail
  // ╪º╪▓ ┘ü█î┘ä╪» segment ╪º╪│╪¬┘ü╪º╪»┘ç ┘à█îΓÇî┌⌐┘å╪» (┘à╪╣╪º╪»┘ä segment_restriction ╪»╪▒ ┘╛╪▒╪º┘à┘╛╪¬)
  const filtered = children.filter(n => {
    const seg = n.segment || n.segment_restriction || 'all';
    if (seg === 'all') return true;
    if (effectiveSegment === 'wholesale') return true; // wholesale can see all
    if (effectiveSegment === 'retail') return seg !== 'wholesale'; // retail can't see wholesale items
    return seg === 'all'; // unknown segment ΓåÆ only 'all' items
  });

  // Add has_children flag
  return filtered.map(n => ({
    ...n,
    has_children: nodes.some(c => c.parent_id === n.id)
  }));
}

/**
 * ╪»╪▒█î╪º┘ü╪¬ █î┌⌐ ┘å┘ê╪» ╪¿╪º node_key
 */
async function getNodeByKey(nodeKey) {
  const nodes = await loadAllNodes();
  return nodes.find(n => n.node_key === nodeKey) || null;
}

/**
 * ╪»╪▒█î╪º┘ü╪¬ █î┌⌐ ┘å┘ê╪» ╪¿╪º id
 */
async function getNodeById(nodeId) {
  if (!nodeId) return null;
  const nodes = await loadAllNodes();
  return nodes.find(n => n.id === nodeId) || null;
}

// ΓöÇΓöÇΓöÇ Session State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * ╪░╪«█î╪▒┘ç ┘ê╪╢╪╣█î╪¬ ┘à┌⌐╪º┘ä┘à┘ç ┌⌐╪º╪▒╪¿╪▒
 * @param {string} phone - ╪┤┘à╪º╪▒┘ç ╪¬┘ä┘ü┘å ┘å╪▒┘à╪º┘äΓÇî╪┤╪»┘ç
 * @param {string|null} nodeId - UUID ┘å┘ê╪» ┘ü╪╣┘ä█î (null = ╪«╪▒┘ê╪¼ ╪º╪▓ ┘à┘å┘ê)
 * @param {object} extraContext - ╪º╪╖┘ä╪º╪╣╪º╪¬ ╪º╪╢╪º┘ü█î
 */
async function setSessionState(phone, nodeId, extraContext = {}) {
  try {
    const { error } = await supabase.rpc('upsert_conversation_state', {
      p_phone: phone,
      p_node_id: nodeId,
      p_context: extraContext
    });
    if (error) {
      console.warn(`[MenuEngine] Session state update error for ${phone}:`, error.message);
    }
  } catch (err) {
    console.warn(`[MenuEngine] Session state failure:`, err.message);
  }
}

/**
 * ╪»╪▒█î╪º┘ü╪¬ ┘ê╪╢╪╣█î╪¬ ┘à┌⌐╪º┘ä┘à┘ç ┌⌐╪º╪▒╪¿╪▒
 * @param {string} phone
 * @returns {Promise<{current_node_id: string|null, context: object}>}
 */
async function getSessionState(phone) {
  try {
    const { data, error } = await supabase.rpc('get_conversation_state', {
      p_phone: phone
    });
    if (error || !data || data.length === 0) {
      return { current_node_id: null, context: {} };
    }
    return {
      current_node_id: data[0].current_node_id || null,
      context: data[0].context || {},
      last_interaction_at: data[0].last_interaction_at
    };
  } catch (err) {
    return { current_node_id: null, context: {} };
  }
}

// ΓöÇΓöÇΓöÇ Render ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * ╪▒┘å╪»╪▒ ┘à┘å┘ê ╪¿┘ç ┘ü╪▒┘à╪¬ ┘à╪¬┘å█î ╪╣╪»╪»█î (┌å┘ê┘å UltraMsg ╪º╪▓ Interactive Buttons ┘╛╪┤╪¬█î╪¿╪º┘å█î ┘å┘à█îΓÇî┌⌐┘å╪»)
 * @param {Array} children - ╪ó╪▒╪º█î┘ç ┘å┘ê╪»┘ç╪º█î ┘ü╪▒╪▓┘å╪»
 * @param {object} parentNode - ┘å┘ê╪» ┘ê╪º┘ä╪» (╪¿╪▒╪º█î body_text)
 * @returns {string} ┘à╪¬┘å ┌⌐╪º╪▒╪¬ ┘à┘å┘ê
 */
function renderNumericMenu(children, parentNode) {
  let text = '';

  // Body text ╪º╪▓ ┘ê╪º┘ä╪»
  if (parentNode?.body_text) {
    text += parentNode.body_text + '\n\n';
  }

  // ┘ä█î╪│╪¬ ┌»╪▓█î┘å┘çΓÇî┘ç╪º
  children.forEach((child, index) => {
    const num = index + 1;
    text += `${num}. ${child.title}\n`;
  });

  // Footer
  if (parentNode?.footer_text) {
    text += '\n' + parentNode.footer_text;
  }

  text += '\n\n' + FALLBACK_BACK_TO_ROOT;

  return text;
}

/**
 * ╪▒┘å╪»╪▒ ┘╛╪º╪│╪« ╪¿╪▒╪º█î ╪º┘å╪¬╪«╪º╪¿ █î┌⌐ ┌»╪▓█î┘å┘ç (╪▓┘à╪º┘å█î ┌⌐┘ç ┌⌐╪º╪▒╪¿╪▒ ╪╣╪»╪»█î ╪º╪▒╪│╪º┘ä ┘à█îΓÇî┌⌐┘å╪»)
 * @param {object} selectedNode - ┘å┘ê╪» ╪º┘å╪¬╪«╪º╪¿ΓÇî╪┤╪»┘ç
 * @param {object} customerInfo - ╪º╪╖┘ä╪º╪╣╪º╪¬ ┘à╪┤╪¬╪▒█î (╪¿╪▒╪º█î segment guard rail)
 * @returns {object} { message: string, node_id: string|null, action_type: string }
 */
function buildNodeResponse(selectedNode, customerInfo = {}) {
  if (!selectedNode) {
    return {
      message: FALLBACK_NODE_NOT_FOUND,
      node_id: null,
      action_type: 'EXIT'
    };
  }

  switch (selectedNode.action_type) {
    case 'URL':
      return {
        message: `${selectedNode.body_text}\n\n┘ä█î┘å┌⌐: ${selectedNode.action_value || ''}`,
        node_id: null,
        action_type: 'URL'
      };

    case 'HUMAN_SUPPORT':
      return {
        message: selectedNode.body_text || FALLBACK_SUPPORT_TEXT,
        node_id: null,
        action_type: 'HUMAN_SUPPORT'
      };

    case 'WARRANTY_FLOW':
      return {
        message: selectedNode.body_text || FALLBACK_WARRANTY_TEXT,
        node_id: null,
        action_type: 'WARRANTY_FLOW'
      };

    case 'PRODUCT_SEARCH':
      return {
        message: selectedNode.body_text,
        node_id: null,
        action_type: 'PRODUCT_SEARCH'
      };

    case 'SUBMENU':
      // SUBMENU █î╪╣┘å█î ╪¿╪º█î╪» ┘ü╪▒╪▓┘å╪»╪º┘å ╪º█î┘å ┘å┘ê╪» ╪▒╪º ┘ä┘ê╪» ┌⌐┘å█î┘à
      // node_id ╪▒╪º ╪¿╪▒┘à█îΓÇî┌»╪▒╪»╪º┘å█î┘à ╪¬╪º webhook ┘ü╪▒╪▓┘å╪»╪º┘å ╪▒╪º ┘ä┘ê╪» ┌⌐┘å╪»
      return {
        message: '', // ┘╛█î╪º┘à ╪«╪º┘ä█î ΓåÆ webhook ╪¿╪¼╪º█î ╪ó┘å ┘ü╪▒╪▓┘å╪»╪º┘å ╪▒╪º ┘ä┘ê╪» ┘à█îΓÇî┌⌐┘å╪»
        node_id: selectedNode.id,
        action_type: 'SUBMENU'
      };

    case 'EXIT':
    default:
      return {
        message: selectedNode.body_text || FALLBACK_EXIT_TEXT,
        node_id: null,
        action_type: 'EXIT'
      };
  }
}

module.exports = {
  loadAllNodes,
  getRootNode,
  getChildren,
  getNodeByKey,
  getNodeById,
  setSessionState,
  getSessionState,
  renderNumericMenu,
  buildNodeResponse,
  invalidateCache,
};
