# ScorpionSales Design System

Status: Active  
Scope: All frontend apps  
Version: DS-Q1.1  
Date: 1405/04/30

## Purpose

This document defines the shared visual design tokens and UI rules for all ScorpionSales / Azarmehr Sanat frontend apps.

Target apps:
- admin-panel
- wholesale-portal
- messenger-app
- whatsapp-broadcast-api UI surfaces
- future CRM/order/support/admin interfaces

## Core Rules

1. Use shared tokens instead of hardcoded visual values.
2. No new component library unless explicitly approved.
3. No new dependencies unless explicitly approved.
4. No layout refactor unless explicitly approved.
5. RTL support is mandatory.
6. Responsive behavior is mandatory.
7. Accessibility checks are mandatory before finalizing UI changes.
8. Persian UI must prioritize readability over decorative styling.
9. IRANSans must be the first preferred font when available.
10. Gold is an accent color only, not a full background color.

## Visual Direction

Professional dark admin interface:

- charcoal / graphite surfaces
- neutral gray borders and text
- gold accent
- limited royal red for danger states
- limited purple for secondary/info accents
- no brown palette
- no warm parchment/beige surfaces

## Typography
```js
FF = "'IRANSans', 'Vazirmatn', Tahoma, sans-serif"
```

Rules:
- Persian readability first.
- Do not use decorative Latin fantasy fonts in production Persian admin UI.
- If IRANSans is unavailable, fallback to Vazirmatn, then Tahoma.

## Color Tokens

```js
C = {
  bg: "#0B0D10",
  surface: "#14171C",
  surfaceAlt: "#1B1F26",
  surfaceHover: "#242A33",

  border: "#2F3742",
  borderLight: "#46515F",

  primary: "#CA8A04",
  primaryDim: "#CA8A0420",
  primaryHover: "#EAB308",

  danger: "#991B1B",
  dangerDim: "#991B1B20",

  purple: "#581C87",
  purpleDim: "#581C8720",

  success: "#22C55E",
  successDim: "#22C55E20",

  info: "#64748B",
  infoDim: "#64748B20",

  warning: "#CA8A04",
  warningDim: "#CA8A0420",

  blue:  "#3B82F6",
  blueDim:  "#3B82F620",

  indigo: "#8B5CF6",
  indigoDim: "#8B5CF620",

  amber: "#F59E0B",
  amberDim: "#F59E0B20",

  cyan:  "#06B6D4",
  cyanDim:  "#06B6D420",

  text: "#F3F4F6",
  textMuted: "#CBD5E1",
  textDim: "#94A3B8"
}
```

> **Note:** `C.teal` is **undefined** (not defined in any implementation) and appears in 4 admin-panel usage sites. Those sites must be migrated to `C.cyan`. Do not add `C.teal` as a token; use `C.cyan` instead.

## Forbidden Palette

Do not use the old brown/warm palette:

```
#1A0F0A
#2C1A10
#3D2517
#4A2F1E
#4A2E1D
#5C3D2E
#6B4A38
#7A523D
#F5E6D3
#BFA98A
#8B7355
```

Exception:
- Gold values such as `#CA8A04`, `#EAB308`, and intentionally used gold border/shadow values are allowed.

## Radius Tokens

```js
RD = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12
}
```

Rules:
- Default admin primitive radius should prefer `4px` to `8px`.
- Avoid inconsistent hardcoded radius values.
- Larger radius requires explicit component-level reason.

## Shadow Tokens

```js
SH = {
  sm: "0 1px 3px rgba(202,138,4,.15)",
  md: "0 2px 8px rgba(202,138,4,.20)",
  glow: "0 0 20px rgba(202,138,4,.40)"
}
```

Rules:
- Gold glow is allowed only for primary CTA or active/highlight state.
- Do not use excessive glow on dense admin screens.
- Shadows must not reduce text readability.

## Base Components Guidance

### Cards

Cards should use:

```js
{
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  boxShadow: SH.sm,
  color: C.text
}
```

### Inputs

Inputs should use:

```js
{
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  color: C.text
}
```

Focus state:
- border should move toward `C.primary`
- no layout shift

### Buttons

Primary:
- background: `C.primary`
- text: `#0B0D10`
- optional glow only for main CTA

Danger:
- use `C.danger`
- avoid hardcoded red values

Outline:
- border: `C.borderLight`
- text: `C.text`

### Badges / Status Pills

Use semantic tokens:
- success → `C.success`
- danger → `C.danger`
- warning → `C.warning`
- info → `C.info`
- neutral → gray tokens

Do not create new badge colors without adding token.

## RTL Rules

1. All Persian interfaces must support RTL.
2. Use logical alignment where possible.
3. Avoid left/right hardcoding unless required.
4. Numbers, codes, SKUs, phone numbers and IDs may remain LTR inside RTL layout.

## Responsive Rules

Minimum breakpoints:

```js
BP = {
  sm: 480,
  md: 768,
  lg: 1024
}
```

Before finalizing UI changes, check:
- mobile width
- tablet width
- desktop width
- no horizontal overflow
- readable Persian labels

## Accessibility Rules

Before finalizing UI changes:
- text contrast must be readable
- buttons must have visible states
- inputs must have labels or clear context
- danger messages must not rely on color alone
- modals must not hide critical actions

## Implementation Policy

Allowed by default:
- token-level visual updates
- replacing hardcoded colors with tokens
- small primitive cleanup after smoke test

Requires explicit approval:
- new component library
- new dependencies
- app-wide layout refactor
- router changes
- build pipeline changes
- backend/API changes
- DB migration
- deploy

## Current Reference Implementation

The current reference implementation is:

```
admin-panel/index.html
DS-Q1.1 charcoal/neutral-gray skin
```

This implementation passed:
- code-level token verification
- login visual smoke
- no backend change
- no DB write
- no deploy
