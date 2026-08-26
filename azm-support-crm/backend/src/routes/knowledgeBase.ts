import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';

export const knowledgeBaseRouter = Router();

knowledgeBaseRouter.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const articles = await prisma.knowledgeArticle.findMany({
    where: q
      ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { tags: { has: q } }] }
      : undefined,
    orderBy: { createdAt: 'desc' },
  });
  res.json(articles);
});

knowledgeBaseRouter.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const { title, body, tags } = req.body ?? {};
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
  const article = await prisma.knowledgeArticle.create({
    data: { title, body, tags: tags ?? [], createdBy: req.user!.id },
  });
  res.status(201).json(article);
});

knowledgeBaseRouter.put('/:id', requireAuth, async (req, res) => {
  const { title, body, tags } = req.body ?? {};
  try {
    const article = await prisma.knowledgeArticle.update({
      where: { id: Number(req.params.id) },
      data: { title, body, tags },
    });
    res.json(article);
  } catch {
    res.status(404).json({ error: 'Article not found' });
  }
});

knowledgeBaseRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    await prisma.knowledgeArticle.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Article not found' });
  }
});
