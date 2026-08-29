import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { checkOdooConnection, upsertPartner, upsertCrmLead, upsertHelpdeskTicket } from '../integrations/odoo';
import { customerSelect } from '../lib/selects';

export const odooRouter = Router();
odooRouter.use(requireAuth);

odooRouter.get('/status', async (_req, res) => {
  res.json(await checkOdooConnection());
});

odooRouter.post('/customers/:id', async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: Number(req.params.id) },
    select: customerSelect,
  });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  try {
    const odooPartnerId = await upsertPartner(customer);
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { odooPartnerId, odooSyncedAt: new Date() },
      select: customerSelect,
    });
    res.json(updated);
  } catch (err) {
    res.status(502).json({ error: `Odoo sync failed: ${(err as Error).message}` });
  }
});

odooRouter.post('/leads/:id', async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: Number(req.params.id) } });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    const odooLeadId = await upsertCrmLead(lead);
    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: { odooLeadId, odooSyncedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    res.status(502).json({ error: `Odoo sync failed: ${(err as Error).message}` });
  }
});

odooRouter.post('/tickets/:id', async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(req.params.id) },
    include: { customer: { select: customerSelect } },
  });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  try {
    let odooPartnerId = ticket.customer.odooPartnerId;
    if (!odooPartnerId) {
      odooPartnerId = await upsertPartner(ticket.customer);
      await prisma.customer.update({
        where: { id: ticket.customer.id },
        data: { odooPartnerId, odooSyncedAt: new Date() },
      });
    }

    const odooTicketId = await upsertHelpdeskTicket({ ...ticket, odooPartnerId });
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { odooTicketId, odooSyncedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    res.status(502).json({ error: `Odoo sync failed: ${(err as Error).message}` });
  }
});
