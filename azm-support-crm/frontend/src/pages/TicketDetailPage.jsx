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

  if (!ticket) return <p>{t('loading')}</p>;

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
        <dd>{ticket.priority}</dd>
        <dt>{t('status')}</dt>
        <dd>
          <select value={ticket.status} onChange={handleStatusChange}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </dd>
        <dt>{t('assignedAgent')}</dt>
        <dd>{ticket.assignedAgent?.name ?? '-'}</dd>
      </dl>

      <h3>{t('activity')}</h3>
      <ul className="activity-log">
        {ticket.events.map((event) => (
          <li key={event.id}>
            <strong>{event.eventType}</strong> {event.detail} — {event.actorUser?.name ?? 'system'} ({new Date(event.createdAt).toLocaleString()})
          </li>
        ))}
      </ul>

      <button onClick={handleDelete}>{t('delete')}</button>
    </div>
  );
}
