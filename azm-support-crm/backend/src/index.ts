import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { customersRouter } from './routes/customers';
import { ticketsRouter } from './routes/tickets';
import { knowledgeBaseRouter } from './routes/knowledgeBase';
import { leadsRouter } from './routes/leads';
import { dashboardRouter } from './routes/dashboard';
import { chatRouter } from './routes/chat';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/knowledge-base', knowledgeBaseRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/chat', chatRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const port = process.env.PORT ?? 4000;
app.listen(port, () => console.log(`API listening on :${port}`));
