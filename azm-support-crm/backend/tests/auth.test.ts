import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createTestAgent, cleanupTestAgent } from './helpers';

describe('POST /api/auth/login', () => {
  let userId: number;
  const email = `auth-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    const { user } = await createTestAgent(`auth-${Date.now()}`);
    userId = user.id;
  });

  afterAll(async () => {
    await cleanupTestAgent(userId);
    await prisma.$disconnect();
  });

  it('rejects missing credentials with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email });
    expect(res.status).toBe(400);
  });

  it('rejects a wrong password with 401 and no token', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'not-the-password' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody-here@example.com', password: 'whatever' });
    expect(res.status).toBe(401);
  });
});

describe('Auth middleware', () => {
  it('rejects protected routes with no token', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });

  it('rejects protected routes with a garbage token', async () => {
    const res = await request(app).get('/api/customers').set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });
});
