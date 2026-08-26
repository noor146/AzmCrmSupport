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

## 8. Future Odoo ERP Integration (design only, not built in MVP)

When this app is wired into Odoo:
- Treat Odoo as the ERP source of truth for **customers** (`res.partner`) and
  this app as the source of truth for **tickets**. Sync direction: Odoo → CRM
  one-way for customers (pull), CRM → Odoo optional push for ticket summaries
  onto the partner's chatter (not decided further than this).
- Integration transport: Odoo's JSON-RPC/XML-RPC `web/dataset/call_kw`, called
  from a new `backend/src/integrations/odoo.ts` client — no changes to Odoo
  itself required (no custom Odoo module) unless a dedicated REST endpoint is
  requested later.
- Auth: a dedicated Odoo API user with restricted `res.partner` read access.
- Do not start this until MVP is demoed and the actual Odoo instance/version
  to integrate against is confirmed.

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

## 11. Status log

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
