import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../i18n';

const empty = { name: '', email: '', phone: '', company: '', notes: '' };

export default function CustomersPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setCustomers(await api.listCustomers(token, search));
  }

  useEffect(() => {
    load();
  }, [search]);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.createCustomer(token, form);
    setForm(empty);
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    await api.deleteCustomer(token, id);
    load();
  }

  async function handleSyncOdoo(id) {
    await api.syncCustomerToOdoo(token, id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <input
          className="search"
          placeholder={t('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>{t('newCustomer')}</button>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <input placeholder={t('name')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder={t('email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder={t('phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder={t('company')} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <textarea placeholder={t('notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
              <th>{t('company')}</th>
              <th>{t('odooSync')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td>{c.phone}</td>
                <td>{c.company}</td>
                <td>
                  {c.odooPartnerId ? (
                    <span className="status-chip done">{t('synced')} #{c.odooPartnerId}</span>
                  ) : (
                    <button onClick={() => handleSyncOdoo(c.id)}>{t('syncToOdoo')}</button>
                  )}
                </td>
                <td>
                  <button className="btn-danger" onClick={() => handleDelete(c.id)}>{t('delete')}</button>
                </td>
              </tr>
            ))}
            {!customers.length && (
              <tr>
                <td colSpan={6}>{t('noResults')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
