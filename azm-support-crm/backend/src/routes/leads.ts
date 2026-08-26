import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const leadsRouter = Router();
leadsRouter.use(requireAuth);

leadsRouter.get('/', async (req, res) => {
  const { source, status } = req.query;
  const leads = await prisma.lead.findMany({
    where: {
      source: source ? String(source) : undefined,
      status: status ? (String(status) as any) : undefined,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(leads);
});

leadsRouter.post('/', async (req, res) => {
  const { name, email, phone, company, source, priority, status } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name is required' });

  if (email || phone) {
    const duplicate = await prisma.lead.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });
    if (duplicate) {
      return res.status(409).json({
        error: 'A lead with this email or phone already exists',
        duplicate,
      });
    }
  }

  const lead = await prisma.lead.create({
    data: { name, email, phone, company, source, priority, status },
  });
  res.status(201).json(lead);
});

leadsRouter.get('/:id', async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: Number(req.params.id) } });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});

leadsRouter.put('/:id', async (req, res) => {
  const { name, email, phone, company, source, priority, status } = req.body ?? {};
  try {
    const lead = await prisma.lead.update({
      where: { id: Number(req.params.id) },
      data: { name, email, phone, company, source, priority, status },
    });
    res.json(lead);
  } catch {
    res.status(404).json({ error: 'Lead not found' });
  }
});

leadsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.lead.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Lead not found' });
  }
});
