# Project, Task, Evidence, Meeting & AI Assistant MVP Plan

## 1. Purpose

This document is the implementation reference for the new Project, Task, Evidence, Meeting and AI Assistant module.

The module must provide a controlled workflow for:
- Project definition
- Task creation and assignment
- Employee acknowledgement
- Work progress tracking
- Blocker reporting
- Evidence-based submission
- Manager review
- Meeting documentation
- AI-assisted summaries and drafts
- Audit trail and process compliance reporting

This document is the source plan for implementation. Developers and automation agents must not make unrelated changes.

---

## 2. Mandatory Project Rules

Before any implementation, the developer or automation agent must read:

- docs/PROJECT_MAP.md
- docs/DEVELOPMENT_RULES.md

The implementation must follow the source of truth paths defined in those documents.

Do not change legacy or deprecated folders unless explicitly instructed.

Do not use:
- azarmehr-backend-main.vercel.app
- backend-deploy/

Do not hardcode any new API_BASE.

Do not deploy unless explicitly requested.

After any change, report the related smoke test for the affected app/service.

If it is not clear whether a file is production or legacy, do not change it and report the uncertainty first.

---

## 3. Target Apps and Services

The expected source-of-truth areas are:

- backend/
- admin-panel/
- messenger-app/

The implementation order is:

1. backend/
2. admin-panel/
3. messenger-app/

No work should start in UI before the backend data model, API contract and workflow statuses are defined.

---

## 4. Module Name

Persian:

ماژول مدیریت پروژه، وظایف، مستندات و ارزیابی عملکرد

English:

Project, Task, Evidence & Performance Management Module

Supporting AI module:

Persian:

دستیار هوشمند جلسات و مستندات

English:

AI Meeting & Document Assistant

---

## 5. Core Principles

### 5.1 Official Records

Only confirmed user actions are official.

AI output is never official until a user reviews and confirms it.

### 5.2 Evidence-Based Work

A task is not considered completed unless the required evidence is submitted.

Evidence can include:
- File
- Image
- Link
- Text explanation
- Screenshot
- Document number
- Customer/order reference
- Checklist result

### 5.3 Audit Trail

Important actions must be recorded with:
- Actor
- Action type
- Timestamp
- Previous value when applicable
- New value when applicable
- Related entity
- Metadata

### 5.4 Process Enforcement

The system must make the correct workflow easy and the wrong workflow difficult.

Employees should see only the next allowed actions based on the current task status.

### 5.5 No Hidden Work

Rules:
- Work not recorded in the system is not official.
- Blockers not recorded in time are not official reasons for delay.
- Submissions without required evidence are not official submissions.

---

## 6. MVP Scope

The MVP includes:

- Project management
- Project members
- Task creation
- Task assignment
- Task status lifecycle
- Employee seen/acknowledgement tracking
- Start work tracking
- Progress updates
- Blocker reports
- Evidence-based submissions
- Manager review
- Revision request
- Task comments
- Notifications
- Audit logs
- Meeting records
- Meeting decisions
- Meeting action items
- AI draft storage
- Converting approved meeting action items to official tasks
- Process compliance reporting

---

## 7. Out of Scope for MVP

The following are excluded from phase 1:

- Advanced Gantt chart
- Advanced Kanban automation
- Complex budgeting
- Financial timesheets
- Fully automatic AI decisions
- AI-based employee performance scoring
- Independent mobile application
- Unlimited nested subtasks
- Complex workflow automation engine
- Automatic deadline changes by AI
- Automatic task approval by AI

---

## 8. Task Status Lifecycle

The MVP task statuses are:

- ASSIGNED
- SEEN
- ACKNOWLEDGED
- IN_PROGRESS
- NEEDS_CLARIFICATION
- BLOCKED
- SUBMITTED
- REVISION_REQUESTED
- APPROVED
- REJECTED
- OVERDUE
- CANCELLED
- ARCHIVED

Recommended primary happy path:

ASSIGNED → SEEN → ACKNOWLEDGED → IN_PROGRESS → SUBMITTED → APPROVED

Revision path:

SUBMITTED → REVISION_REQUESTED → IN_PROGRESS → SUBMITTED → APPROVED

Clarification path:

