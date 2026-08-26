import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';

export const chatRouter = Router();

const agentSelect = { id: true, name: true } as const;

// --- Public widget endpoints (no auth: this is the visitor-facing side) ---

chatRouter.post('/conversations', async (req, res) => {
  const { visitorName, visitorEmail } = req.body ?? {};
  if (!visitorName) return res.status(400).json({ error: 'visitorName is required' });
  const conversation = await prisma.conversation.create({
    data: { visitorName, visitorEmail },
  });
  res.status(201).json(conversation);
});

chatRouter.get('/conversations/:id/messages', async (req, res) => {
  const conversationId = Number(req.params.id);
  const after = req.query.after ? Number(req.query.after) : undefined;
  const messages = await prisma.message.findMany({
    where: { conversationId, id: after ? { gt: after } : undefined },
    orderBy: { createdAt: 'asc' },
    include: { agentUser: { select: agentSelect } },
  });
  res.json(messages);
});

chatRouter.post('/conversations/:id/messages', async (req, res) => {
  const conversationId = Number(req.params.id);
  const { body } = req.body ?? {};
  if (!body) return res.status(400).json({ error: 'body is required' });

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const message = await prisma.message.create({
    data: { conversationId, sender: 'VISITOR', body },
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { status: 'OPEN' } });
  res.status(201).json(message);
});

// --- Agent-facing endpoints (auth required) ---

chatRouter.get('/agent/conversations', requireAuth, async (req, res) => {
  const { status } = req.query;
  const conversations = await prisma.conversation.findMany({
    where: { status: status ? (String(status).toUpperCase() as any) : undefined },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  res.json(conversations);
});

chatRouter.get('/agent/conversations/:id', requireAuth, async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: Number(req.params.id) },
    include: { messages: { orderBy: { createdAt: 'asc' }, include: { agentUser: { select: agentSelect } } } },
  });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  res.json(conversation);
});

chatRouter.post('/agent/conversations/:id/messages', requireAuth, async (req: AuthedRequest, res) => {
  const conversationId = Number(req.params.id);
  const { body } = req.body ?? {};
  if (!body) return res.status(400).json({ error: 'body is required' });

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const message = await prisma.message.create({
    data: { conversationId, sender: 'AGENT', body, agentUserId: req.user!.id },
    include: { agentUser: { select: agentSelect } },
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  res.status(201).json(message);
});

chatRouter.put('/agent/conversations/:id', requireAuth, async (req, res) => {
  const { status } = req.body ?? {};
  try {
    const conversation = await prisma.conversation.update({
      where: { id: Number(req.params.id) },
      data: { status: status ? String(status).toUpperCase() : undefined },
    });
    res.json(conversation);
  } catch {
    res.status(404).json({ error: 'Conversation not found' });
  }
});
