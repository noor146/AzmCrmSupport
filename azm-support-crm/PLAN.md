# Project Plan — AZM Support CRM

Breakdown of [SDD.md](./SDD.md) into Epics/Stories for tracking (Jira or
otherwise). MVP epics are already implemented (see SDD §11 status log);
Phase 2 epics are backlog, in priority order.

## MVP — Done

### Epic: Foundation (Auth & i18n)
- Story: Email/password login with JWT — **Done**
- Story: EN/AR language toggle with RTL layout — **Done**

### Epic: Customer Management
- Story: Create/list/search customers — **Done**
- Story: View/edit/delete a customer — **Done**

### Epic: Ticket Management
- Story: Create a ticket against a customer (category/priority) — **Done**
- Story: Change ticket status/assignee — **Done**
- Story: Ticket activity/event log — **Done**
- Story: Delete a ticket — **Done**

### Epic: Agent Dashboard
- Story: List tickets assigned to the logged-in agent — **Done**
- Story: Filter tickets by status — **Done**

### Epic: Knowledge Base
- Story: Create/edit/delete articles with tags — **Done**
- Story: Public search by title/tag — **Done**

## Phase 2 — Backlog (priority order)

### Epic: Customer Self-Service Portal
- Story: Customer login/signup (separate from agent auth)
- Story: Customer submits a ticket
- Story: Customer tracks their own ticket status/history

### Epic: SLA & Automation
- Story: Define response/resolution targets per priority
- Story: Auto-assignment rules for new tickets
- Story: Escalation rules when SLA breached
- Story: Notifications/alerts (email at minimum)

### Epic: Reports & Management Dashboards
- Story: Ticket volume/SLA performance report
- Story: Agent performance report
- Story: Customer satisfaction (CSAT) tracking
- Story: Management dashboard (aggregated view)

### Epic: AI Features
- Story: AI-generated ticket summaries
- Story: AI-suggested replies
- Story: Automatic ticket categorization
- Story: AI chatbot on the customer portal

### Epic: Additional Communication Channels
- Story: WhatsApp inbound ticket creation
- Story: SMS inbound ticket creation
- Story: Live chat widget

### Epic: Odoo ERP Integration
- Story: Odoo API client (JSON-RPC) — read `res.partner`
- Story: One-way customer sync (Odoo → CRM)
- Story: Push ticket summary to partner chatter (optional/decide later)

### Epic: Roles, Permissions & Audit
- Story: Role model beyond agent/admin
- Story: Per-role permission checks on API routes
- Story: Audit log of sensitive actions

### Epic: Platform (Multi-branch & Branding)
- Story: Multi-department/multi-branch data model
- Story: Custom branding (logo/colors) per tenant

---
A ready-to-import version of this breakdown is in
[jira_import.csv](./jira_import.csv) — import via Jira Settings → System →
External System Import → CSV.
