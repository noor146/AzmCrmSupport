import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../i18n';

const CATEGORIES = ['general', 'billing', 'technical', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

export default function TicketsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState('');
  const [mine, setMine] = useState(false);
  const [view, setView] = useState('kanban');
  const [showForm, setShowForm] = useState(false);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [form, setForm] = useState({ subject: '', description: '', category: 'general', priority: 'medium', customerId: '' });

  async function load() {
    const params = {};
    if (view === 'list' && status) params.status = status;
    if (mine) params.assigned_to = 'me';
    setTickets(await api.listTickets(token, params));
  }

  useEffect(() => {
    load();
  }, [status, mine, view]);

  useEffect(() => {
    api.listCustomers(token).then(setCustomers);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.createTicket(token, form);
    setShowForm(false);
    setForm({ subject: '', description: '', category: 'general', priority: 'medium', customerId: '' });
    load();
  }

  async function moveTicket(ticketId, newStatus) {
    setTickets((prev) => prev.map((tk) => (tk.id === ticketId ? { ...tk, status: newStatus } : tk)));
    await api.updateTicket(token, ticketId, { status: newStatus });
    load();
  }

  function handleDrop(e, newStatus) {
    e.preventDefault();
    setDragOverStatus(null);
    const ticketId = Number(e.dataTransfer.getData('text/ticket-id'));
    const ticket = tickets.find((tk) => tk.id === ticketId);
    if (ticket && ticket.status !== newStatus) moveTicket(ticketId, newStatus);
  }

  return (
    <div>
      <div className="page-header">
        <div className="view-toggle">
          <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>{t('kanbanView')}</button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>{t('listView')}</button>
        </div>
        {view === 'list' && (
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('status')}: all</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <label>
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          {t('myTickets')}
        </label>
        <button onClick={() => setShowForm((s) => !s)}>{t('newTicket')}</button>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <input placeholder={t('subject')} required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <textarea placeholder={t('description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required>
            <option value="">{t('customer')}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div>
            <button type="submit">{t('save')}</button>
            <button type="button" onClick={() => setShowForm(false)}>{t('cancel')}</button>
          </div>
        </form>
      )}

      {view === 'kanban' ? (
        <div className="kanban-board">
          {STATUSES.map((s) => {
            const columnTickets = tickets.filter((tk) => tk.status === s);
            return (
              <div
                key={s}
                className={`kanban-column${dragOverStatus === s ? ' drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverStatus(s); }}
                onDragLeave={() => setDragOverStatus((cur) => (cur === s ? null : cur))}
                onDrop={(e) => handleDrop(e, s)}
              >
                <div className="kanban-column-head">
                  <span>{s}</span>
                  <span className="kanban-count">{columnTickets.length}</span>
                </div>
                <div className="kanban-cards">
                  {columnTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="kanban-card"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/ticket-id', String(ticket.id))}
                    >
                      <Link to={`/tickets/${ticket.id}`}>{ticket.subject}</Link>
                      <div className="kanban-card-meta">
                        <span className={`priority-chip priority-${ticket.priority}`}>{ticket.priority}</span>
                        <span className="muted">{ticket.customer?.name}</span>
                      </div>
                      <div className="kanban-card-agent muted">{ticket.assignedAgent?.name ?? '—'}</div>
                    </div>
                  ))}
                  {!columnTickets.length && <p className="muted kanban-empty">{t('noResults')}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('subject')}</th>
                <th>{t('customer')}</th>
                <th>{t('status')}</th>
                <th>{t('priority')}</th>
                <th>{t('assignedAgent')}</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td><Link to={`/tickets/${ticket.id}`}>{ticket.subject}</Link></td>
                  <td>{ticket.customer?.name}</td>
                  <td>{ticket.status}</td>
                  <td>{ticket.priority}</td>
                  <td>{ticket.assignedAgent?.name ?? '-'}</td>
                </tr>
              ))}
              {!tickets.length && (
                <tr>
                  <td colSpan={5}>{t('noResults')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
