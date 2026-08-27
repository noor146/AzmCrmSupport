import bcrypt from 'bcryptjs';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

export async function createTestAgent(emailSuffix: string) {
  const email = `test-agent-${emailSuffix}@example.com`;
  const passwordHash = await bcrypt.hash('testpass123', 4);
  const user = await prisma.user.create({
    data: { name: 'Test Agent', email, passwordHash, isAdmin: true },
  });

  const res = await request(app).post('/api/auth/login').send({ email, password: 'testpass123' });
  return { user, token: res.body.token as string };
}

export async function cleanupTestAgent(userId: number) {
  await prisma.ticketEvent.deleteMany({ where: { actorUserId: userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}
