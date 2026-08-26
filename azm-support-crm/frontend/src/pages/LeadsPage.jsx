import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../i18n';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST'];
const empty = { name: '', email: '', phone: '', company: '', source: '', priority: 'medium', status: 'NEW' };

export default function LeadsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [leads, setLeads] = useState([]);
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [duplicate, setDuplicate] = useState(null);

  async function load() {
    const params = {};
    if (source) params.source = source;
    if (status) params.status = status;
    setLeads(await api.listLeads(token, params));
  }

  useEffect(() => {
    load();
  }, [source, status]);

  async function handleSubmit(e) {
    e.preventDefault();
    setDuplicate(null);
    try {
      await api.createLead(token, form);
      setForm(empty);
      setShowForm(false);
      load();
    } catch (err) {
      if (err.status === 409) {
        setDuplicate(err.data?.duplicate ?? null);
      } else {
        throw err;
      }
    }
  }

  async function handleDelete(id) {
    await api.deleteLead(token, id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <input className="search" placeholder={t('source')} value={source} onChange={(e) => setSource(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('status')}: all</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>{t('newLead')}</button>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <input placeholder={t('name')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder={t('email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder={t('phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder={t('company')} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <input placeholder={t('source')} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {duplicate && (
            <p className="error">
              {t('duplicateLeadWarning')} {duplicate.name} ({duplicate.email || duplicate.phone})
            </p>
          )}

          <div>
            <button type="submit" className="btn-primary">{t('save')}</button>
            <button type="button" onClick={() => setShowForm(false)}>{t('cancel')}</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('email')}</th>
              <th>{t('phone')}</th>
              <th>{t('source')}</th>
              <th>{t('priority')}</th>
              <th>{t('status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.name}</td>
                <td>{lead.email}</td>
                <td>{lead.phone}</td>
                <td>{lead.source}</td>
                <td>{lead.priority}</td>
                <td>{lead.status}</td>
                <td>
                  <button className="btn-danger" onClick={() => handleDelete(lead.id)}>{t('delete')}</button>
                </td>
              </tr>
            ))}
            {!leads.length && (
              <tr>
                <td colSpan={7}>{t('noResults')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
