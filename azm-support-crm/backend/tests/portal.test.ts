import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Customer portal: signup, login, and ticket scoping', () => {
  const customerIds: number[] = [];
  const ticketIds: number[] = [];
  const emailA = `portal-a-${Date.now()}@example.com`;
  const emailB = `portal-b-${Date.now()}@example.com`;

  afterAll(async () => {
    await prisma.ticketEvent.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
    await prisma.$disconnect();
  });

  it('signs up a new customer and returns a customer-scoped token', async () => {
    const res = await request(app)
      .post('/api/portal/signup')
      .send({ name: 'Portal Customer A', email: emailA, password: 'hunter2pass' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.customer.email).toBe(emailA);
    customerIds.push(res.body.customer.id);
  });

  it('rejects a second signup with the same email as 409', async () => {
    const res = await request(app)
      .post('/api/portal/signup')
      .send({ name: 'Duplicate', email: emailA, password: 'whatever123' });
    expect(res.status).toBe(409);
  });

  it('claims an existing agent-created customer record by email instead of duplicating it', async () => {
    const existing = await prisma.customer.create({ data: { name: 'Agent Created', email: emailB, phone: '0100000001' } });
    customerIds.push(existing.id);

    const res = await request(app)
      .post('/api/portal/signup')
      .send({ name: 'Ignored Name', email: emailB, password: 'hunter2pass' });

    expect(res.status).toBe(201);
    expect(res.body.customer.id).toBe(existing.id);
    expect(res.body.customer.phone).toBe('0100000001'); // untouched by signup
  });

  it('logs in with the right password and rejects the wrong one', async () => {
    const ok = await request(app).post('/api/portal/login').send({ email: emailA, password: 'hunter2pass' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();

    const bad = await request(app).post('/api/portal/login').send({ email: emailA, password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  it('rejects a portal login attempt with an agent-shaped token on portal routes', async () => {
    // The agent flow never touches this router directly, but the guard
    // itself is the thing under test: a token without role:'customer'
    // must not be accepted here, even if otherwise well-formed.
    const jwt = require('jsonwebtoken');
    const agentToken = jwt.sign({ id: 1, email: 'a@a.com', isAdmin: true, role: 'agent' }, process.env.JWT_SECRET);
    const res = await request(app).get('/api/portal/tickets').set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(403);
  });

  it('lets a customer specify when they need a ticket resolved by', async () => {
    const loginA = await request(app).post('/api/portal/login').send({ email: emailA, password: 'hunter2pass' });
    const requestedBy = new Date(Date.now() + 3 * 60 * 60_000).toISOString();

    const create = await request(app)
      .post('/api/portal/tickets')
      .set('Authorization', `Bearer ${loginA.body.token}`)
      .send({ subject: 'Need this by tonight', customerRequestedBy: requestedBy });
    expect(create.status).toBe(201);
    ticketIds.push(create.body.id);
    expect(new Date(create.body.customerRequestedBy).getTime()).toBe(new Date(requestedBy).getTime());

    const bad = await request(app)
      .post('/api/portal/tickets')
      .set('Authorization', `Bearer ${loginA.body.token}`)
      .send({ subject: 'Bad date', customerRequestedBy: 'nope' });
    expect(bad.status).toBe(400);
  });

  it('lets a customer create and list only their own tickets', async () => {
    const loginA = await request(app).post('/api/portal/login').send({ email: emailA, password: 'hunter2pass' });
    const tokenA = loginA.body.token;
    const loginB = await request(app).post('/api/portal/login').send({ email: emailB, password: 'hunter2pass' });
    const tokenB = loginB.body.token;

    const createA = await request(app)
      .post('/api/portal/tickets')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ subject: 'My printer is on fire' });
    expect(createA.status).toBe(201);
    ticketIds.push(createA.body.id);

    const listA = await request(app).get('/api/portal/tickets').set('Authorization', `Bearer ${tokenA}`);
    expect(listA.body.some((t: { id: number }) => t.id === createA.body.id)).toBe(true);

    const listB = await request(app).get('/api/portal/tickets').set('Authorization', `Bearer ${tokenB}`);
    expect(listB.body.some((t: { id: number }) => t.id === createA.body.id)).toBe(false);
  });

  it('returns 404 (not someone else\'s data) when a customer requests another customer\'s ticket by id', async () => {
    const loginA = await request(app).post('/api/portal/login').send({ email: emailA, password: 'hunter2pass' });
    const loginB = await request(app).post('/api/portal/login').send({ email: emailB, password: 'hunter2pass' });

    const createA = await request(app)
      .post('/api/portal/tickets')
      .set('Authorization', `Bearer ${loginA.body.token}`)
      .send({ subject: 'Private issue' });
    ticketIds.push(createA.body.id);

    const crossRead = await request(app)
      .get(`/api/portal/tickets/${createA.body.id}`)
      .set('Authorization', `Bearer ${loginB.body.token}`);
    expect(crossRead.status).toBe(404);

    const ownRead = await request(app)
      .get(`/api/portal/tickets/${createA.body.id}`)
      .set('Authorization', `Bearer ${loginA.body.token}`);
    expect(ownRead.status).toBe(200);
  });
});
