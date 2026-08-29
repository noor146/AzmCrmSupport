import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { usePortalAuth } from '../lib/portalAuth';
import { useI18n } from '../i18n';

const CATEGORIES = ['general', 'billing', 'technical', 'other'];

export default function PortalDashboardPage() {
  const { token, customer } = usePortalAuth();
  const { t } = useI18n();
  const [tickets, setTickets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: 'general' });

  async function load() {
    setTickets(await api.portalListTickets(token));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.portalCreateTicket(token, form);
    setForm({ subject: '', description: '', category: 'general' });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="dashboard-greeting">{t('welcomeBack')}, {customer?.name}</h2>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>{t('newTicket')}</button>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <p className="inline-form-title">{t('newTicket')}</p>
          <label className="span-2">
            <span>{t('subject')}</span>
            <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </label>
          <label className="span-2">
            <span>{t('description')}</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label>
            <span>{t('category')}</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <div className="inline-form-actions">
            <button type="button" onClick={() => setShowForm(false)}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{t('save')}</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('subject')}</th>
              <th>{t('status')}</th>
              <th>{t('priority')}</th>
              <th>{t('createdOn')}</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td><Link to={`/portal/tickets/${ticket.id}`}>{ticket.subject}</Link></td>
                <td>{ticket.status}</td>
                <td>{ticket.priority}</td>
                <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {!tickets.length && (
              <tr>
                <td colSpan={4}>{t('noResults')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
