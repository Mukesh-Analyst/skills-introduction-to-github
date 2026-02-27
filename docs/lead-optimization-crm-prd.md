# Lead Optimization CRM — Product Requirements & Solution Blueprint

## 1) Product Definition

**Product name:** Lead Optimization CRM  
**Positioning:** A conversion-focused CRM built to increase lead-to-close ratio through strict follow-up discipline, missed-lead prevention, and accountability workflows.

### Primary outcomes
- Increase lead-to-close conversion rate.
- Eliminate lead leakage from delayed or missed follow-ups.
- Enforce consistent follow-up accountability across sales teams.
- Prioritize high-value opportunities for faster action.

### What this is *not*
- Not a generic contact repository.
- Not a passive pipeline tracker.
- Not a vanity dashboard.

---

## 2) Target Users

- **Sales Executives**: Work assigned leads, log interactions, maintain follow-up cadence.
- **Sales Managers**: Track team discipline, coach pipeline behavior, intervene on overdue opportunities.
- **Founders / Business Heads**: Monitor conversion health, forecast revenue, ensure process rigor.
- **Inside Sales Teams**: Handle high-volume outreach with structured follow-up rules.

---

## 3) Core Product Modules

## 3.1 Lead Management Module

Each lead record must include:
- Lead Name
- Company Name
- Phone
- Email
- Source (Website, Referral, Ads, Cold Call, LinkedIn, Other)
- Estimated Deal Value
- Industry
- Assigned Salesperson
- Created Date
- Last Contacted Date
- Next Follow-up Date
- Lead Stage (Hot / Warm / Cold)
- Lead Status (New / Contacted / Follow-up / Proposal Sent / Negotiation / Won / Lost)
- Notes (timestamp + user)
- Activity Timeline (auto-generated)

### Functional expectations
- Add/edit lead details with field-level validation.
- Single-lead view and bulk operations.
- Fast search by name, company, phone, email.
- Structured filters for source, status, stage, salesperson, date range, value range.

## 3.2 Lead Stage Intelligence

### Stage definitions
- **Hot (🔴):** High deal value + recent engagement + active response; follow-up required in 24–48 hours.
- **Warm (🟡):** Moderate engagement, interested but undecided; follow-up every 3–5 days.
- **Cold (🔵):** Low/no recent response, prolonged inactivity; route to nurture/re-engagement.

### Logic requirements
- Support **manual override** by authorized users.
- Support **auto-suggestion** based on configurable behavior signals:
  - Deal value threshold
  - Response recency
  - Email/call engagement
  - Follow-up completion discipline
- Auto-suggestions are advisory unless auto-apply is enabled by Admin.

## 3.3 Follow-Up Automation Engine (Critical)

### Missed lead detection (mandatory)
If:
- `next_follow_up_date < today`
- AND `lead_status NOT IN (Won, Lost)`

Then:
- Mark lead as **Missed** (system flag)
- Trigger red badge alert
- Send in-app notification to assigned salesperson
- Send email reminder to assigned salesperson
- If overdue by >= 48 hours: escalate to manager

### Additional cadence controls
- Daily scheduler to evaluate due/overdue follow-ups.
- Priority calculation that boosts Hot + overdue leads.
- “Snooze” action with reason logging and manager visibility.

## 3.4 Notification System

### Required channels
- In-app notifications
- Email alerts
- Daily digest email containing:
  - Leads due today
  - Overdue leads
  - Pending Hot leads

### Integration-ready channels (future-compatible)
- WhatsApp API adapter
- SMS gateway adapter

## 3.5 Comments & Activity Tracking

Per-lead accountability logs must include:
- Timestamped comments
- @mentions for teammates/managers
- Status change history
- Follow-up date change history
- Call outcomes (Connected, No Answer, Callback Requested, Not Interested, etc.)

### Immutable audit principle
- Store activity entries as append-only events (no silent overwrite).
- Capture actor, old value, new value, and event timestamp.

## 3.6 Dashboard (Business Intelligence)

### KPI widgets
- Total Leads
- Hot/Warm/Cold breakdown
- Conversion Rate (%)
- Overdue Leads Count
- Average Follow-up Delay
- Revenue Forecast = sum(estimated deal value for Hot + Warm)
- Salesperson performance leaderboard

### Required filters
- Date range
- Salesperson
- Lead source

### Manager insights
- Team follow-up compliance score
- Missed-follow-up trend line
- Aging pipeline by stage

## 3.7 Automation Rules Engine

Modular, configurable rule framework examples:
- If no response after 3 follow-ups -> move to Cold.
- If email opened 3 times -> suggest Warm.
- If deal value > X -> auto-mark/suggest Hot.
- If Hot lead untouched for 24 hours -> high-priority alert.

### Design principles
- Rule priority ordering
- Conflict resolution (first-match or weighted scoring)
- Dry-run mode (preview impact before activation)
- Rule versioning with activation history

---

## 4) Roles & Permissions

## Admin
- Full system access
- Configure rules and thresholds
- Manage users and role mapping
- Manage notification policies

## Sales Executive
- View/manage assigned leads
- Add comments, log activity, update status/follow-ups
- Receive due/overdue reminders

