# UI Execution Contract (P2.0 — Phase 0)

> Status: FOUNDATION ONLY. Phase 0 creates the UI governance contract and shared
> design tokens. It does NOT wire tokens into any app, does NOT change runtime
> behavior, auth, API calls, database logic, webhook logic, or deployment config.
> This document is the contract that all future UI work (Phase 1+) must obey.

## Scope and non-goals

**In scope (Phase 0):**
- `docs/UI_EXECUTION_CONTRACT.md` (this file) — governance + standards.
- `ui/tokens.css` — stable CSS custom properties (single source of truth).
- `ui/tokens.js` — same token values as a browser global (`window.UI_TOKENS`)
  for no-bundler / UMD apps.

**Non-goals (Phase 0):**
- No component library, no layout primitives, no app refactoring.
- No changes to `admin-panel/`, `wholesale-portal/`, `messenger-app/`.
- No router, no new dependencies, no build pipeline changes.
- No backend, auth, RBAC, API-contract, database, migration, or webhook changes.
- No deployment, no environment/secret changes.

## Current architecture constraints

These constraints are FIXED for Phase 0 and must be respected by all future UI work:

- Three independent frontend apps, each with its own duplicated styles:
  - `admin-panel/` — single-file SPA (`index.html`), React 18 UMD + Babel Standalone
    (in-browser JSX), vanilla CSS, **no bundler**.
  - `wholesale-portal/` — single-file SPA (`index.html`), same React+Babel model,
    **no bundler**.
  - `messenger-app/` — SPA built via browserify+babelify to `bundle.min.js`
    (SoT = `components/index.jsx`); can `import` modules.
- No shared CSS/component library, no `node_modules` UI deps, no Tailwind/Bootstrap/MUI.
- State-based navigation (`setTab` + a menu array); no React Router; no deep-link
  consistency; no guarded routes.
- Each app embeds its own `:root` token block and JS token mirror. `messenger-app`
  has no CSS tokens (JS `C` object only).
- `bundle.min.js` is a GENERATED artifact — never hand-edit it; rebuild via
  `npm run build:min` after source changes.

**Hard rules (from task):** do NOT add Vite/Next/Webpack/React Router/Tailwind/MUI/
Chakra or any new runtime dependency. Do NOT modify business logic, auth, backend
handlers, API contracts, DB schema, migrations, webhook security, or env/secrets.

## Design token policy

- `ui/tokens.css` is the single source of truth for visual tokens.
- `ui/tokens.js` MUST mirror the same values (kept in sync manually until a build
  step enforces it). Both carry `version` (`ui/tokens.js`) and are reviewed together.
- Tokens are named with the `--ui-` prefix (CSS) / `ui` namespace (JS) to avoid
  collisions with existing app styles.
- Apps adopt tokens by linking `ui/tokens.css` (or reading `window.UI_TOKENS`) in
  later phases — Phase 0 does not require adoption.
- Token categories: color (brand/status/neutral/focus), typography, spacing, radius,
  shadow, z-index, motion, layout/breakpoints, focus ring.
- Never hardcode a token value inline when a token exists; deprecate the inline copy
  when the app migrates.

## Accessibility baseline

Minimum bar for all future UI (Phase 1+). Phase 0 itself adds no UI, so this is the
contract future work is measured against:

- Use semantic HTML (`<button>`, `<label>`, `<table>`, `<nav>`, `<dialog>`-equivalent).
- Every interactive control is keyboard-reachable and has a visible focus indicator.
  **Never** use `outline: none` without a visible replacement (use `--ui-focus-ring`).
- All form inputs have an associated `<label>` (`htmlFor`/`id`); errors use
  `aria-invalid` + `aria-describedby`; an error summary uses `role="alert"`.
- Status changes use `aria-live` (toasts/alerts: `polite`; errors: `assertive`).
- Dialogs/modals implement `role="dialog"`, `aria-modal="true"`, a focus trap,
  `Escape` to close, `autoFocus` on the first control, and return focus to the trigger.
- Decorative icons/images use `aria-hidden="true"` or empty `alt`.
- `lang="fa" dir="rtl"` on `<html>`; do not override document direction globally.

## RTL/LTR policy

- Default document direction is `rtl` with `lang="fa"` (Persian).
- Use CSS logical properties (`margin-inline`, `padding-inline`, `inset-inline`,
  `text-align: start`) instead of physical `left`/`right`.
- Latin-only values (auth tokens, product codes, IDs, phone numbers, URLs, IBAN,
  numeric amounts) MUST render LTR: wrap with the `.ui-latin-input` / `.ui-ltr`
  helper classes (defined in `ui/tokens.css`) or `direction: ltr; text-align: left`.
- Never force the whole document to `ltr`; only the specific input/value.

## Responsive baseline

