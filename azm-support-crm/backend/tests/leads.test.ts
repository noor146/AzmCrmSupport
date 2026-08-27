import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createTestAgent, cleanupTestAgent } from './helpers';

describe('Leads: duplicate detection', () => {
  let token: string;
  let userId: number;
  const leadIds: number[] = [];
  const email = `lead-dup-${Date.now()}@example.com`;
  const phone = `010${Date.now()}`.slice(0, 11);

  beforeAll(async () => {
    const agent = await createTestAgent(`leads-${Date.now()}`);
    token = agent.token;
    userId = agent.user.id;
  });

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
    await cleanupTestAgent(userId);
    await prisma.$disconnect();
  });

  it('creates a lead', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Original Lead', email, phone });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('NEW');
    leadIds.push(res.body.id);
  });

  it('rejects a second lead with the same email as 409, and returns the existing lead', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Duplicate By Email', email });

    expect(res.status).toBe(409);
    expect(res.body.duplicate?.email).toBe(email);
  });

  it('rejects a second lead with the same phone (different email) as 409', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Duplicate By Phone', phone, email: `different-${Date.now()}@example.com` });

    expect(res.status).toBe(409);
    expect(res.body.duplicate?.phone).toBe(phone);
  });

  it('allows a lead with neither email nor phone matching', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Genuinely New Lead', email: `unique-${Date.now()}@example.com` });

    expect(res.status).toBe(201);
    leadIds.push(res.body.id);
  });

  it('rejects a lead with no name as 400', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: `noname-${Date.now()}@example.com` });

    expect(res.status).toBe(400);
  });

  it('filters the lead list by status', async () => {
    const res = await request(app)
      .get('/api/leads')
      .query({ status: 'NEW' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.every((lead: { status: string }) => lead.status === 'NEW')).toBe(true);
  });

  it('returns 400 (not 500) for an invalid status filter', async () => {
    const res = await request(app)
      .get('/api/leads')
      .query({ status: 'super-interested' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
