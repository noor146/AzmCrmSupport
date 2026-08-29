import { TicketPriority } from '@prisma/client';
import { prisma } from './prisma';

// Source of truth for SLA targets. The sla_policies table can override
// these per-priority (e.g. an admin screen later), but every lookup falls
// back to this map so the feature works even on a freshly-migrated,
// unseeded database (tests included) with no policy rows at all.
export const SLA_DEFAULTS: Record<TicketPriority, { responseMinutes: number; resolutionMinutes: number }> = {
  urgent: { responseMinutes: 30, resolutionMinutes: 4 * 60 },
  high: { responseMinutes: 60, resolutionMinutes: 8 * 60 },
  medium: { responseMinutes: 4 * 60, resolutionMinutes: 24 * 60 },
  low: { responseMinutes: 8 * 60, resolutionMinutes: 72 * 60 },
};

// low -> medium -> high -> urgent. Escalation bumps one step; urgent has
// nowhere further to go.
const ESCALATION_ORDER: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

export function nextEscalatedPriority(priority: TicketPriority): TicketPriority | null {
  const index = ESCALATION_ORDER.indexOf(priority);
  if (index === -1 || index === ESCALATION_ORDER.length - 1) return null;
  return ESCALATION_ORDER[index + 1];
}

export async function getSlaPolicy(priority: TicketPriority) {
  const override = await prisma.slaPolicy.findUnique({ where: { priority } });
  return override ?? SLA_DEFAULTS[priority];
}

export async function computeSlaDueDates(priority: TicketPriority, from: Date) {
  const policy = await getSlaPolicy(priority);
  return {
    slaResponseDueAt: new Date(from.getTime() + policy.responseMinutes * 60_000),
    slaResolutionDueAt: new Date(from.getTime() + policy.resolutionMinutes * 60_000),
  };
}

// The actual "automation": run periodically (see index.ts) or on demand
// (POST /api/tickets/sla/run-check, for demoing without waiting on the
// interval). Escalates any open/in_progress ticket that missed its
// resolution target and hasn't been escalated yet - bumps priority one
// level and logs a TicketEvent, so it surfaces on the Kanban board and the
// ticket's own activity log without needing a separate notifications
// system. Real email/SMS alerting is out of scope - see SDD.md.
export async function runSlaEscalationSweep() {
  const now = new Date();
  const overdue = await prisma.ticket.findMany({
    where: {
      status: { in: ['open', 'in_progress'] },
      slaEscalated: false,
      slaResolutionDueAt: { lt: now },
    },
  });

  let escalatedCount = 0;
  for (const ticket of overdue) {
    const next = nextEscalatedPriority(ticket.priority);
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { slaEscalated: true, priority: next ?? ticket.priority },
    });
    await prisma.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        eventType: 'escalated',
        detail: next
          ? `SLA breached - priority escalated ${ticket.priority} -> ${next}`
          : `SLA breached - already at max priority (${ticket.priority})`,
      },
    });
    escalatedCount += 1;
  }
  return { checked: overdue.length, escalated: escalatedCount };
}
