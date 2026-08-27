import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createTestAgent, cleanupTestAgent } from './helpers';

describe('Tickets: status changes, event log, and response shape', () => {
  let token: string;
  let userId: number;
  let customerId: number;
  let ticketId: number;

  beforeAll(async () => {
    const agent = await createTestAgent(`tickets-${Date.now()}`);
    token = agent.token;
    userId = agent.user.id;

    const customer = await prisma.customer.create({
      data: { name: 'Ticket Test Customer', email: `ticket-customer-${Date.now()}@example.com` },
    });
    customerId = customer.id;

    const ticketRes = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'Test ticket', customerId, priority: 'high', assignedAgentId: userId });
    ticketId = ticketRes.body.id;
  });

  afterAll(async () => {
    await prisma.ticketEvent.deleteMany({ where: { ticketId } });
    await prisma.ticket.delete({ where: { id: ticketId } }).catch(() => {});
    await prisma.customer.delete({ where: { id: customerId } }).catch(() => {});
    await cleanupTestAgent(userId);
    await prisma.$disconnect();
  });

  it('logs a "created" event on ticket creation', async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}`).set('Authorization', `Bearer ${token}`);
    expect(res.body.events.some((e: { eventType: string }) => e.eventType === 'created')).toBe(true);
  });

  it('logs a "status_changed" event when status is updated', async () => {
    await request(app)
      .put(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress' });

    const res = await request(app).get(`/api/tickets/${ticketId}`).set('Authorization', `Bearer ${token}`);
    const statusEvents = res.body.events.filter((e: { eventType: string }) => e.eventType === 'status_changed');
    expect(statusEvents.length).toBeGreaterThan(0);
    expect(statusEvents[statusEvents.length - 1].detail).toBe('open -> in_progress');
  });

  it('does NOT log a status_changed event when status is unchanged', async () => {
    const before = await request(app).get(`/api/tickets/${ticketId}`).set('Authorization', `Bearer ${token}`);
    const countBefore = before.body.events.length;

    await request(app)
      .put(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress' }); // same status as current

    const after = await request(app).get(`/api/tickets/${ticketId}`).set('Authorization', `Bearer ${token}`);
    expect(after.body.events.length).toBe(countBefore);
  });

  // Regression test: an earlier version of this endpoint leaked the
  // assigned agent's bcrypt passwordHash in the ticket list/detail response.
  it('never includes passwordHash for the assigned agent', async () => {
    const list = await request(app).get('/api/tickets').set('Authorization', `Bearer ${token}`);
    const detail = await request(app).get(`/api/tickets/${ticketId}`).set('Authorization', `Bearer ${token}`);

    for (const ticket of list.body) {
      expect(ticket.assignedAgent?.passwordHash).toBeUndefined();
    }
    expect(detail.body.assignedAgent?.passwordHash).toBeUndefined();
    expect(JSON.stringify(detail.body)).not.toMatch(/passwordHash/);
  });

  it('rejects ticket creation with no customerId as 400', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'No customer' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for a nonexistent ticket', async () => {
    const res = await request(app).get('/api/tickets/999999999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  // Regression: an invalid ?status= used to reach Prisma's `where` clause
  // unvalidated, throwing a PrismaClientValidationError that surfaced as a
  // 500 with a full stack trace in the response body.
  it('returns 400 (not 500) for an invalid status filter', async () => {
    const res = await request(app)
      .get('/api/tickets')
      .query({ status: 'banana' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/i);
  });

  it('returns 400 (not 500) for an invalid priority filter', async () => {
    const res = await request(app)
      .get('/api/tickets')
      .query({ priority: 'super-mega-urgent' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
