/**
 * Azarmehr Backend — Express server for Render.com
 *
 * Converts Vercel serverless functions (module.exports = (req, res) => {...})
 * to an Express app while keeping ALL original logic intact.
 *
 * Each handler is mounted with app.all() + app.all('/*') so that:
 *   - req.url preserves the full path (handlers parse their own sub-routes)
 *   - req.body, req.query, req.method work identically to Vercel
 */

const express = require('express');
const path = require('path');

// ─── Load .env for local dev (no-op in production) ─────────────────
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// ───────────────────────────────────────────
// Middleware
// ───────────────────────────────────────────

// Parse JSON bodies (matches Vercel's auto-parsed req.body)
// Skip global JSON parsing for /api/growth routes — the growth-decide handler
// owns raw-body parsing to return a clean 400 INVALID_REQUEST on bad bodies.
app.use(
  express.json({
    type: (req) => (req.path || '').startsWith('/api/growth') ? false : 'application/json',
  })
);

// CORS — handles OPTIONS preflight before any handler sees the request
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ───────────────────────────────────────────
// Route helpers
// ───────────────────────────────────────────

/**
 * Mount a Vercel-style handler on an Express route.
 * Uses app.all() + app.all('/*') so that:
 *   - The exact path runs the handler (e.g. /api/users)
 *   - Sub-paths also run the handler (e.g. /api/users/reset-password)
 *   - req.url remains the FULL original URL (handlers parse sub-paths themselves)
 */
function mount(basePath, handler) {
  app.all(basePath, (req, res, next) => Promise.resolve(handler(req, res)).catch(next));
  app.all(path.posix.join(basePath, '/*'), (req, res, next) => Promise.resolve(handler(req, res)).catch(next));
}

// ───────────────────────────────────────────
// API Routes — each mounts the original
// Vercel handler without ANY logic change
// ───────────────────────────────────────────

// Load all handlers from handlers/ (api/ now has only the Vercel entry-point index.js)
const handlers = {
  login:                   require('./handlers/login'),
  portalLogin:             require('./handlers/portal-login'),
  portalRegister:          require('./handlers/portal-register'),
  portalLoginRetail:       require('./handlers/portal-login-retail'),
  users:                   require('./handlers/users'),
  roles:                   require('./handlers/roles'),
  rolePermissions:         require('./handlers/rolePermissions'),
  crmCustomers:            require('./handlers/crm-customers'),
  crmOrders:               require('./handlers/crm-orders'),
  crmOrderItems:           require('./handlers/crm-order-items'),
  crmOrderStatusLog:       require('./handlers/crm-order-status-log'),
  crmOrderTasks:           require('./handlers/crm-order-tasks'),
  crmOrderToProject:       require('./handlers/crm-order-to-project'),
  crmCommunications:       require('./handlers/crm-communications'),
  crmPayments:             require('./handlers/crm-payments'),
  crmPaymentsAdmin:        require('./handlers/crm-payments-admin'),
  crmPaymentSubmit:        require('./handlers/crm-payment-submit'),
  crmPaymentVerify:        require('./handlers/crm-payment-verify'),
  crmProformaIssue:        require('./handlers/crm-proforma-issue'),
  crmProformaApprove:      require('./handlers/crm-proforma-approve'),
  supportTickets:          require('./handlers/support-tickets'),
  crmInvoices:             require('./handlers/crm-invoices'),
  crmGuaranteeClaims:      require('./handlers/crm-guarantee-claims'),
  warrantyReturns:         require('./handlers/warranty-returns'),
  crmDraftOrders:           require('./handlers/crm-draft-orders'),
  projects:                require('./handlers/projects'),
  projectTasks:            require('./handlers/project-tasks'),
  projectMembers:          require('./handlers/project-members'),
  documents:               require('./handlers/documents'),
  chat:                    require('./handlers/chat'),
  notifications:           require('./handlers/notifications'),
  requests:                require('./handlers/requests'),
  payments:                require('./handlers/payments'),
  settings:                require('./handlers/settings'),
  products:                require('./handlers/products'),
  scorpionCustomers:       require('./handlers/scorpion-customers'),
  orgChart:                require('./handlers/org-chart'),
  groups:                  require('./handlers/groups'),
  portalRegistrationRequests: require('./handlers/portal-registration-requests'),
  setup:                   require('./handlers/setup'),
  debug:                   require('./handlers/debug'),
  qaMatch:                 require('./handlers/qa-match'),
  whatsappRules:           require('./handlers/whatsapp-rules'),
  auditLogs:               require('./handlers/audit-logs'),
  meetings:                require('./handlers/meetings'),
  meetingActionItems:      require('./handlers/meeting-action-items'),
  aiDrafts:                require('./handlers/ai-drafts'),
  customerAgent:           require('./handlers/customer-agent'),
  reports:                 require('./handlers/reports'),
  performanceReports:      require('./handlers/performance-reports'),
  publicWarrantyRequest:   require('./handlers/public-warranty-request'),
  health:                   require('./handlers/health'),
  leads:                    require('./handlers/leads'),
  growthDecide:             require('./handlers/growth-decide'),
  growthDrafts:             require('./handlers/growth-drafts'),
  messageOrchestrator:      require('./handlers/message-orchestrator').handler,
  baleWebhook:              require('../bale-adapter/bale-webhook-handler').handler,
};

