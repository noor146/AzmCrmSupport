import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { customersRouter } from './routes/customers';
import { ticketsRouter } from './routes/tickets';
import { knowledgeBaseRouter } from './routes/knowledgeBase';
import { leadsRouter } from './routes/leads';
import { dashboardRouter } from './routes/dashboard';
import { chatRouter } from './routes/chat';
import { odooRouter } from './routes/odoo';

export const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/knowledge-base', knowledgeBaseRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/chat', chatRouter);
app.use('/api/odoo', odooRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Last resort: any error a route didn't catch itself (e.g. an unexpected
// Prisma error) lands here instead of Express's default HTML/stack-trace
// response, which was leaking internals (see backend/tests for the
// regression that caught this via ?status=<garbage> on the list endpoints).
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);
