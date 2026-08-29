import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { requireCustomerAuth, AuthedRequest } from '../middleware/auth';
import { parseEnumQueryParam, INVALID } from '../lib/validateEnum';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { computeSlaDueDates } from '../lib/sla';
import { pickLeastLoadedAgent } from '../lib/autoAssign';

export const portalRouter = Router();

const CATEGORIES = Object.values(TicketCategory);
const PRIORITIES = Object.values(TicketPriority);
const STATUSES = Object.values(TicketStatus);

function signCustomerToken(customer: { id: number; email: string | null }) {
  return jwt.sign(
    { id: customer.id, email: customer.email, role: 'customer' },
    process.env.JWT_SECRET!,
    { expiresIn: '12h' }
  );
}

const publicCustomer = { id: true, name: true, email: true, phone: true, company: true } as const;

// A customer record may already exist (an agent created it before the
// customer ever signed up) - signup claims that record by email instead of
// creating a duplicate, as long as it doesn't already have a password.
portalRouter.post('/signup', async (req, res) => {
  const { name, email, phone, password } = req.body ?? {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const customer = existing
    ? await prisma.customer.update({ where: { id: existing.id }, data: { passwordHash, phone: phone || existing.phone } })
    : await prisma.customer.create({ data: { name, email, phone, passwordHash } });

  const token = signCustomerToken(customer);
  res.status(201).json({ token, customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, company: customer.company } });
});

portalRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer?.passwordHash || !(await bcrypt.compare(password, customer.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signCustomerToken(customer);
  res.json({ token, customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, company: customer.company } });
});

portalRouter.use(requireCustomerAuth);

portalRouter.get('/tickets', async (req: AuthedRequest, res) => {
  const status = parseEnumQueryParam(res, 'status', req.query.status, STATUSES);
  if (status === INVALID) return;

  const tickets = await prisma.ticket.findMany({
    where: { customerId: req.customer!.id, status: status as any },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tickets);
});

portalRouter.post('/tickets', async (req: AuthedRequest, res) => {
  const { subject, description, category, priority } = req.body ?? {};
  if (!subject) return res.status(400).json({ error: 'subject is required' });
  if (category && !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${CATEGORIES.join(', ')}` });
  }
  if (priority && !PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${PRIORITIES.join(', ')}` });
  }

  const effectivePriority = priority ?? 'medium';
  const now = new Date();
  const [{ slaResponseDueAt, slaResolutionDueAt }, autoAgentId] = await Promise.all([
    computeSlaDueDates(effectivePriority, now),
    pickLeastLoadedAgent(),
  ]);

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      description,
      category,
      priority: effectivePriority,
      customerId: req.customer!.id,
      assignedAgentId: autoAgentId ?? undefined,
      slaResponseDueAt,
      slaResolutionDueAt,
    },
  });

  const events = [{ ticketId: ticket.id, eventType: 'created' as const }];
  if (autoAgentId) {
    events.push({ ticketId: ticket.id, eventType: 'assigned' as const, detail: `agent ${autoAgentId} (auto-assigned, load balancing)` } as any);
  }
  await prisma.ticketEvent.createMany({ data: events as any });
  res.status(201).json(ticket);
});

portalRouter.get('/tickets/:id', async (req: AuthedRequest, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      assignedAgent: { select: { name: true } },
      events: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!ticket || ticket.customerId !== req.customer!.id) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  res.json(ticket);
});

portalRouter.get('/me', async (req: AuthedRequest, res) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.customer!.id }, select: publicCustomer });
  res.json(customer);
});
