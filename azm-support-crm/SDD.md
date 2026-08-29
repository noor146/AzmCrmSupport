# SDD — Customer Support CRM (AZM Squad Full-Stack Task)

Software Design Document. Written so an AI coding agent (or a human dev) can
implement, extend, or resume this project without any conversation history —
every decision needed to write code should be answered below. Update this
file whenever scope or design decisions change; treat it as the source of
truth, not the code comments.

## 1. Origin & Goal

Internal AZM Squad task (announced 2026-08-24, due 2026-08-26): each engineer
builds a project demonstrating full-stack skills. The assigned spec is
`azm_squad_customer_support_crm.pdf` (Drive folder "Full stack task") —
a features list for a Customer Support CRM.

Decision: build a **standalone web app** (own DB, own auth) rather than an
Odoo module, so it can later be wired into the company's Odoo ERP as an
external system via API — not embedded in Odoo from day one.

## 2. Scope

The PDF spec lists 12 feature areas. Given the 1-day deadline, this document
splits them into an MVP that gets built now and a Phase 2 backlog. Do not
silently expand MVP scope — if you finish early, move to Phase 2 in order.

### MVP (build first)
1. **Customer Management** — CRUD customer profiles, contact details, free-text notes.
2. **Ticket Management** — CRUD tickets, category, priority, status, assignment to an agent, status history log.
3. **Agent Dashboard** — list of tickets assigned to the logged-in agent, basic filters (status/priority).
4. **Knowledge Base** — CRUD articles (title, body, tags), public read-only listing + search by title/tag.
5. **Auth** — email/password login, JWT, single role model for now (`agent`; `admin` is `agent` + `is_admin` flag).
6. **i18n** — UI strings externalized in `frontend/src/i18n/{en,ar}.json`; language toggle; RTL layout when `ar` is active.

Explicitly OUT of MVP: WhatsApp/SMS/live-chat channels (ticket creation stays
web-form + email-address field only), SLA timers/automation, AI features,
customer self-service portal, reports/dashboards beyond the agent ticket
list, audit logs, multi-branch/multi-company, custom branding, ERP integration
itself (only designed for, not built).

### Phase 2 backlog (in priority order)
1. Customer self-service portal (submit/track own tickets)
2. SLA targets + automatic escalation rules + notifications
3. Reports & management dashboards (SLA performance, agent performance, CSAT)
4. AI features (ticket summaries, suggested replies, auto-categorization, chatbot)
5. Additional channels (WhatsApp, SMS, live chat) as inbound ticket sources
6. Odoo ERP integration (see §8)
7. Roles/permissions beyond agent/admin, audit logs
8. Multi-branch / multi-department, custom branding

## 3. Tech Stack (decided, do not re-litigate without updating this doc)

- **Backend:** Node.js 18 + Express, plain `pg` driver via Prisma ORM.
- **DB:** PostgreSQL (local dev db name: `azm_support_crm`, role `nourhan`, peer auth, no password needed on this machine).
- **Frontend:** React 18 + Vite, plain CSS (no UI framework — keep the dependency footprint small for a 1-day build).
- **Auth:** JWT (access token only, no refresh-token flow for MVP), bcrypt password hashing.
- **API style:** REST, JSON, versionless (`/api/...`) — versioning is unnecessary at this scale.

Rationale: this stack is API-first, so plugging it into Odoo later (§8) means
adding an integration client/module, not rewriting anything.

## 4. Architecture

```
frontend (React/Vite, :5173) --REST/JSON--> backend (Express, :4000) --SQL--> PostgreSQL (:5432)
```

No message queue, no caching layer, no microservices — unjustified for this
scope. Single deployable backend, single SPA frontend.

## 5. Data Model

```
User (agent/admin)
  id, name, email (unique), password_hash, is_admin (bool), created_at

Customer
  id, name, email, phone, company, notes (text), created_at, updated_at

Ticket
  id, subject, description, category (enum: general|billing|technical|other),
  priority (enum: low|medium|high|urgent), status (enum: open|in_progress|resolved|closed),
  customer_id (FK -> Customer), assigned_agent_id (FK -> User, nullable),
  created_at, updated_at

TicketEvent   -- status history / activity log for a ticket
  id, ticket_id (FK -> Ticket), event_type (enum: created|status_changed|assigned|note_added),
  detail (text), actor_user_id (FK -> User), created_at

KnowledgeArticle
  id, title, body (text), tags (text[]), created_by (FK -> User), created_at, updated_at
```

Enums are implemented as Postgres enums via Prisma `enum` blocks, not free
text — the ticket status/priority/category values above are the complete
set for MVP; adding a value is a migration, not a config change.

## 6. API Contract (MVP)

