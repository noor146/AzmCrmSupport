import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { customerSelect } from '../lib/selects';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/', async (req: AuthedRequest, res) => {
  const [
    customerCount,
    ticketsByStatus,
    ticketsByPriority,
    leadsByStatus,
    articleCount,
    myOpenTicketCount,
    recentTickets,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ['priority'], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.knowledgeArticle.count(),
    prisma.ticket.count({
      where: { assignedAgentId: req.user!.id, status: { in: ['open', 'in_progress'] } },
    }),
    prisma.ticket.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: customerSelect }, assignedAgent: { select: { id: true, name: true } } },
    }),
  ]);

  const toCountMap = (rows: { _count: { _all: number } }[] & Record<string, unknown>[], key: string) =>
    Object.fromEntries(rows.map((r: any) => [r[key], r._count._all]));

  res.json({
    customerCount,
    articleCount,
    myOpenTicketCount,
    ticketsByStatus: toCountMap(ticketsByStatus as any, 'status'),
    ticketsByPriority: toCountMap(ticketsByPriority as any, 'priority'),
    leadsByStatus: toCountMap(leadsByStatus as any, 'status'),
    ticketTotal: ticketsByStatus.reduce((sum, r) => sum + r._count._all, 0),
    leadTotal: leadsByStatus.reduce((sum, r) => sum + r._count._all, 0),
    recentTickets,
  });
});
