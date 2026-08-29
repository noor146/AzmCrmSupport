import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { usePortalAuth } from '../lib/portalAuth';
import { useI18n } from '../i18n';

export default function PortalTicketDetailPage() {
  const { id } = useParams();
  const { token } = usePortalAuth();
  const { t } = useI18n();
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    api.portalGetTicket(token, id).then(setTicket);
  }, [id]);

  if (!ticket) return <p>{t('loading')}</p>;

  return (
    <div className="ticket-detail">
      <h2>{ticket.subject}</h2>
      <p>{ticket.description}</p>
      <dl>
        <dt>{t('category')}</dt>
        <dd>{ticket.category}</dd>
        <dt>{t('priority')}</dt>
        <dd>{ticket.priority}</dd>
        <dt>{t('status')}</dt>
        <dd>{ticket.status}</dd>
        <dt>{t('assignedAgent')}</dt>
        <dd>{ticket.assignedAgent?.name ?? '-'}</dd>
      </dl>

      <h3>{t('activity')}</h3>
      <ul className="activity-log">
        {ticket.events.map((event) => (
          <li key={event.id}>
            <strong>{event.eventType}</strong> {event.detail} ({new Date(event.createdAt).toLocaleString()})
          </li>
        ))}
      </ul>
    </div>
  );
}
