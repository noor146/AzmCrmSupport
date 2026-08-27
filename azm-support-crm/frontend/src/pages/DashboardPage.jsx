import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../i18n';

function Breakdown({ title, counts, total }) {
  const entries = Object.entries(counts);
  return (
    <div className="breakdown">
      <h3>{title}</h3>
      {!entries.length && <p className="muted">—</p>}
      {entries.map(([key, count]) => (
        <div className="breakdown-row" key={key}>
          <span className="breakdown-label">{key}</span>
          <div className="breakdown-bar">
            <span style={{ width: total ? `${(count / total) * 100}%` : 0 }} />
          </div>
          <span className="breakdown-count">{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [odooStatus, setOdooStatus] = useState(null);

  useEffect(() => {
    api.getDashboard(token).then(setData);
    api.getOdooStatus(token).then(setOdooStatus).catch(() => setOdooStatus({ connected: false }));
  }, []);

  if (!data) return <p>{t('loading')}</p>;

  return (
    <div>
      <div className="page-header">
        <h2 className="dashboard-greeting">{t('welcomeBack')}, {user?.name}</h2>
        {odooStatus && (
          <span className={`status-chip ${odooStatus.connected ? 'done' : 'todo'}`}>
            {t('odooConnection')}: {odooStatus.connected ? t('synced') : '—'}
          </span>
        )}
      </div>

      <div className="dashboard-kpis">
        <div className="dashboard-kpi">
          <span className="dashboard-kpi-value">{data.ticketTotal}</span>
          <span className="dashboard-kpi-label">{t('totalTickets')}</span>
        </div>
        <div className="dashboard-kpi">
          <span className="dashboard-kpi-value">{data.myOpenTicketCount}</span>
          <span className="dashboard-kpi-label">{t('myOpenTickets')}</span>
        </div>
        <div className="dashboard-kpi">
          <span className="dashboard-kpi-value">{data.leadTotal}</span>
          <span className="dashboard-kpi-label">{t('totalLeads')}</span>
        </div>
        <div className="dashboard-kpi">
          <span className="dashboard-kpi-value">{data.customerCount}</span>
          <span className="dashboard-kpi-label">{t('totalCustomers')}</span>
        </div>
        <div className="dashboard-kpi">
          <span className="dashboard-kpi-value">{data.articleCount}</span>
          <span className="dashboard-kpi-label">{t('articles')}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel-card">
          <Breakdown title={`${t('tickets')} — ${t('byStatus')}`} counts={data.ticketsByStatus} total={data.ticketTotal} />
          <Breakdown title={`${t('tickets')} — ${t('byPriority')}`} counts={data.ticketsByPriority} total={data.ticketTotal} />
          <Breakdown title={`${t('leads')} — ${t('byStatus')}`} counts={data.leadsByStatus} total={data.leadTotal} />
        </div>

        <div className="panel-card">
          <h3>{t('recentTickets')}</h3>
          <ul className="recent-list">
            {data.recentTickets.map((ticket) => (
              <li key={ticket.id}>
                <Link to={`/tickets/${ticket.id}`}>{ticket.subject}</Link>
                <span className="muted">{ticket.customer?.name} · {ticket.status}</span>
              </li>
            ))}
            {!data.recentTickets.length && <li className="muted">{t('noResults')}</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