ASSIGNED/SEEN/ACKNOWLEDGED → NEEDS_CLARIFICATION → ACKNOWLEDGED/IN_PROGRESS

Blocker path:

IN_PROGRESS → BLOCKED → IN_PROGRESS

Cancellation path:

Any active status → CANCELLED

Archive path:

APPROVED/REJECTED/CANCELLED → ARCHIVED

---

## 9. Employee Workflow

### 9.1 Task Assigned

When a task is assigned, the employee receives a notification.

System records:
- assigned_at
- assignee_id
- assigned_by

Allowed employee actions:
- Mark as seen
- Request clarification

---

### 9.2 Task Seen

When the employee opens the task, the system records:

- seen_at

Allowed employee actions:
- Acknowledge task
- Request clarification

---

### 9.3 Task Acknowledged

When the employee confirms responsibility, the system records:

- acknowledged_at

Allowed employee actions:
- Start work
- Request clarification

---

### 9.4 Work Started

When the employee starts, the system records:

- started_at

Status becomes:

IN_PROGRESS

Allowed employee actions:
- Add progress update
- Report blocker
- Submit work

---

### 9.5 Progress Update

For long-running tasks, progress updates can be required.

A progress update should include:
- Short text
- Progress percentage
- Current condition:
  - On track
  - Risk of delay
  - Blocked
- Next step
- Optional attachment

For tasks requiring periodic reports:
- If the report is missing, the system must flag missing_progress_update.

---

### 9.6 Blocker Report

A blocker report should include:
- Blocker type
- Description
- Start time
- Effect on task
- Required help
- Expected delay
- Optional evidence

If a task becomes overdue and no blocker was registered before the deadline, the system must flag:

overdue_without_blocker

---

### 9.7 Work Submission

Submission must include:
- Summary
- Evidence according to task requirements
- Optional notes
- Optional attachments

If evidence is required, submission must not be accepted without evidence.

Status becomes:

SUBMITTED

---

### 9.8 Manager Review

Manager can:
- Approve
- Reject
- Request revision

If approved:
- status = APPROVED
- approved_at is recorded

If revision requested:
- status = REVISION_REQUESTED
- revision reason is required

If rejected:
- status = REJECTED
- rejection reason is required

---

## 10. Manager Workflow

Managers use admin-panel.

Manager capabilities in MVP:

- Create project
- Edit project
- Add project members
- Create task
- Assign task
- Set due date
- Set priority
- Set required evidence
- Set acceptance criteria
- View task status
- View seen/acknowledged/start times
- View progress updates
- View blockers
- View submissions
- Approve task
- Request revision
- Reject task
- Register meeting
- Register meeting decisions
- Register meeting action items
- Convert approved action item to official task
- View process compliance report

---

## 11. AI / NotebookLM Assistant Rules

AI is an assistant layer only.

AI can:
- Summarize
- Rewrite
- Structure
- Extract decisions
- Extract action items
- Prepare draft task briefs
- Prepare draft progress reports
- Prepare draft blocker reports
- Prepare draft submission summaries
- Prepare draft manager summaries

AI must not:
- Approve tasks
- Reject tasks
- Change deadlines
- Assign final performance scores
- Automatically create official tasks without manager approval
- Automatically change official status without user confirmation
- Replace audit records

All AI outputs must be stored as drafts until confirmed.

---

## 12. AI Features in MVP

The MVP AI features are:

- AI Task Brief
- AI Progress Rewrite
- AI Blocker Structuring
- AI Submission Summary
- AI Meeting Summary
- AI Decision Extraction
- AI Action Item Extraction
- AI Related Document Summary
- AI Manager Review Summary

Persian labels:

- خلاصه هوشمند وظیفه
- بازنویسی هوشمند گزارش پیشرفت
- ساختاردهی هوشمند مانع
- جمع‌بندی هوشمند تحویل کار
- خلاصه هوشمند جلسه
- استخراج تصمیم‌های جلسه
- استخراج اقدام‌های جلسه
- خلاصه اسناد مرتبط
- خلاصه مدیریتی برای بررسی

---

## 13. Meeting Workflow

Manager can create a meeting record.

