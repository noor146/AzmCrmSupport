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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: 'general', priority: 'medium', customerId: '' });

  async function load() {
    const params = {};
    if (status) params.status = status;
    if (mine) params.assigned_to = 'me';
    setTickets(await api.listTickets(token, params));
  }

  useEffect(() => {
    load();
  }, [status, mine]);

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

  return (
    <div>
      <div className="page-header">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('status')}: all</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
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
    </div>
  );
}
