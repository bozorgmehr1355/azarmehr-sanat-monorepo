# PROJECT_REALITY_SNAPSHOT.md

## ScorpionSales / Azarmehr Sanat
## Project Reality Snapshot

Date:
1405/05/01 - 2026/07/23

Status:
Discovery / Control Phase

Source of Truth:
GitHub main branch

Local machine files:
Not authoritative

---

# 1. Purpose

This document defines the current product reality of ScorpionSales.

The project must be treated as an operational CRM / business control system for Azarmehr Sanat, not only a set of technical endpoints.

The main question for every future task must be:

> Does this capability work for the real user?

Not only:

> Does the endpoint respond?

---

# 2. Product Definition

ScorpionSales is an operational CRM and internal business management system for Azarmehr Sanat.

It integrates:

- orders
- customers
- internal tasks
- meetings
- support tickets
- WhatsApp / Bale communications
- wholesale customer interactions
- management reporting

The product goal is to help the company know:

- who must do what
- which orders are pending
- which customers need follow-up
- which messages need response
- which meetings produced decisions
- which decisions became actionable tasks
- which sales/support actions are delayed

---

# 3. Current Product Modules

## 3.1 Customer and Order Management

User value:

- customer records
- order records
- order status
- follow-up status
- customer communication history
- pricing only through the official portal

Main users:

- manager
- sales team
- support team
- wholesale customer

Current status:

```text
YELLOW
```

Reason:

The project direction clearly includes customer/order management, but current operational completeness must be verified through backend/admin smoke tests.

Needed verification:

- customer list works
- order list works
- order detail works
- order status update works
- pricing path stays portal-only

---

## 3.2 Internal Task Management

User value:

- projects
- tasks
- subtasks
- assignee
- progress status
- performance reporting

Main users:

- manager
- employee

Current status:

```text
YELLOW
```

Reason:

The product requirement is clear, but actual implementation status must be confirmed from GitHub main and smoke tests.

Needed verification:

- task creation
- task assignment
- task status update
- employee daily task view
- manager task overview

---

## 3.3 Meetings and Decisions

User value:

- meeting registration
- decision extraction
- converting decisions into tasks
- follow-up on assigned actions

Main users:

- manager
- employees

Current status:

```text
GRAY / YELLOW
```

Reason:

The product requirement is defined, but implementation state is unclear until repo inspection.

Needed verification:

- meeting entity exists
- decisions can be recorded
- decisions can become tasks
- assigned actions are trackable

---

## 3.4 Omnichannel Communications

User value:

- WhatsApp
- Bale
- internal messaging
- broadcast
- inbox
- customer support communication

Main users:

- manager
- sales team
- support team
- customer

Current status:

```text
YELLOW
```

Reason:

WhatsApp Broadcast and support communication are known project areas, but user-level functionality must be smoke tested.

Needed verification:

- WhatsApp inbox visibility
- broadcast sending flow
- message history
- customer support response flow
- Bale integration status

---

## 3.5 Admin Panel

User value:

The manager can see and control:

- users
- reports
- tasks
- messages
- orders
- customer status
- performance indicators

Main users:

- manager
- admin

Current status:

```text
YELLOW
```

Reason:

Admin panel is a core product surface, but current completeness must be verified through UI/API smoke.

Needed verification:

- admin login
- dashboard loads
- user list
- order list
- task list
- message/inbox view
- report view

---

# 4. Technical Services

The main technical services currently identified are:

| Service | Product Role | Current Status |
|---|---|---|
| `backend/` | Core API and business logic | YELLOW |
| `admin-panel/` | Manager/admin dashboard | YELLOW |
| `messenger-app/` | Messaging surface | GRAY / YELLOW |
| `wholesale-portal/` | Customer/wholesale order portal | YELLOW |
| `whatsapp-broadcast-api/` | WhatsApp automation and broadcast | YELLOW |

---

# 5. User Groups

## 5.1 Manager

Needs to know:

- task status
- delayed orders
- customers without follow-up
- meeting outputs
- employee performance
- communication status

Critical screens:

- dashboard
- orders
- tasks
- meetings
- reports
- messages