Meeting record may include:
- Title
- Date
- Participants
- Transcript
- Notes
- Uploaded files
- AI summary draft

AI can extract:
- Summary
- Decisions
- Action items
- Risks
- Open questions
- Suggested assignees
- Suggested deadlines

Manager must review each extracted item.

Action item options:
- Convert to official task
- Save as decision
- Keep for later review
- Reject

Only manager-approved action items can become official tasks.

---

## 14. Process Compliance Controls

The system should track objective process behavior.

Recommended flags:

- late_seen
- late_acknowledged
- late_started
- missing_progress_update
- overdue_without_blocker
- submitted_without_required_evidence
- revision_requested
- ignored_revision
- no_update_24h
- no_update_48h
- no_update_72h

Recommended metrics:

- Tasks assigned
- Tasks seen on time
- Tasks acknowledged on time
- Tasks started on time
- Progress reports submitted
- Progress reports missed
- Blockers reported on time
- Tasks submitted on time
- Tasks approved
- Tasks requiring revision
- Overdue tasks without blocker

This must be treated as process compliance, not final human performance judgment.

---

## 15. Suggested Database Tables

Exact migration details must be aligned with the existing backend and Supabase schema.

Suggested MVP tables:

- projects
- project_members
- tasks
- task_comments
- task_progress_updates
- task_blockers
- task_submissions
- task_status_history
- task_attachments
- notifications
- audit_logs
- meetings
- meeting_decisions
- meeting_action_items
- meeting_files
- ai_drafts

If existing tables already provide equivalent functionality, reuse or extend them safely instead of duplicating.

All migrations must be tracked according to the project migration standard.

---

## 16. Suggested Backend APIs

Exact routes must follow existing backend conventions.

Suggested project APIs:

- GET /api/projects
- POST /api/projects
- GET /api/projects/:id
- PATCH /api/projects/:id
- POST /api/projects/:id/members

Suggested task APIs:

- GET /api/tasks
- POST /api/tasks
- GET /api/tasks/:id
- PATCH /api/tasks/:id
- POST /api/tasks/:id/seen
- POST /api/tasks/:id/acknowledge
- POST /api/tasks/:id/start
- POST /api/tasks/:id/progress
- POST /api/tasks/:id/blockers
- POST /api/tasks/:id/submit
- POST /api/tasks/:id/review
- POST /api/tasks/:id/comments

Suggested meeting APIs:

- GET /api/meetings
- POST /api/meetings
- GET /api/meetings/:id
- PATCH /api/meetings/:id
- POST /api/meetings/:id/decisions
- POST /api/meetings/:id/action-items
- POST /api/meeting-action-items/:id/convert-to-task

Suggested AI draft APIs:

- GET /api/ai-drafts
- POST /api/ai-drafts
- GET /api/ai-drafts/:id
- PATCH /api/ai-drafts/:id
- POST /api/ai-drafts/:id/approve
- POST /api/ai-drafts/:id/reject

---

## 17. Admin Panel MVP Screens

Admin-panel screens:

- Projects list
- Project detail
- Project members
- Tasks list
- Task detail
- Task creation form
- Task review page
- Meetings list
- Meeting detail
- Meeting action items
- Process compliance dashboard

Manager should be able to:
- See pending reviews
- See overdue tasks
- See blockers
- See missing reports
- See tasks waiting for acknowledgement
- Convert meeting action items to tasks

---

## 18. Messenger App MVP Screens

Messenger-app screens:

- My tasks
- Task detail
- Required actions
- Progress update form
- Blocker form
- Submission form
- Notifications

Employee should see simple action buttons only.

Examples:

For ASSIGNED:
- مشاهده کردم
- نیاز به توضیح دارم

For SEEN:
- قبول کردم
- نیاز به توضیح دارم

For ACKNOWLEDGED:
- شروع کار

For IN_PROGRESS:
- ثبت پیشرفت
- ثبت مانع
- تحویل نتیجه

For REVISION_REQUESTED:
- مشاهده درخواست اصلاح
- ارسال مجدد

---

## 19. Notification Rules

Recommended MVP notifications:

- Task assigned
- Task not seen after threshold
- Task seen but not acknowledged
- Task due soon
- Progress update due
- Progress update missing
- Blocker reported
- Task submitted
- Revision requested
- Task approved
- Task rejected
- Meeting action item assigned

