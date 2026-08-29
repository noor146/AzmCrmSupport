import { Router } from 'express';
import { TicketStatus, TicketPriority } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { parseEnumQueryParam, INVALID } from '../lib/validateEnum';
import { agentSelect, customerSelect } from '../lib/selects';
import { computeSlaDueDates, runSlaEscalationSweep } from '../lib/sla';
import { pickLeastLoadedAgent } from '../lib/autoAssign';

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

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
    include: { customer: { select: customerSelect }, assignedAgent: { select: agentSelect } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tickets);
});

ticketsRouter.post('/', async (req: AuthedRequest, res) => {
  const { subject, description, category, priority, customerId, assignedAgentId, customerRequestedBy } = req.body ?? {};
  if (!subject || !customerId) {
    return res.status(400).json({ error: 'subject and customerId are required' });
  }

  let requestedByDate: Date | undefined;
  if (customerRequestedBy) {
    requestedByDate = new Date(customerRequestedBy);
    if (Number.isNaN(requestedByDate.getTime())) {
      return res.status(400).json({ error: 'customerRequestedBy must be a valid date' });
    }
  }

  const effectivePriority = priority ?? 'medium';
  const now = new Date();
  const [{ slaResponseDueAt, slaResolutionDueAt }, autoAgentId] = await Promise.all([
    computeSlaDueDates(effectivePriority, now),
    assignedAgentId ? Promise.resolve(Number(assignedAgentId)) : pickLeastLoadedAgent(),
  ]);

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      description,
      category,
      priority: effectivePriority,
      customerId: Number(customerId),
      assignedAgentId: autoAgentId ?? undefined,
      slaResponseDueAt,
      slaResolutionDueAt,
      customerRequestedBy: requestedByDate,
    },
  });

  const events = [{ ticketId: ticket.id, eventType: 'created' as const, actorUserId: req.user!.id }];
  if (!assignedAgentId && autoAgentId) {
    events.push({ ticketId: ticket.id, eventType: 'assigned' as const, detail: `agent ${autoAgentId} (auto-assigned, load balancing)`, actorUserId: req.user!.id } as any);
  }
  await prisma.ticketEvent.createMany({ data: events as any });

  res.status(201).json(ticket);
});

ticketsRouter.post('/sla/run-check', async (_req, res) => {
  res.json(await runSlaEscalationSweep());
});

ticketsRouter.get('/:id', async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      customer: { select: customerSelect },
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

  const firstRespondedAt =
    status === 'in_progress' && !existing.firstRespondedAt ? new Date() : undefined;
  const resolvedAt =
    status && ['resolved', 'closed'].includes(status) && !existing.resolvedAt ? new Date() : undefined;

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { subject, description, category, priority, status, assignedAgentId, firstRespondedAt, resolvedAt },
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