## Manager
- View team pipeline and performance
- Reassign leads
- Monitor missed follow-ups and escalations
- Approve exception workflows (optional)

---

## 5) UX & Interaction Requirements

- Clean, minimal, performance-oriented interface.
- **Kanban view** by stage/status for quick movement.
- **Table view** for high-density operations and filtering.
- **Lead detail page** with timeline-first layout.
- Mobile-responsive experience for on-the-go updates.
- Global quick search and saved filters.

### UX priorities
1. Speed to next action
2. Visibility of overdue risk
3. Clarity of accountability ownership

---

## 6) Suggested Data Model (Relational)

## Core entities
- `users`
- `leads`
- `lead_activities`
- `follow_ups`
- `notifications`
- `rules`
- `stages` (or enum + config table)

## Proposed schema outline

### `users`
- id (PK)
- full_name
- email (unique)
- role (admin, manager, sales_executive)
- manager_id (FK -> users.id, nullable)
- is_active
- created_at, updated_at

### `leads`
- id (PK)
- lead_name
- company_name
- phone
- email
- source
- estimated_deal_value
- industry
- assigned_user_id (FK -> users.id)
- stage (hot, warm, cold)
- status (new, contacted, follow_up, proposal_sent, negotiation, won, lost)
- created_at
- last_contacted_at
- next_follow_up_at
- is_missed (boolean)
- missed_since (nullable)
- created_by (FK -> users.id)
- updated_at

### `lead_activities`
- id (PK)
- lead_id (FK -> leads.id)
- actor_user_id (FK -> users.id)
- activity_type (comment, status_change, followup_change, call_outcome, assignment_change)
- old_value (JSON/text)
- new_value (JSON/text)
- message
- mentioned_user_ids (JSON array)
- created_at

### `follow_ups`
- id (PK)
- lead_id (FK -> leads.id)
- assigned_user_id (FK -> users.id)
- due_at
- completed_at (nullable)
- outcome
- status (scheduled, completed, missed, rescheduled)
- created_at, updated_at

### `notifications`
- id (PK)
- user_id (FK -> users.id)
- lead_id (FK -> leads.id, nullable)
- type (in_app, email, escalation)
- priority (low, medium, high, critical)
- title
- body
- is_read
- sent_at
- created_at

### `rules`
- id (PK)
- name
- description
- trigger_event
- condition_json
- action_json
- priority
- is_active
- version
- created_by (FK -> users.id)
- created_at, updated_at

---

## 7) Automation & Business Logic Blueprint

## 7.1 Missed Follow-up Worker (daily + hourly)
Pseudo-flow:
1. Query leads where `next_follow_up_at < now()` and status not won/lost.
2. Set `is_missed = true`, `missed_since = now()` if not already set.
3. Create in-app + email notifications for assigned owner.
4. If `now() - next_follow_up_at >= 48h`, create escalation notification to manager.
5. Add activity log entries for traceability.

## 7.2 Stage Suggestion Scoring (optional advanced)
- Compute behavior score from weighted signals:
  - Deal value percentile
  - Last engagement timestamp
  - Open/click/reply behavior
  - Number of unanswered follow-ups
- Map score bands to suggested stage.
- Present recommendation with rationale and one-click apply.

## 7.3 Rule Engine Execution Model
- Event-driven triggers (`lead_updated`, `follow_up_missed`, `email_event_received`, etc.).
- Evaluate active rules by priority.
- Write deterministic execution logs.
- Support retries/idempotency for external channel failures.

---

## 8) API-Ready Architecture (Scalable for 10k+ Leads)

### Service boundaries (initially modular monolith, microservice-ready)
- Lead Service
- Follow-up & Rules Service
- Notification Service
- Reporting Service

### API design direction
- REST endpoints with predictable filtering/pagination.
- Webhook/event interface for integrations.
- Token-based auth with RBAC middleware.

### Performance recommendations
- Indexed fields: `assigned_user_id`, `stage`, `status`, `next_follow_up_at`, `source`, `created_at`.
- Cursor pagination for lead lists.
- Read-optimized reporting tables/materialized views for dashboard.
- Async job queue for email/escalation processing.

---

## 9) Integrations (Current + Future-Ready)

### Immediate readiness
- SMTP/transactional email provider integration.
- CSV/Google Sheets export endpoint.
- Zapier-friendly webhook triggers.

### Planned readiness
- WhatsApp API adapter for reminders.
- SMS adapter for critical overdue alerts.

---

## 10) Success Metrics

Track post-launch impact:
- Lead-to-close conversion rate (% uplift)
- Follow-up SLA adherence (% on-time follow-ups)
- Overdue lead reduction (%)
- Average response lag (hours)
- Missed lead recovery rate (%)
- Salesperson discipline score (activity compliance index)

---

## 11) Future Scope

- AI lead scoring
- Predictive conversion probability
- Automated multi-step email sequences
- Lead aging heatmap
- Call recording and transcript linkage

---

## 12) Product Tone & Design Language

The system should feel:
- Professional
- Performance-driven
- Revenue-focused
- Uncluttered
- Built for disciplined sales execution

**North-star experience:** Every screen should help the user answer: _"Who needs follow-up now, what is at risk, and what action closes revenue fastest?"_
