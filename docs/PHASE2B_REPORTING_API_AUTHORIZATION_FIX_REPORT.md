# Phase 2B Reporting API Authorization Fix Report

Date: 1405/04/22 - 2026/07/13

## Target
backend/

## Finding
Critical Authorization Bypass / IDOR in Reporting API explicit project_id filters.

## Root Cause
Some report handlers accepted project_id from query parameters and applied it directly to Supabase queries without validating it against the authenticated user's authorized project scope.

## Affected Area
backend/handlers/reports.js

## Fix Summary
- meetingsSummary now uses centralized project scope resolution.
- applyProjectScope supports optional columnName.
- Admin-only endpoint authorization order corrected.
- Forbidden project_id for non-admin now resolves to scope='none'.
- Malformed/unauthorized project access no longer leaks data.

## Expected Security Behavior
- Non-admin without project_id: only member projects.
- Non-admin with allowed project_id: allowed project data.
- Non-admin with forbidden project_id: 200 empty/zero response.
- Non-admin admin-only endpoint: 403.
- No token: 401.
- Invalid token: 401.

## Verification
Non-admin regression smoke test:
39/39 passed.

## Files Modified
- backend/handlers/reports.js
- backend/smoke-test-nonadmin-auth.js

## Safety
- Deploy: NO
- Migration/schema change: NO
- Legacy/deprecated changes: NO
- Hardcoded API_BASE: NO
- Secrets printed: NO
- Fixture cleanup: DONE

## Final Status
PASSED — Critical IDOR fixed and verified.