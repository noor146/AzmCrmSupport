import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createTestAgent, cleanupTestAgent } from './helpers';

describe('Customers CRUD', () => {
  let token: string;
  let userId: number;
  let customerId: number;
  const uniqueName = `Search Target ${Date.now()}`;

  beforeAll(async () => {
    const agent = await createTestAgent(`customers-${Date.now()}`);
    token = agent.token;
    userId = agent.user.id;
  });

  afterAll(async () => {
    if (customerId) await prisma.customer.delete({ where: { id: customerId } }).catch(() => {});
    await cleanupTestAgent(userId);
    await prisma.$disconnect();
  });

  it('creates a customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: uniqueName, email: 'search-target@example.com' });
    expect(res.status).toBe(201);
    customerId = res.body.id;
  });

  it('rejects creation with no name as 400', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'noname@example.com' });
    expect(res.status).toBe(400);
  });

  it('finds the customer via search', async () => {
    const res = await request(app)
      .get('/api/customers')
      .query({ search: uniqueName })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.some((c: { id: number }) => c.id === customerId)).toBe(true);
  });

  it('updates the customer', async () => {
    const res = await request(app)
      .put(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: uniqueName, company: 'Updated Co' });
    expect(res.status).toBe(200);
    expect(res.body.company).toBe('Updated Co');
  });

  it('deletes the customer, then 404s on further reads', async () => {
    const del = await request(app).delete(`/api/customers/${customerId}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/api/customers/${customerId}`).set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
    customerId = 0; // already gone, skip afterAll cleanup
  });
});
