import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createTestAgent, cleanupTestAgent } from './helpers';
import { SLA_DEFAULTS } from '../src/lib/sla';

describe('SLA targets and auto-assignment on ticket creation', () => {
  let token: string;
  let userId: number;
  let customerId: number;
  const ticketIds: number[] = [];

  beforeAll(async () => {
    const agent = await createTestAgent(`sla-${Date.now()}`);
    token = agent.token;
    userId = agent.user.id;
    const customer = await prisma.customer.create({
      data: { name: 'SLA Test Customer', email: `sla-customer-${Date.now()}@example.com` },
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    await prisma.ticketEvent.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.customer.delete({ where: { id: customerId } }).catch(() => {});
    await cleanupTestAgent(userId);
    await prisma.$disconnect();
  });

  it('attaches SLA due dates matching the priority on creation', async () => {
    const before = Date.now();
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'Urgent thing', customerId, priority: 'urgent' });
    expect(res.status).toBe(201);
    ticketIds.push(res.body.id);

    const responseDue = new Date(res.body.slaResponseDueAt).getTime();
    const resolutionDue = new Date(res.body.slaResolutionDueAt).getTime();
    const expectedResponse = before + SLA_DEFAULTS.urgent.responseMinutes * 60_000;
    const expectedResolution = before + SLA_DEFAULTS.urgent.resolutionMinutes * 60_000;

    // Allow a few seconds of slack for request/test latency.
    expect(Math.abs(responseDue - expectedResponse)).toBeLessThan(10_000);
    expect(Math.abs(resolutionDue - expectedResolution)).toBeLessThan(10_000);
  });

  it('defaults to medium priority SLA when none is given', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'No priority specified', customerId });
    expect(res.status).toBe(201);
    ticketIds.push(res.body.id);
    expect(res.body.priority).toBe('medium');
    expect(res.body.slaResolutionDueAt).toBeTruthy();
  });

  it('stores an optional customer-requested resolution date, distinct from the computed SLA target', async () => {
    const requestedBy = new Date(Date.now() + 2 * 60 * 60_000).toISOString(); // 2h from now
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'Customer wants it fast', customerId, priority: 'low', customerRequestedBy: requestedBy });
    expect(res.status).toBe(201);
    ticketIds.push(res.body.id);

    expect(new Date(res.body.customerRequestedBy).getTime()).toBe(new Date(requestedBy).getTime());
    // The customer's ask (2h) is far sooner than the low-priority SLA
    // target (72h) - the two fields are independent, neither overrides
    // the other.
    expect(new Date(res.body.customerRequestedBy).getTime()).toBeLessThan(new Date(res.body.slaResolutionDueAt).getTime());
  });

  it('rejects an unparseable customerRequestedBy as 400', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'Bad date', customerId, customerRequestedBy: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('leaves customerRequestedBy null when not provided', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'No date given', customerId });
    expect(res.status).toBe(201);
    ticketIds.push(res.body.id);
    expect(res.body.customerRequestedBy).toBeNull();
  });

  it('auto-assigns an agent when none is given, and logs it as an event', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'Needs an owner', customerId });
    expect(res.status).toBe(201);
    ticketIds.push(res.body.id);
    expect(res.body.assignedAgentId).toBeTruthy();

    const detail = await request(app).get(`/api/tickets/${res.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(detail.body.events.some((e: { detail: string }) => e.detail?.includes('auto-assigned'))).toBe(true);
  });

  it('respects an explicit assignedAgentId instead of auto-assigning', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'Explicitly assigned', customerId, assignedAgentId: userId });
    expect(res.status).toBe(201);
    ticketIds.push(res.body.id);
    expect(res.body.assignedAgentId).toBe(userId);
  });

  it('sets firstRespondedAt the first time status moves to in_progress, and only once', async () => {
    const create = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'Tracks first response', customerId });
    ticketIds.push(create.body.id);
    expect(create.body.firstRespondedAt).toBeNull();

    const first = await request(app)
      .put(`/api/tickets/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress' });
    expect(first.body.firstRespondedAt).toBeTruthy();
    const firstTimestamp = first.body.firstRespondedAt;

    await new Promise((r) => setTimeout(r, 20));
    const second = await request(app)
      .put(`/api/tickets/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress' });
    expect(second.body.firstRespondedAt).toBe(firstTimestamp); // unchanged
  });

  it('sets resolvedAt when status moves to resolved', async () => {
    const create = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'Gets resolved', customerId });
    ticketIds.push(create.body.id);

    const resolved = await request(app)
      .put(`/api/tickets/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'resolved' });
    expect(resolved.body.resolvedAt).toBeTruthy();
  });
});