// Mount every endpoint
mount('/api/login',                      handlers.login);
mount('/api/health',                     handlers.health);
mount('/api/leads',                      handlers.leads);
mount('/api/portal-login',               handlers.portalLogin);
mount('/api/portal-register',            handlers.portalRegister);
mount('/api/portal-login-retail',        handlers.portalLoginRetail);
mount('/api/users',                      handlers.users);
mount('/api/roles',                      handlers.roles);
mount('/api/role-permissions',           handlers.rolePermissions);
mount('/api/crm-customers',              handlers.crmCustomers);
mount('/api/crm-orders',                 handlers.crmOrders);
mount('/api/crm-order-items',            handlers.crmOrderItems);
mount('/api/crm-order-status-log',       handlers.crmOrderStatusLog);
mount('/api/crm-order-tasks',            handlers.crmOrderTasks);
mount('/api/crm-order-to-project',       handlers.crmOrderToProject);
mount('/api/crm-communications',         handlers.crmCommunications);
mount('/api/crm-payments',               handlers.crmPayments);
mount('/api/crm-payments-admin',         handlers.crmPaymentsAdmin);
mount('/api/crm-payment-submit',         handlers.crmPaymentSubmit);
mount('/api/crm-payment-verify',         handlers.crmPaymentVerify);
mount('/api/crm-proforma-issue',         handlers.crmProformaIssue);
mount('/api/crm-proforma-approve',         handlers.crmProformaApprove);
mount('/api/support-tickets',            handlers.supportTickets);
mount('/api/crm-invoices',               handlers.crmInvoices);
mount('/api/crm-guarantee-claims',        handlers.crmGuaranteeClaims);
mount('/api/warranty-returns',          handlers.warrantyReturns);
mount('/api/crm-draft-orders',            handlers.crmDraftOrders);
mount('/api/projects',                   handlers.projects);
mount('/api/project-tasks',              handlers.projectTasks);
mount('/api/project-members',            handlers.projectMembers);
mount('/api/documents',                  handlers.documents);
mount('/api/chat',                       handlers.chat);
mount('/api/notifications',              handlers.notifications);
mount('/api/requests',                   handlers.requests);
mount('/api/payments',                   handlers.payments);
mount('/api/settings',                   handlers.settings);
mount('/api/products',                   handlers.products);
mount('/api/scorpion-customers',         handlers.scorpionCustomers);
mount('/api/org-chart',                  handlers.orgChart);
mount('/api/groups',                     handlers.groups);
mount('/api/portal-registration-requests', handlers.portalRegistrationRequests);
mount('/api/setup',                      handlers.setup);
mount('/api/debug',                      handlers.debug);
mount('/api/qa-match',                   handlers.qaMatch);
mount('/api/whatsapp-rules',             handlers.whatsappRules);
mount('/api/audit-logs',                  handlers.auditLogs);
mount('/api/meetings',                    handlers.meetings);
mount('/api/meeting-action-items',        handlers.meetingActionItems);
mount('/api/ai-drafts',                   handlers.aiDrafts);
mount('/api/customer-agent',              handlers.customerAgent);
mount('/api/reports/performance/calculate', handlers.performanceReports);
mount('/api/reports',                     handlers.reports);
mount('/api/public-warranty-request',     handlers.publicWarrantyRequest);
mount('/api/growth/decide',              handlers.growthDecide);
mount('/api/growth/drafts',              handlers.growthDrafts);
mount('/api/message-orchestrator',       handlers.messageOrchestrator);

// Bale Webhook — /api/bale/webhook (with secret validation)
const BALE_WEBHOOK_SECRET = process.env.BALE_WEBHOOK_SECRET;
app.all('/api/bale/webhook', (req, res, next) => {
  // CORS preflight — allow without auth
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-bale-webhook-secret');
    return res.status(200).end();
  }

  // Health check GET — allow without auth
  if (req.method === 'GET') {
    return handlers.baleWebhook(req, res);
  }

  // POST — require secret header
  const secret = req.headers['x-bale-webhook-secret'];
  if (!secret) {
    return res.status(401).json({ error: 'missing_webhook_secret' });
  }
  if (secret !== BALE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'invalid_webhook_secret' });
  }

  // Secret valid — delegate to Bale handler
  return handlers.baleWebhook(req, res);
});

// Root catch-all — returns route listing
app.all('/', (req, res) => {
  res.json({
    ok: true,
    service: 'azarmehr-backend',
    routes: Object.keys(handlers).map(k => `/api/${k}`),
  });
});

// ───────────────────────────────────────────
// Final error-handling middleware (defense-in-depth)
// Catches any thrown/rejected error from async route handlers
// that was not already handled inside the handler's own try/catch.
// ───────────────────────────────────────────
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  return res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ───────────────────────────────────────────
// Start
// ───────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Azarmehr Backend running on port ${PORT}`);
  console.log(`   Base URL: http://0.0.0.0:${PORT}`);
  console.log(`   APIs:     http://0.0.0.0:${PORT}/api/login`);
});