All endpoints under `/api`. Auth via `Authorization: Bearer <jwt>` except
`POST /auth/login` and `GET /knowledge-base` (public read).

```
POST   /auth/login                 { email, password } -> { token, user }

GET    /customers                  ?search=
POST   /customers
GET    /customers/:id
PUT    /customers/:id
DELETE /customers/:id

GET    /tickets                    ?status=&priority=&assigned_to=me
POST   /tickets
GET    /tickets/:id                -> includes ticket.events[]
PUT    /tickets/:id                -- updating status/assignee appends a TicketEvent
DELETE /tickets/:id

GET    /knowledge-base             ?q=            -- public
POST   /knowledge-base
PUT    /knowledge-base/:id
DELETE /knowledge-base/:id

GET    /leads                      ?source=&status=
POST   /leads                      -- 409 + { error, duplicate } if email/phone already exists
GET    /leads/:id
PUT    /leads/:id
DELETE /leads/:id
```

Leads (KAN-1, tracked in `.squad/stories/init/KAN-1/`): manual lead capture
with Name/Email/Phone/Company/Source/Priority/Status(NEW/CONTACTED/
QUALIFIED/LOST), duplicate check by email OR phone on create, filter by
source/status. Not part of the original PDF's 12 feature areas — added
because it's a real Jira story (KAN project) for this CRM, separate from
the AZM Squad eval task's scope.

Every mutating endpoint returns the updated resource. Errors are
`{ error: string }` with the matching 4xx/5xx status — no custom error
envelope.

## 7. Non-functional requirements

- **i18n:** English + Arabic, static UI strings only for MVP (no per-record
  translated content). RTL driven by `dir="rtl"` on `<html>` when locale is `ar`.
- **Responsive:** frontend must be usable at mobile widths (single-column
  layout below 768px) — no separate mobile app/build.
- Everything else in the PDF's "Platform" section (multi-branch, custom
  branding) is Phase 2 — do not build hooks for it now.

## 8. Odoo ERP Integration — built 2026-08-27

Implemented in `backend/src/integrations/odoo.ts` + `backend/src/routes/odoo.ts`.
Talks to Odoo's `/jsonrpc` endpoint (`common.login`, `object.execute_kw`) —
no extra npm package, no custom Odoo module required.

- **Target instance (local dev):** Odoo 19, `http://localhost:8019`, db `crm`
  (base + crm + helpdesk installed), user `admin`/`admin`. Credentials live
  in `backend/.env` (gitignored), not committed. Runs as
  `odoo19_new/.venv/bin/python odoo-bin --addons-path=... --http-port=8019 -d crm`.
  Deliberately on its own port rather than the 8069 default — this machine
  also runs a system-wide Odoo as a systemd service (`/etc/odoo/odoo.conf`)
  on 8069, and the user runs her own ad-hoc Odoo checkouts manually too
  (those now default to 8018 via `~/.odoorc`'s `http_port`). Keeping this
  project's Odoo on a dedicated port means it doesn't break when she starts
  or stops her other instances.
- **Customer → `res.partner`**: create-or-update by `Customer.odooPartnerId`.
  Only name/email/phone/notes are mapped for now (no company→parent_id
  linkage yet).
- **Lead → `crm.lead`**: create-or-update by `Lead.odooLeadId`. Priority
  mapped to Odoo's `0`/`1`/`2`/`3` scale; `source` goes into `description`
  since we don't create/match `utm.source` records.
- **Ticket → `helpdesk.ticket`**: create-or-update by `Ticket.odooTicketId`,
  linked to the customer's `res.partner` (auto-synced first if it hasn't
  been yet). Status mapped to a stage by name (open→New, in_progress→In
  Progress, resolved/closed→Solved); team is whatever `helpdesk.team`
  comes back first from the db (only one, "Customer Care", exists in this
  instance). Originally this fell back to a plain chatter note on the
  partner because the target db had no helpdesk model — the Helpdesk app
  was installed on 2026-08-27, so tickets sync as real records now.
- **Sync is manual, not automatic-on-create**: each resource has its own
  `POST /api/odoo/{customers,leads,tickets}/:id`, triggered by a "Sync to
  Odoo" button in the UI. Deliberate — a flaky/slow Odoo call must never
  block creating a ticket. `GET /api/odoo/status` backs a live connection
  indicator on the Dashboard.
- **Not done**: no pull direction (Odoo → CRM), no scheduled/automatic sync,
  no conflict resolution if a record changes on both sides, no `utm.source`
  matching, no company→partner hierarchy. Fine for a demo; would need
  revisiting before this is a real production sync.

## 9. Acceptance criteria for MVP

