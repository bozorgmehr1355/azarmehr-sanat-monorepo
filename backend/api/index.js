/**
 * api/index.js — Single serverless function that routes to all handlers.
 *
 * On Vercel Hobby plan, every .js in api/ becomes a separate function
 * (limit: 12). This file is the ONLY function; it routes internally
 * using Express so the 12-function cap is never hit.
 *
 * All handler files live in ../handlers/ (outside api/ directory).
 */

const express = require('express');
const path = require('path');

// ── Load env ──────────────────────────────────────────────────────
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ── Build Express app (cached across warm invocations) ────────────
const app = express();
// Skip global JSON parsing for /api/growth routes — the growth-decide handler
// owns raw-body parsing to return a clean 400 INVALID_REQUEST on bad bodies.
app.use(
  express.json({
    type: (req) => (req.path || '').startsWith('/api/growth') ? false : 'application/json',
  })
);

// ── CORS middleware ───────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (_req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ── Mount all handlers from ../handlers/ ──────────────────────────
const H = (name) => require(path.join(__dirname, '..', 'handlers', name));

const routes = [
  ['/api/login',                        H('login')],
  ['/api/portal-login',                 H('portal-login')],
  ['/api/portal-login-retail',          H('portal-login-retail')],
  ['/api/portal-register',              H('portal-register')],
  ['/api/users',                        H('users')],
  ['/api/roles',                        H('roles')],
  ['/api/role-permissions',             H('rolePermissions')],
  ['/api/groups',                       H('groups')],
  ['/api/crm-customers',                H('crm-customers')],
  ['/api/crm-orders',                   H('crm-orders')],
  ['/api/crm-order-items',              H('crm-order-items')],
  ['/api/crm-order-status-log',         H('crm-order-status-log')],
  ['/api/crm-order-tasks',              H('crm-order-tasks')],
  ['/api/crm-order-to-project',         H('crm-order-to-project')],
  ['/api/crm-communications',           H('crm-communications')],
  ['/api/crm-payments',                 H('crm-payments')],
  ['/api/crm-payments-admin',           H('crm-payments-admin')],
  ['/api/crm-payment-submit',           H('crm-payment-submit')],
  ['/api/crm-payment-verify',           H('crm-payment-verify')],
  ['/api/crm-proforma-issue',           H('crm-proforma-issue')],
  ['/api/crm-proforma-approve',         H('crm-proforma-approve')],
  ['/api/support-tickets',              H('support-tickets')],
  ['/api/crm-invoices',                 H('crm-invoices')],
  ['/api/crm-guarantee-claims',         H('crm-guarantee-claims')],
  ['/api/warranty-returns',             H('warranty-returns')],
  ['/api/crm-draft-orders',             H('crm-draft-orders')],
  ['/api/projects',                     H('projects')],
  ['/api/project-tasks',                H('project-tasks')],
  ['/api/project-members',              H('project-members')],
  ['/api/documents',                    H('documents')],
  ['/api/chat',                         H('chat')],
  ['/api/notifications',                H('notifications')],
  ['/api/requests',                     H('requests')],
  ['/api/payments',                     H('payments')],
  ['/api/settings',                     H('settings')],
  ['/api/products',                     H('products')],
  ['/api/scorpion-customers',           H('scorpion-customers')],
  ['/api/org-chart',                    H('org-chart')],
  ['/api/portal-registration-requests', H('portal-registration-requests')],
  ['/api/setup',                        H('setup')],
  ['/api/debug',                        H('debug')],
  ['/api/qa-match',                     H('qa-match')],
  ['/api/whatsapp-rules',               H('whatsapp-rules')],
  ['/api/audit-logs',                  H('audit-logs')],
  ['/api/meetings',                    H('meetings')],
  ['/api/meeting-action-items',        H('meeting-action-items')],
  ['/api/ai-drafts',                   H('ai-drafts')],
  ['/api/customer-agent',              H('customer-agent')],
['/api/reports/performance/calculate', H('performance-reports')],
['/api/reports',                     H('reports')],
  ['/api/public-warranty-request',     H('public-warranty-request')],
  ['/api/health',                      H('health')],
  ['/api/leads',                        H('leads')],
  ['/api/growth/decide',               H('growth-decide')],
  ['/api/growth/drafts',               H('growth-drafts')],
];

for (const [route, handler] of routes) {
  // Exact match
  app.all(route, (req, res, next) => Promise.resolve(handler(req, res)).catch(next));
  // Sub-path match (e.g. /api/users/reset-password)
  app.all(route + '/*', (req, res, next) => Promise.resolve(handler(req, res)).catch(next));
}

// ── Root / fallback ───────────────────────────────────────────────
app.all('*', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'azarmehr-backend',
    routes: routes.map(([r]) => r),
  });
});

// ── Final error-handling middleware (defense-in-depth) ────────────
// Catches any thrown/rejected error from async route handlers
// that was not already handled inside the handler's own try/catch.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  return res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ── Export for Vercel serverless ──────────────────────────────────
module.exports = app;
