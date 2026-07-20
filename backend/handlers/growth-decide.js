// growth-decide.js — POST /api/growth/decide endpoint (Slice-1)
//
// Internal Growth Intervention Decision endpoint.
// Accepts a JSON event, runs explainGrowthIntervention, and returns the
// audit-ready decision. No WhatsApp send, no external services, no auth.
//
// The global express.json() parser is configured to SKIP /api/growth paths
// (see api/index.js / server.js) so this handler owns raw-body parsing and
// can return a clean 400 INVALID_REQUEST on missing/malformed bodies.

'use strict';

const { explainGrowthIntervention } = require('./growth-decision');

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1e6) {
        // 1MB guard — avoid unbounded memory
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
  // Never expose stack traces.
  return res.status(status).json({ ok: false, error });
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return jsonError(res, 405, 'METHOD_NOT_ALLOWED');

  let event;
  try {
    const raw = await readRawBody(req);
    if (raw == null || raw.trim() === '') {
      return jsonError(res, 400, 'INVALID_REQUEST');
    }
    event = JSON.parse(raw);
  } catch (e) {
    return jsonError(res, 400, 'INVALID_REQUEST');
  }

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return jsonError(res, 400, 'INVALID_REQUEST');
  }

  const result = explainGrowthIntervention(event);
  return res.status(200).json({ ok: true, ...result });
};