- [ ] Can log in as a seeded agent user.
- [ ] Can create/list/update/delete a Customer.
- [ ] Can create a Ticket against a Customer, assign it to an agent, change
      its status, and see the change reflected in the ticket's event log.
- [ ] Agent dashboard shows only tickets assigned to the logged-in agent, filterable by status.
- [ ] Can create/search Knowledge Base articles; search matches title or tag.
- [ ] UI renders correctly in both English (LTR) and Arabic (RTL).
- [ ] `README.md` lets a new developer run the full stack locally in under 5 commands.

## 10. Repo layout

```
azm-support-crm/
  SDD.md              <- this file
  README.md           <- setup/run instructions
  backend/
    prisma/schema.prisma
    src/
      index.ts
      routes/
      middleware/
      lib/
  frontend/
    src/
      i18n/{en,ar}.json
      pages/
      components/
```

## 11. Customer Portal — built 2026-08-29

A separate, self-service surface for customers, distinct from the agent app
in every layer that matters for security:

- **Auth:** `Customer` gained a nullable `passwordHash`. Signup
  (`POST /api/portal/signup`) claims an existing agent-created `Customer`
  row by email if one exists and has no password yet, instead of creating a
  duplicate — an agent may well have entered this customer before they ever
  signed up. JWTs carry a `role` claim (`'agent'` | `'customer'`);
  `requireAuth` and the new `requireCustomerAuth` middleware each reject the
  other role's token even though both are signed with the same secret, so a
  customer token can never reach agent-only routes or vice versa (see
  backend/tests/portal.test.ts for the cross-role and cross-customer-data
  regression tests).
- **Scope:** a customer can create tickets and list/view only their own
  (`GET/POST /api/portal/tickets`, `GET /api/portal/tickets/:id` — 404s,
  not 403s, on another customer's ticket id, to avoid confirming it
  exists). No status/assignment control — that stays agent-only.
- **Frontend:** `/portal/login`, `/portal/signup`, `/portal` (ticket
  list + create), `/portal/tickets/:id`, all under a separate
  `PortalAuthProvider` (own localStorage keys) so an agent and a customer
  session coexist in the same browser without clashing. Linked from the
  public `/support` page ("Track your ticket").
- **Regression found while building this:** adding `passwordHash` to
  `Customer` re-opened the exact class of bug §9/tests already guard
  against for `User` — every route that did `include: { customer: true }`
  (tickets list/detail, dashboard recent-tickets, the Odoo sync routes) or
  returned a raw `Customer` row (customers CRUD) started leaking the hash
  in the response. Fixed by a shared `customerSelect`
  (`backend/src/lib/selects.ts`) used everywhere a `Customer` is embedded
  or returned, plus regression tests in `tickets.test.ts` and
  `customers.test.ts` asserting `passwordHash` never appears in any
  response body.

## 12. SLA & Automation — built 2026-08-29

- **Targets:** `SLA_DEFAULTS` in `backend/src/lib/sla.ts` (urgent 30m/4h,
  high 1h/8h, medium 4h/24h, low 8h/72h, response/resolution). An
  `SlaPolicy` table can override per priority, but every lookup falls back
  to these defaults, so the feature works on a fresh, unseeded database
  (tests included) with zero policy rows.
