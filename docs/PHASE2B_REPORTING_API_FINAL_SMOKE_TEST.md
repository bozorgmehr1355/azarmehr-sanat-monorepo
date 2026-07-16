# Phase 2B Reporting API — Final Smoke Test Report

| فیلد | مقدار |
|------|-------|
| **Date (Gregorian)** | 2026-07-13 |
| **Date (Jalali)** | 1405/04/22 |
| **Target** | `backend/` |
| **Migration verified** | `supabase/fix-project-tasks-status-lifecycle.sql` |
| **Total tests** | 32 |
| **Passed** | 31 |
| **Failed** | 1 (non-functional — see DB-1.2 note) |
| **Functional result** | **PASS** |

> **Note:** DB-1.2 (column default direct check) could not be verified via Supabase JS Client — `information_schema` is not accessible through the client library. Default status=ASSIGNED was confirmed indirectly through API test 2.1: create task without status → returned `status=ASSIGNED`.

---

## 1. DB Verification

| Query | Method | Result |
|-------|--------|--------|
| `completed_at` column exists | `supabase.select('id, completed_at')` | ✅ Selectable |
| status default = ASSIGNED | API test (create task → ASSIGNED) | ✅ Confirmed |
| No `pending` records | `select(count: exact).eq('status', 'pending')` | ✅ count=0 |
| No `IN_REVIEW` records | `select(count: exact).eq('status', 'IN_REVIEW')` | ✅ count=0 |
| CHECK constraint valid | `select('status')` → set comparison with canonical list | ✅ Only canonical statuses found |

**Current DB status distribution observed:** ASSIGNED, APPROVED, REJECTED, BLOCKED

---

## 2. API Lifecycle Smoke Test

Full lifecycle path tested: `ASSIGNED → SEEN → ACKNOWLEDGED → IN_PROGRESS → SUBMITTED → APPROVED`

| Step | Transition | Result | Detail |
|------|-----------|--------|--------|
| 2.1 | POST /api/project-tasks (create) | ✅ 201 | status=ASSIGNED |
| 2.2a | ASSIGNED → SEEN | ✅ 200 | status=SEEN |
| 2.2b | SEEN → ACKNOWLEDGED | ✅ 200 | status=ACKNOWLEDGED |
| 2.2c | ACKNOWLEDGED → IN_PROGRESS | ✅ 200 | completed_at=null |
| 2.3 | IN_PROGRESS → SUBMITTED | ✅ 200 | status=SUBMITTED |
| 2.4 | SUBMITTED → APPROVED (review) | ✅ 200 | completed_at=2026-07-13T17:07:15.089+00:00 |
| 2.5 | APPROVED → REVISION_REQUESTED | ✅ 400 | Rejected as expected (not in TRANSITIONS) |
| 2.6 | SUBMITTED → REJECTED (review) | ✅ 200 | completed_at=2026-07-13T17:07:30.747+00:00 |
| 2.7 | IN_PROGRESS → BLOCKED (blockers) | ✅ 201 | task_status=BLOCKED |
| 2.7b | BLOCKED completed_at | ✅ | completed_at=null (verified via DB) |
| 2.8 | CANCELLED behavior | ✅ | terminal=true, not in FINAL_WITH_COMPLETED_AT |

---

## 3. Reporting Endpoint Summary

| Endpoint | Status | HTTP |
|----------|--------|------|
| /api/reports/projects/summary | ✅ | 200 |
| /api/reports/tasks/summary | ✅ | 200 |
| /api/reports/tasks/overdue | ✅ | 200 |
| /api/reports/tasks/blocked | ✅ | 200 |
| /api/reports/users/performance | ✅ | 200 |
| /api/reports/meetings/summary | ✅ | 200 |

**Route confirmed:** `mount('/api/reports', handlers.reports)` in both `server.js` (line 142) and `api/index.js` (line 79).

---

## 4. completed_at Semantics

| Status | completed_at | Classification |
|--------|-------------|----------------|
| ASSIGNED | null | Initial |
| SEEN | null | Non-final |
| ACKNOWLEDGED | null | Non-final |
| IN_PROGRESS | null | Non-final |
| SUBMITTED | null | Non-final |
| **APPROVED** | **not null** | FINAL_WITH_COMPLETED_AT |
| **REJECTED** | **not null** | FINAL_WITH_COMPLETED_AT |
| REVISION_REQUESTED | null | Non-final |
| BLOCKED | null | Non-final (explicit null in handleBlocker) |
| CANCELLED | null | Terminal but not FINAL_WITH_COMPLETED_AT |
| **ARCHIVED** | **not null** | FINAL_WITH_COMPLETED_AT |
| OVERDUE | null | Informational |

**Source:** `backend/handlers/project-tasks.js` lines 6-10, 317-331, 453-456, 572-576.

---

## 5. Reporting Semantics

| Constant | Value | Source |
|----------|-------|--------|
| TERMINAL_STATUSES | APPROVED, REJECTED, CANCELLED, ARCHIVED | reports.js:27 |
| COMPLETED_STATUSES | APPROVED | reports.js:28 |
| overdue filter | Excludes all TERMINAL_STATUSES | reports.js:355 |
| in_progress includes | IN_PROGRESS, ASSIGNED, SEEN, ACKNOWLEDGED | reports.js:632 |
| avg_completion_time_days | Based on COMPLETED_STATUSES (APPROVED only) via task_status_history | reports.js:583 |

---

## 6. Syntax Check

| File | Method | Result |
|------|--------|--------|
| `backend/handlers/project-tasks.js` | `node -c` | ✅ |
| `backend/handlers/reports.js` | `node -c` | ✅ |
| `backend/server.js` | `node -c` | ✅ |
| `backend/api/index.js` | `node -c` | ✅ |

---

## 7. Safety Confirmations

| Item | Status |
|------|--------|
| Deploy | ❌ **NOT PERFORMED** |
| New migration executed | ❌ **NOT EXECUTED** |
| Legacy/deprecated files changed | ❌ **NOT MODIFIED** |
| Test records created during smoke test | ✅ All deleted (cleanup verified) |

---

## 8. Remaining Open Items

1. **Non-admin authorization smoke test** — Not tested in this round (no employee credentials available). Endpoint `GET /api/reports/users/performance` returns 403 for non-admins (confirmed in code).

2. **`supabase/add-reporting-indexes.sql`** — Review and execute if performance requires it. Currently all 6 reporting endpoints respond within timeout threshold.

3. **`avg_completion_time_days` accuracy** — Currently relies on `task_status_history` table. If history records are sparse, the value returns `null`. This is expected behavior per contract (reports.js:672).
