/**
 * health.js — Read-only backend health endpoint.
 * GET /api/health → 200 { "status": "ok" }
 * No DB access, no auth, no secret exposure.
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({ status: 'ok' });
};
