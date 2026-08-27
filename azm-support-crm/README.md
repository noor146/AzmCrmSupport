# AZM Support CRM

Full-stack task (see [SDD.md](./SDD.md) for the full design/spec — read that
first if you're an agent picking this up cold).

Standalone Customer Support CRM: Express + Prisma + PostgreSQL backend, React
+ Vite frontend. Bilingual (EN/AR, RTL-aware). Not an Odoo module — designed
to be wired into Odoo ERP later over JSON-RPC (see SDD §8).

## Prerequisites

- Node.js 18+
- PostgreSQL running locally

## Setup

```bash
# 1. Create the database (once)
psql -d postgres -c "CREATE DATABASE azm_support_crm;"

# 2. Backend
cd backend
npm install
cp .env.example .env   # then edit DATABASE_URL/JWT_SECRET if needed
npx prisma migrate dev
npm run prisma:seed
npm run dev             # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev             # http://localhost:5173
```

Seeded login: `admin@azmsquad.com` / `password123`

## Tests

Backend has an automated Jest + Supertest suite against an isolated
database (never the dev one):

```bash
psql -d postgres -c "CREATE DATABASE azm_support_crm_test;"
cd backend
cp .env.example .env.test   # edit DATABASE_URL to point at the _test db
DATABASE_URL="<same URL as .env.test>" npx prisma migrate deploy
npm test
```

## Project layout

```
SDD.md      -- design/spec doc, source of truth for scope & decisions
backend/    -- Express API + Prisma schema
frontend/   -- React/Vite SPA
```

## Scripts

- `backend`: `npm run dev` (watch mode), `npm run build && npm start` (prod), `npm run prisma:migrate`, `npm run prisma:seed`, `npm test`
- `frontend`: `npm run dev`, `npm run build`, `npm run preview`
