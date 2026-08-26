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

## Project layout

```
SDD.md      -- design/spec doc, source of truth for scope & decisions
backend/    -- Express API + Prisma schema
frontend/   -- React/Vite SPA
```

## Scripts

- `backend`: `npm run dev` (watch mode), `npm run build && npm start` (prod), `npm run prisma:migrate`, `npm run prisma:seed`
- `frontend`: `npm run dev`, `npm run build`, `npm run preview`
