import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { customerSelect } from '../lib/selects';

export const customersRouter = Router();
customersRouter.use(requireAuth);

customersRouter.get('/', async (req, res) => {
  const search = String(req.query.search ?? '').trim();
  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    select: customerSelect,
  });
  res.json(customers);
});

customersRouter.post('/', async (req, res) => {
  const { name, email, phone, company, notes } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const customer = await prisma.customer.create({
    data: { name, email, phone, company, notes },
    select: customerSelect,
  });
  res.status(201).json(customer);
});

customersRouter.get('/:id', async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: Number(req.params.id) },
    include: { tickets: true },
  });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const { passwordHash, ...safeCustomer } = customer;
  res.json(safeCustomer);
});

customersRouter.put('/:id', async (req, res) => {
  const { name, email, phone, company, notes } = req.body ?? {};
  try {
    const customer = await prisma.customer.update({
      where: { id: Number(req.params.id) },
      data: { name, email, phone, company, notes },
      select: customerSelect,
    });
    res.json(customer);
  } catch {
    res.status(404).json({ error: 'Customer not found' });
  }
});

customersRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Customer not found' });
  }
});