- Mobile-first. Breakpoints: `sm 480px`, `md 768px`, `lg 1024px` (see tokens).
- Use `@media` consistently; do NOT rely on `window.innerWidth` JS guards alone.
- Navigation collapses to an off-canvas drawer + bottom tab bar below `md` (768px).
- Respect `env(safe-area-inset-*)` for notched devices.
- Test at 360px width minimum. `admin-panel` already has breakpoints; `wholesale-portal`
  and `messenger-app` currently have NONE and must add them when migrated.

## Forms policy

- Reusable `Field`/`Input` with real `<label>`, required marker, `aria-invalid`,
  and `aria-describedby` pointing to the error text.
- Client-side validation is UX-only and MUST NOT replace backend validation.
- Submit handlers disable the control + show a loading state; surface server errors
  via the error-state policy below.
- Latin/numeric inputs use `.ui-latin-input`.

## Tables policy

- Use real `<table>` with `<caption>`, `<th scope>`, and sticky header.
- Sortable columns expose a `<button aria-sort>`; pagination uses standard controls
  with aria labels.
- Provide empty, loading, and error row states.
- `wholesale-portal` currently uses div cards (no `<table>`) — must be migrated to a
  real `DataTable` in a later phase.

## Modals policy

- All modals use the accessible pattern: `role="dialog"`, `aria-modal="true"`,
  focus trap, `Escape` to close, `autoFocus`, return focus to trigger.
- Backdrop click closes; the dialog content stops propagation.
- Currently NONE of the three apps' modals meet this — Phase 1 must replace them.

## Navigation policy

- Keep state-based `tab` switching for now (no router in Phase 0/1 unless explicitly
  approved). When a router is introduced later, it must support deep links and
  guarded routes.
- Active item uses `aria-current="page"`.
- Sidebar/drawer items respect RBAC (see Security boundaries) and show locked state
  for unauthorized roles without leaking the existence of hidden features beyond
  what RBAC intends.

## Status / empty / error / loading states policy

Every data surface must define four states:
- **Loading:** spinner/skeleton + `aria-busy="true"`.
- **Empty:** clear empty message, no fake rows.
- **Error:** `role="alert"`, actionable message, retry control; never a raw stack.
- **Success/Status:** `aria-live="polite"` toast; destructive results use
  `aria-live="assertive"`.

## Security boundaries

Visual UI changes MUST NOT replace or weaken backend enforcement:
- Backend auth / RBAC / role checks remain the source of truth. UI guards are
  convenience only and must fail safe (hide + deny) — never grant access.
- Client-side form validation is UX only; the backend re-validates all input.
- Webhook security (UltraMsg `X-Webhook-Secret` shared-secret gate, fail-closed,
  `timingSafeEqual`) is OUT OF SCOPE for UI work and must not be altered.
- No secrets, tokens, or connection strings in UI code or tokens. Hardcoded Supabase
  anon keys found in `wholesale-portal/index.html` and `messenger-app/package.json`
  are a known security follow-up and are NOT addressed by Phase 0.

## Change-control rules for future UI work

1. Every new UI token/component starts from `ui/tokens.css` + `ui/tokens.js`.
2. Keep `ui/tokens.css` and `ui/tokens.js` value-synchronized; bump `version` on change.
3. App changes are reviewed for backend-dependency impact (admin-panel / wholesale-portal
   / messenger-app changes may affect `backend` API consumers).
4. Docs/AGENTS.md/package.json changes require a documentation-consistency check.
5. No new runtime dependencies without explicit approval (hard rule).
6. Accessibility, RTL, and responsive checks are required verification (see below)
   before any UI change is considered done.
7. `bundle.min.js` (messenger-app) must be rebuilt, not hand-edited.

## Required verification commands

Run after any future UI change (Phase 0 added files only; these must stay green):

```bash
node -c ui/tokens.js                              # JS syntax
node scripts/validate-products.js                 # product gate (no-op)
npm run check:db-source                           # no hardcoded secrets / DB source
npm run check:preflight                           # db-source + regression gates
git diff --check                                  # whitespace / trailing-newline check
```

App-level smoke (when apps are changed in later phases):
- `admin-panel` / `wholesale-portal`: browser load + a11y/responsive check.
- `messenger-app`: `npm run build:min` then browser load.
- Modal focus-trap + `role="dialog"` presence must be asserted for any modal change.

## Phase 0 readiness note (explicit)

- Phase 0 changes **NO runtime behavior**. It adds documentation and token files only.
- Phase 0 does **NOT** affect deploy readiness. Deploy remains **NO**.
- Production readiness remains **BLOCKED** by the unverified UltraMsg webhook auth
  transport (P1.1.2-D), independent of this UI work.
- No app was modified; no backend dependency impact; no package scripts changed.