- **Applied on ticket creation** (both `POST /api/tickets` and
  `POST /api/portal/tickets`): `slaResponseDueAt`/`slaResolutionDueAt`
  computed from priority at creation time and stored on the ticket — not
  recomputed if priority changes later (a priority bump via manual edit
  doesn't retroactively tighten/loosen a deadline already communicated).
- **Auto-assignment:** `backend/src/lib/autoAssign.ts` picks whichever
  `User` currently has the fewest open/in_progress tickets. Applies
  whenever a ticket is created without an explicit `assignedAgentId` —
  every portal ticket, and any agent-created one where the agent didn't
  pick someone. Logged as an `assigned` TicketEvent so it's visible in the
  ticket's own activity log, not just implied by the field.
- **Escalation:** `runSlaEscalationSweep()` finds open/in_progress tickets
  past `slaResolutionDueAt` that haven't been escalated yet, bumps
  priority one step (low→medium→high→urgent; urgent stays), sets
  `slaEscalated` so it only fires once, and logs a new `escalated`
  TicketEvent type. Runs two ways: automatically every 60s via
  `setInterval` in `index.ts` (deliberately not `app.ts`, so importing the
  app in tests never spins up a background timer), and on demand via
  `POST /api/tickets/sla/run-check` (agent-auth required) — the dashboard's
  "Run SLA check" button calls this, mainly so the behavior can be
  demonstrated/tested without waiting on the interval.
- **Alerting is in-app only:** a dashboard "Overdue tickets" KPI
  (`slaResolutionDueAt < now` on an open/in_progress ticket) plus an
  "Overdue"/"SLA escalated" badge on the ticket detail page. No email/SMS
  — that needs real delivery infrastructure (SMTP creds, a provider
  account) this project doesn't have, so it's left as a documented gap
  rather than faked.
- **Firstresponse/resolution tracking:** `firstRespondedAt` is set the
  first time a ticket's status moves to `in_progress` (once only);
  `resolvedAt` the first time it moves to `resolved` or `closed`. Neither
  is surfaced in the UI yet — they exist for the SLA performance report
  that's still Phase 2 backlog (PLAN.md).

## 13. Status log

Keep this section append-only — newest entry last — so an agent resuming
mid-task knows what's already done without re-reading the whole diff.

- 2026-08-25: SDD written. Backend/frontend scaffolding starting next.
- 2026-08-26: MVP built and smoke-tested end-to-end (login, customers CRUD,
  ticket create/status-change with event log, knowledge base CRUD+search,
  EN/AR toggle with RTL layout, mobile-width table scrolling). Fixed two
  issues found during testing: `assignedAgent`/`actorUser` was leaking
  `passwordHash` over the tickets API (added a `select` allowlist); mobile
  layout overflowed horizontally because tables had no scroll container
  (wrapped in `.table-wrap`). Local dev stack: backend on :4000, frontend on
  :5173, Postgres db `azm_support_crm`. Remaining MVP acceptance criteria
  (§9) are otherwise satisfied. Phase 2 backlog (§2) untouched.
- 2026-08-26: Canonical location moved to
  `/home/nourhan/odoo11-source/AzmCrmSupport/azm-support-crm` (squad-kit
  workspace, tracker: Jira at nourhanali2910.atlassian.net, project key
  KAN). The old `/home/nourhan/azm-support-crm` copy is now stale — treat
  this location as source of truth. Implemented KAN-1 (Leads, see §6) and
  smoke-tested create/duplicate-detect/filter via curl and the browser.
  Added root `.gitignore` for `.squad/secrets.yaml` (contained live API
  credentials, was unprotected/untracked before this commit).
- 2026-08-27: Added Dashboard, Kanban ticket board, live chat (widget +
  agent inbox), a real design pass on buttons, and the Odoo integration
  described in §8 — verified end-to-end against a local Odoo 19 instance.
  Project documentation exported to `AZM_Support_CRM_Documentation.docx`.
- 2026-08-27: Redesigned the New Customer/Ticket/Lead/Article forms
  (were unlabeled single-column placeholder inputs) and added a global
  input/select/textarea style. Added a backend Jest+Supertest suite (25
  tests, isolated `_test` db, see README "Tests") covering auth, CRUD,
  duplicate-lead-detection, and the ticket event log. Writing it caught
  two real bugs, both fixed: a type error in the chat status-update
  route that `ts-node-dev --transpile-only` was silently skipping, and
  an unvalidated `?status=`/`?priority=` query param on
  tickets/leads/chat that crashed with a 500 + leaked stack trace on
  any invalid value — added `src/lib/validateEnum.ts` plus a generic
  Express error handler as defense-in-depth.
- 2026-08-29: Moved this project's Odoo instance to a dedicated port
  (8019) after a real conflict with a system-wide Odoo service and the
  user's own ad-hoc checkouts, all defaulting to 8069 (see §8). Built
  the Customer Portal (§11) — the first Phase 2 item to ship. Verified
  end-to-end in the browser: signup, ticket creation, and confirmed the
  new ticket shows up correctly on the agent's Kanban board. Full test
  suite: 33/33 passing.
- 2026-08-29: Built SLA & Automation (§12) — the second Phase 2 item.
  Also caught and fixed a real gap while wiring up its UI: `.status-chip`
  had been referenced across 5 pages (sync badges, live-chat status, the
  Odoo connection indicator) since early in the project but was never
  actually defined in styles.css, so all of those had been rendering as
  unstyled plain text the whole time. Verified escalation end-to-end by
  manually backdating a ticket's SLA due date and running the check from
  the dashboard button: priority bumped medium→high, activity log got the
  new `escalated` event, both badges rendered. Full test suite: 44/44
  passing.
- 2026-08-29: Added `Ticket.customerRequestedBy` — an optional date the
  customer (or an agent on their behalf) sets on creation, deliberately
  separate from `slaResolutionDueAt` (the system-computed target from
  priority). The two are independent by design: a customer can ask for
  something sooner or later than the standard SLA, and neither field
  overrides the other. Also surfaced `createdAt` on the ticket detail
  page (agent and portal), which had never actually been shown despite
  always being in the data — a real gap the user caught. Full test
  suite: 48/48 passing.
