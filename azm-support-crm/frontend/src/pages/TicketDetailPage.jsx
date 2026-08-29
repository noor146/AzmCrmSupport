import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../i18n';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

export default function TicketDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);

  async function load() {
    setTicket(await api.getTicket(token, id));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleStatusChange(e) {
    await api.updateTicket(token, id, { status: e.target.value });
    load();
  }

  async function handleDelete() {
    await api.deleteTicket(token, id);
    navigate('/tickets');
  }

  async function handleSyncOdoo() {
    await api.syncTicketToOdoo(token, id);
    load();
  }

  if (!ticket) return <p>{t('loading')}</p>;

  const isOpenState = ['open', 'in_progress'].includes(ticket.status);
  const resolutionOverdue = isOpenState && ticket.slaResolutionDueAt && new Date(ticket.slaResolutionDueAt) < new Date();

  return (
    <div className="ticket-detail">
      <h2>{ticket.subject}</h2>
      <p>{ticket.description}</p>
      <dl>
        <dt>{t('customer')}</dt>
        <dd>{ticket.customer?.name}</dd>
        <dt>{t('category')}</dt>
        <dd>{ticket.category}</dd>
        <dt>{t('priority')}</dt>
        <dd>
          {ticket.priority}
          {ticket.slaEscalated && <span className="status-chip todo sla-inline-badge">{t('slaEscalated')}</span>}
        </dd>
        <dt>{t('status')}</dt>
        <dd>
          <select value={ticket.status} onChange={handleStatusChange}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </dd>
        <dt>{t('assignedAgent')}</dt>
        <dd>{ticket.assignedAgent?.name ?? '-'}</dd>
        <dt>{t('slaResolutionDue')}</dt>
        <dd>
          {ticket.slaResolutionDueAt ? new Date(ticket.slaResolutionDueAt).toLocaleString() : '-'}
          {resolutionOverdue && <span className="status-chip todo sla-inline-badge">{t('overdue')}</span>}
        </dd>
        <dt>{t('odooSync')}</dt>
        <dd className="odoo-sync-cell">
          {ticket.odooTicketId && (
            <span className="status-chip done">{t('synced')} #{ticket.odooTicketId}</span>
          )}
          <button onClick={handleSyncOdoo}>{ticket.odooTicketId ? t('resyncToOdoo') : t('syncToOdoo')}</button>
        </dd>
      </dl>

      <h3>{t('activity')}</h3>
      <ul className="activity-log">
        {ticket.events.map((event) => (
          <li key={event.id}>
            <strong>{event.eventType}</strong> {event.detail} — {event.actorUser?.name ?? 'system'} ({new Date(event.createdAt).toLocaleString()})
          </li>
        ))}
      </ul>

      <button className="btn-danger" onClick={handleDelete}>{t('delete')}</button>
    </div>
  );
}