Notification implementation must reuse existing notification infrastructure if available.

---

## 20. Security and RBAC

Exact roles must follow existing auth/RBAC implementation.

Expected access rules:

Admin/Manager:
- Create projects
- Create tasks
- Assign tasks
- Review submissions
- Manage meetings
- Convert action items to tasks
- View reports

Employee:
- View assigned tasks
- Mark seen
- Acknowledge
- Start work
- Add progress update
- Report blocker
- Submit work
- Comment on own tasks

AI:
- No direct official authority
- Only draft generation/storage

All APIs must validate:
- Authenticated user
- Role permission
- Ownership or project membership
- Allowed status transition

---

## 21. Audit Log Requirements

Audit logs should be created for:

- Project created
- Project updated
- Member added/removed
- Task created
- Task assigned
- Task seen
- Task acknowledged
- Task started
- Progress update added
- Blocker reported
- Submission created
- Review decision made
- Status changed
- Meeting created
- Decision added
- Action item added
- Action item converted to task
- AI draft created
- AI draft approved/rejected

---

## 22. Implementation Phases

### Phase 0 - Discovery

Read:
- docs/PROJECT_MAP.md
- docs/DEVELOPMENT_RULES.md

Report:
- Source of truth paths
- Existing backend structure
- Existing auth/RBAC
- Existing notification system
- Existing upload/storage system
- Existing users/employees tables
- Existing audit logs
- Existing smoke test commands
- Legacy/deprecated paths

No code changes in this phase.

---

### Phase 1 - Backend Foundation

Implement:
- Database migrations
- Models/services according to existing backend convention
- Status lifecycle
- Audit logs
- Basic notifications
- Project APIs
- Task APIs
- Meeting APIs
- AI draft APIs

Smoke test:
- Backend start/build/test command according to project rules
- Basic API health check
- Basic create/list flow if safe

---

### Phase 2 - Admin Panel

Implement:
- Project list/detail
- Task list/detail/create
- Task review
- Meetings
- Meeting action items
- Process compliance dashboard

Smoke test:
- Admin-panel build
- Relevant route/page load test according to project rules

---

### Phase 3 - Messenger App

Implement:
- My tasks
- Task detail
- Seen/acknowledge/start actions
- Progress update
- Blocker report
- Submission form
- Notifications

Smoke test:
- Messenger-app build
- Relevant route/page load test according to project rules

---

### Phase 4 - AI Assistant Layer

Implement:
- AI draft storage
- Manual AI text input/paste flow if direct model integration is not yet available
- Draft approval/rejection flow
- Meeting summary/action extraction draft flow
- Convert approved action item to task

Smoke test:
- Backend AI draft endpoints
- Admin-panel meeting draft flow
- Messenger-app task draft helpers if implemented

---

## 23. Hard Safety Rules for Automation Agents

Automation agents must follow these rules:

1. Read docs/PROJECT_MAP.md and docs/DEVELOPMENT_RULES.md first.
2. Work only in the selected target app/service.
3. Do not touch legacy/deprecated code.
4. Do not deploy.
5. Do not hardcode API_BASE.
6. Do not use azarmehr-backend-main.vercel.app.
7. Do not modify unrelated files.
8. Do not reformat large unrelated files.
9. Do not change environment files unless explicitly instructed.
10. Do not create duplicate systems if an existing system can be reused.
11. Report every changed file.
12. Report smoke test result after changes.
13. If uncertain, stop and ask.

---

## 24. Required Report Format After Any Change

After any implementation task, report:

- Target app/service
- Files changed
- Summary of changes
- Why the change was needed
- Related routes/APIs/screens
- Database migrations if any
- Environment variables changed if any
- Smoke test command
- Smoke test result
- Risks or follow-up tasks

---

## 25. Initial Next Step

The next step is Phase 0 discovery.

No code should be written before discovery is complete.

The discovery report must identify:
- Actual source-of-truth folders
- Existing app structures
- Existing schema/migration pattern
- Existing auth/RBAC
- Existing notifications
- Existing storage/upload
- Existing audit logs
- Smoke test commands
- Legacy/deprecated areas
