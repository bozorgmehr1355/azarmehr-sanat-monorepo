# Project Additions Report

**Date:** ۱۴۰۵/۰۴/۲۳ - 2026/07/14

## Basis
Extracted from:
- `docs/PROJECT_MAP.md`
- `docs/DEVELOPMENT_RULES.md`

No source files were modified. Verification references point to file paths, handler names, and line numbers in the two docs above.

## Overall Service Status

| App/Service | Status | Source of Truth |
|---|---|---|
| `backend/` | PRODUCTION | `backend/handlers/*.js` + `backend/api/index.js` + `backend/server.js` + `_lib.js`/`_audit.js` |
| `admin-panel/` | PRODUCTION | `admin-panel/index.html` |
| `messenger-app/` | PRODUCTION | `messenger-app/components/index.jsx` (→ `bundle.min.js`) |
| `wholesale-portal/` | PRODUCTION (static) | `wholesale-portal/index.html` |
| `whatsapp-broadcast-api/` | PRODUCTION (webhook) | `whatsapp-broadcast-api/api/webhook.js` |

## backend/

| Feature | Status | Evidence |
|---|---|---|
| **Performance Evaluation — calculate endpoint** `POST /api/reports/performance/calculate` | OPERATIONAL (verified 200 + upsert into `performance_scores`) | `backend/handlers/performance-reports.js`; `PROJECT_MAP.md:274-280`; smoke test ۱۴۰۵/۰۴/۲۳ (`PROJECT_MAP.md:282-301`) |
| **Performance Evaluation — table** `performance_scores` | MIGRATION CLEANED (wrong FK to `users` removed; `user_id` now NOT NULL, no REFERENCES) | `supabase/create-performance-scores.sql` + comment ۴۲۸۰۹; `PROJECT_MAP.md:280` |
| **User performance read endpoint** `GET /api/reports/users/performance` | BACKEND ONLY — no UI in admin-panel | `PROJECT_MAP.md:262,272,323,331` (Reports tab is CRM sales only) |
| **Project Control Module** (projects / project-tasks / members) | DONE | `projects.js`, `project-tasks.js`, `project-members.js`; `PROJECT_MAP.md:190-194` |
| **Meetings & action items** | DONE | `meetings.js`, `meeting-action-items.js`; `PROJECT_MAP.md:195-196` |
| **RBAC tables** (`user_roles`, `role_permissions`) | DONE | `supabase/rbac-tables.sql` / `run-all-in-dashboard.sql`; `PROJECT_MAP.md:203` |
| **Groups tables** (`groups`, `group_members`) | DONE | `supabase/groups-tables.sql`; `PROJECT_MAP.md:204` |
| **Route parity** (`server.js` ⇄ `api/index.js`) | DONE (6 missing routes added to `server.js`) | `PROJECT_MAP.md:131-133` |
| **IDOR / auth-bypass fix** (Phase 2B) | DONE (39/39 smoke OK) | `PHASE2B_REPORTING_API_AUTHORIZATION_FIX_REPORT.md`; `PROJECT_MAP.md:317` |
| **Task status lifecycle model** (TRANSITIONS + sub-routes) | DONE | `project-tasks.js:6-27`; `PROJECT_MAP.md:193,206-210` |

## admin-panel/

| Feature | Status | Evidence |
|---|---|---|
| **AccessModule** (user mgmt + reset-password) | DONE (hardened via `POST users/:id/reset-password`) | `PROJECT_MAP.md:95,100` |
| **ReportsModule** (line ۴۲۵۰ — performance eval) | PARTIAL — backend exists, **no employee-eval UI** | `PROJECT_MAP.md:95,331` |
| **Projects/Tasks tab + convertToProject** (line ۱۷۶۴) | DONE (bug `BASE`→`API_BASE` fixed) | `PROJECT_MAP.md:96,176-183` |
| **resolveApiBase()** (apiBase priority resolver) | DONE | `PROJECT_MAP.md:92-94` |

## messenger-app/

| Feature | Status | Evidence |
|---|---|---|
| **Build pipeline** (`components/index.jsx` → `bundle.min.js`) | DONE | `PROJECT_MAP.md:107-110` |
| **projects/tasks tabs** (lines ۱۴۹۱, ۱۷۷۰) | UNKNOWN / EXPERIMENTAL — local/demo, not live backend | `PROJECT_MAP.md:184-187` |
| **Archive auth-bypass pages** (`test-login.html`/`inject.html`) | DONE (closed, excluded from deploy via `.vercelignore`) | `PROJECT_MAP.md:112-116` |

## wholesale-portal/

| Feature | Status | Evidence |
|---|---|---|
| **API_BASE / WHATSAPP_API_BASE resolver** (cleanup) | DONE (no new hardcode; fallback = production URL) | `PROJECT_MAP.md:140-144` |
| **Static deploy** (PRODUCTION) | DONE | `PROJECT_MAP.md:154` |
| **Missing backend route** `/public-warranty-request` (called, no handler) | MISSING (likely 404) | `PROJECT_MAP.md:150-151` |
| **Direct Supabase anon client exposure** (writes notifications/customers) | SECURITY FOLLOW-UP | `PROJECT_MAP.md:145-149` |

## whatsapp-broadcast-api/

| Feature | Status | Evidence |
|---|---|---|
| **UltraMsg webhook** `POST/GET /api/webhook` | LIVE (only live endpoint) | `PROJECT_MAP.md:161-162` |
| **Advertised-but-missing admin routes** (ghost → admin UI 404) | BROKEN / GHOST | `PROJECT_MAP.md:163-164,403-404` |
| **UltraMsg signature verification in webhook** | UNKNOWN (not verified this task) | `PROJECT_MAP.md:165-166,387-388` |

## Documentation Added

| Feature | Status | Evidence |
|---|---|---|
| `docs/P11_PERFORMANCE_EVALUATION_REPORT.md` | CREATED (PHASE2B-aligned style) | created this session |
| `docs/PROJECT_MAP.md` update (schema note + review line) | DONE | lines ۲۸۰, ۴۳۲-۴۳۴ |
| `docs/DATABASE_SOURCE_OF_TRUTH.md` update (`performance_scores` section) | DONE | edited this session |
| `docs/OMNICHANNEL_AI_AGENT_BLUEPRINT.md` | CREATED (D0 architecture blueprint, Proposed) | created this session |
| `whatsapp-broadcast-api/api/_webhook-security.js` + `webhook.js` P0 patch | SECURED (shared-secret gate, fail-closed) | P0-WHATSAPP-WEBHOOK-SECURITY |

## Remaining Gaps

- **No employee-performance UI in admin-panel** — only backend (`GET /api/reports/users/performance`) exists.
- **No dedicated evaluation table** (`performance_evaluations`/`employee_reviews`) exists.
- **messenger-app projects tab is local/demo** (not connected to live backend).
- **WhatsApp ghost routes** and **wholesale anon-key exposure** — open security follow-ups.
- **`/public-warranty-request` backend route missing** in wholesale-portal flow.