---

## 5.2 Employee

Needs to know:

- today's tasks
- assigned follow-ups
- task status update path
- meeting-derived action items
- messages requiring response

Critical screens:

- my tasks
- task detail
- follow-up list
- internal messages

---

## 5.3 Customer / Wholesaler

Needs to:

- register order
- see order status
- follow up officially
- receive price only through the portal

Critical screens:

- order registration
- order status
- pricing request / official quote path

---

## 5.4 Sales / Support Team

Needs to:

- manage customers
- view messages
- follow up through WhatsApp and Bale
- close support tickets
- track customer communication

Critical screens:

- customers
- leads
- messages
- support tickets
- follow-up queue

---

# 6. Operating Rule

From this point forward, technical work must be connected to product capability.

Bad task format:

```text
target: whatsapp-broadcast-api
goal: syntax check
```

Correct task format:

```text
feature: WhatsApp message management in admin panel
user: manager / sales
goal: view inbox and send broadcast
technical target: whatsapp-broadcast-api + admin-panel
test: user can see messages and trigger broadcast from admin
```

---

# 7. Gate 5 Orientation

Gate 5 must not be treated only as technical health.

Gate 5 must answer:

```text
Can the real user complete the intended operational flow?
```

Minimum Gate 5 product flows:

1. Manager can log in and see dashboard.
2. Manager can see orders/customers needing follow-up.
3. Sales/support can see customer messages.
4. Employee can see assigned tasks.
5. Customer/wholesaler can use official portal path.
6. WhatsApp/Bale communication status is visible or explicitly marked unavailable.
7. Pricing remains portal-only.

---

# 8. Current Risk Areas

| Risk | Description | Action |
|---|---|---|
| Technical-only progress | Endpoints may exist without user-complete flows | Convert tests to product smoke |
| Multiple open fronts | Backend, admin, WhatsApp, support, tasks, migration all open | Feature freeze until Gate 5 clarity |
| Source of truth confusion | Local files may be outdated | Use GitHub main only |
| Parallel management logic | Risk of creating another project system | Control Agent must stay read-only |
| Pricing leakage | Price must not be sent through informal channels | Enforce portal-only pricing |

---

# 9. Feature Freeze Rule

Until Gate 5 is verified:

```text
No new feature development.
No new operational database.
No parallel task system.
No new workflow engine.
No runtime behavior change unless required to fix a Gate 5 blocker.
```

Allowed work:

```text
- read-only discovery
- smoke tests
- preflight checks
- fixing first blocker only
- retesting same blocker
- documentation derived from GitHub main
```

---

# 10. Next 5 Actions

## Action 1

Target:

```text
backend/
```

Goal:

```text
Run backend preflight and smoke for Gate 5 baseline.
```

Output:

```text
PASS
or
BLOCKED with first exact error
```

---

## Action 2

Target:

```text
admin-panel/
```

Goal:

```text
Verify manager login and dashboard load.
```

Output:

```text
PASS
or
BLOCKED with first exact error
```

---

## Action 3

Target:

```text
backend/ leads and customers
```

Goal:

```text
Verify customer/lead list works from API.
```

Output:

```text
PASS
or
BLOCKED with first exact error
```

---

## Action 4

Target:

```text
whatsapp-broadcast-api/
```

Goal:

```text
Verify WhatsApp message/broadcast service health without sending real broadcast unless explicitly approved.
```

Output:

```text
PASS
or
BLOCKED with first exact error
```

---

## Action 5

Target:

```text
wholesale-portal/
```

Goal:

```text
Verify official customer order/pricing path exists and pricing remains portal-only.
```

Output:

```text
PASS
or
BLOCKED with first exact error
```

---

# 11. Management Conclusion

The project should continue, but under controlled execution.

The correct path is:

```text
GitHub main
→ Project Reality Snapshot
→ Gate 5 real smoke
→ first blocker
→ small fix
→ retest
→ next target
```

The project must not return to broad parallel development until the real user flows are verified.

Required output:
PASS with:
- target
- goal
- branch
- commit hash
- file path
- next action

or

BLOCKED with:
- first exact error
- failed command
- next action