describe('SLA escalation sweep', () => {
  let token: string;
  let userId: number;
  let customerId: number;
  const ticketIds: number[] = [];

  beforeAll(async () => {
    const agent = await createTestAgent(`sla-sweep-${Date.now()}`);
    token = agent.token;
    userId = agent.user.id;
    const customer = await prisma.customer.create({
      data: { name: 'Sweep Test Customer', email: `sweep-customer-${Date.now()}@example.com` },
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    await prisma.ticketEvent.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.customer.delete({ where: { id: customerId } }).catch(() => {});
    await cleanupTestAgent(userId);
    await prisma.$disconnect();
  });

  it('escalates an overdue open ticket and bumps its priority', async () => {
    const overdue = await prisma.ticket.create({
      data: {
        subject: 'Way overdue',
        customerId,
        priority: 'medium',
        status: 'open',
        slaResolutionDueAt: new Date(Date.now() - 60_000), // 1 minute in the past
      },
    });
    ticketIds.push(overdue.id);

    const sweep = await request(app).post('/api/tickets/sla/run-check').set('Authorization', `Bearer ${token}`);
    expect(sweep.status).toBe(200);
    expect(sweep.body.escalated).toBeGreaterThanOrEqual(1);

    const after = await prisma.ticket.findUnique({ where: { id: overdue.id } });
    expect(after!.priority).toBe('high'); // medium -> high
    expect(after!.slaEscalated).toBe(true);

    const events = await prisma.ticketEvent.findMany({ where: { ticketId: overdue.id, eventType: 'escalated' } });
    expect(events.length).toBe(1);
  });

  it('does not escalate the same ticket twice', async () => {
    const overdue = await prisma.ticket.create({
      data: {
        subject: 'Already escalated',
        customerId,
        priority: 'high',
        status: 'open',
        slaResolutionDueAt: new Date(Date.now() - 60_000),
        slaEscalated: true,
      },
    });
    ticketIds.push(overdue.id);

    await request(app).post('/api/tickets/sla/run-check').set('Authorization', `Bearer ${token}`);

    const after = await prisma.ticket.findUnique({ where: { id: overdue.id } });
    expect(after!.priority).toBe('high'); // unchanged - already escalated once
  });

  it('does not touch tickets that are not overdue', async () => {
    const notDue = await prisma.ticket.create({
      data: {
        subject: 'Still on track',
        customerId,
        priority: 'low',
        status: 'open',
        slaResolutionDueAt: new Date(Date.now() + 60 * 60_000), // an hour from now
      },
    });
    ticketIds.push(notDue.id);

    await request(app).post('/api/tickets/sla/run-check').set('Authorization', `Bearer ${token}`);

    const after = await prisma.ticket.findUnique({ where: { id: notDue.id } });
    expect(after!.priority).toBe('low');
    expect(after!.slaEscalated).toBe(false);
  });

  it('does not escalate a resolved ticket even if its resolution date passed', async () => {
    const resolvedLate = await prisma.ticket.create({
      data: {
        subject: 'Resolved after the fact',
        customerId,
        priority: 'medium',
        status: 'resolved',
        slaResolutionDueAt: new Date(Date.now() - 60_000),
      },
    });
    ticketIds.push(resolvedLate.id);

    await request(app).post('/api/tickets/sla/run-check').set('Authorization', `Bearer ${token}`);

    const after = await prisma.ticket.findUnique({ where: { id: resolvedLate.id } });
    expect(after!.priority).toBe('medium');
    expect(after!.slaEscalated).toBe(false);
  });

  it('requires agent auth to trigger the sweep manually', async () => {
    const res = await request(app).post('/api/tickets/sla/run-check');
    expect(res.status).toBe(401);
  });
});
