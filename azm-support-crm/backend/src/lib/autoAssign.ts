import { prisma } from './prisma';

// Load-based auto-assignment: whichever agent currently has the fewest
// open/in_progress tickets gets the new one. No concept of team/skill
// routing - every User is an eligible agent. Returns null if there are no
// agents at all yet (fresh install), in which case the ticket is created
// unassigned rather than failing.
export async function pickLeastLoadedAgent(): Promise<number | null> {
  const agents = await prisma.user.findMany({ select: { id: true } });
  if (!agents.length) return null;

  const openCounts = await prisma.ticket.groupBy({
    by: ['assignedAgentId'],
    where: { status: { in: ['open', 'in_progress'] }, assignedAgentId: { not: null } },
    _count: { _all: true },
  });
  const loadByAgent = new Map(openCounts.map((row) => [row.assignedAgentId as number, row._count._all]));

  let best = agents[0].id;
  let bestLoad = loadByAgent.get(best) ?? 0;
  for (const agent of agents.slice(1)) {
    const load = loadByAgent.get(agent.id) ?? 0;
    if (load < bestLoad) {
      best = agent.id;
      bestLoad = load;
    }
  }
  return best;
}
