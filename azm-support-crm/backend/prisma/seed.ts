import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@azmsquad.com' },
    update: {},
    create: { name: 'Admin Agent', email: 'admin@azmsquad.com', passwordHash, isAdmin: true },
  });

  const customer = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Sample Customer', email: 'customer@example.com', phone: '0100000000', company: 'ACME' },
  });

  await prisma.knowledgeArticle.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'How to reset your password',
      body: 'Go to Settings > Security > Reset Password.',
      tags: ['account', 'password'],
      createdBy: admin.id,
    },
  });

  await prisma.ticket.upsert({
    where: { id: 1 },
    update: {},
    create: {
      subject: 'Cannot log in',
      description: 'Customer reports login failure after password reset.',
      category: 'technical',
      priority: 'high',
      status: 'open',
      customerId: customer.id,
      assignedAgentId: admin.id,
    },
  });

  console.log('Seeded: admin@azmsquad.com / password123');
}

main().finally(() => prisma.$disconnect());
