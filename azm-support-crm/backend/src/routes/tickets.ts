import { Router } from 'express';
import { TicketStatus, TicketPriority } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { parseEnumQueryParam, INVALID } from '../lib/validateEnum';

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

const agentSelect = { id: true, name: true, email: true, isAdmin: true } as const;
const STATUSES = Object.values(TicketStatus);
const PRIORITIES = Object.values(TicketPriority);

ticketsRouter.get('/', async (req: AuthedRequest, res) => {
  const { assigned_to } = req.query;
  const status = parseEnumQueryParam(res, 'status', req.query.status, STATUSES);
  if (status === INVALID) return;
  const priority = parseEnumQueryParam(res, 'priority', req.query.priority, PRIORITIES);
  if (priority === INVALID) return;

  const tickets = await prisma.ticket.findMany({
    where: {
      status,
      priority,
      assignedAgentId: assigned_to === 'me' ? req.user!.id : undefined,
    },
    include: { customer: true, assignedAgent: { select: agentSelect } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tickets);
});

ticketsRouter.post('/', async (req: AuthedRequest, res) => {
  const { subject, description, category, priority, customerId, assignedAgentId } = req.body ?? {};
  if (!subject || !customerId) {
    return res.status(400).json({ error: 'subject and customerId are required' });
  }
  const ticket = await prisma.ticket.create({
    data: {
      subject,
      description,
      category,
      priority,
      customerId: Number(customerId),
      assignedAgentId: assignedAgentId ? Number(assignedAgentId) : undefined,
    },
  });
  await prisma.ticketEvent.create({
    data: { ticketId: ticket.id, eventType: 'created', actorUserId: req.user!.id },
  });
  res.status(201).json(ticket);
});

ticketsRouter.get('/:id', async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      customer: true,
      assignedAgent: { select: agentSelect },
      events: { orderBy: { createdAt: 'asc' }, include: { actorUser: { select: agentSelect } } },
    },
  });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

ticketsRouter.put('/:id', async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Ticket not found' });

  const { subject, description, category, priority, status, assignedAgentId } = req.body ?? {};

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { subject, description, category, priority, status, assignedAgentId },
  });

  const events = [];
  if (status && status !== existing.status) {
    events.push({ ticketId: id, eventType: 'status_changed' as const, detail: `${existing.status} -> ${status}`, actorUserId: req.user!.id });
  }
  if (assignedAgentId !== undefined && assignedAgentId !== existing.assignedAgentId) {
    events.push({ ticketId: id, eventType: 'assigned' as const, detail: `agent ${assignedAgentId ?? 'unassigned'}`, actorUserId: req.user!.id });
  }
  if (events.length) await prisma.ticketEvent.createMany({ data: events });

  res.json(ticket);
});

ticketsRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.ticketEvent.deleteMany({ where: { ticketId: id } });
    await prisma.ticket.delete({ where: { id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Ticket not found' });
  }
});
