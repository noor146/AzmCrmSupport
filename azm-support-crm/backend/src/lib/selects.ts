// Shared Prisma `select` shapes for models that carry a password hash.
// `include: { customer: true }` / `{ assignedAgent: true }` would otherwise
// pull passwordHash into every response that embeds one of these records -
// see backend/tests for the regressions that caught this happening twice.

export const customerSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  company: true,
  notes: true,
  odooPartnerId: true,
  odooSyncedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const agentSelect = { id: true, name: true, email: true, isAdmin: true } as const;
