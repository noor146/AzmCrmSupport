import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../lib/portalAuth';
import { useI18n } from '../i18n';

export default function PortalSignupPage() {
  const { signup, token } = usePortalAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (token) {
    navigate('/portal', { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signup(form);
      navigate('/portal', { replace: true });
    } catch (err) {
      setError(err.status === 409 ? t('accountAlreadyExists') : t('signupFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand-top">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-mark-stub" />
            <span className="brand-mark-stub" />
          </span>
          <span className="brand-eyebrow">AZM Squad</span>
        </div>
        <div className="login-brand-body">
          <h1>{t('customerPortal')}</h1>
          <p>{t('portalBrandTagline')}</p>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-panel-top">
          <select className="locale-select" value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="en">EN</option>
            <option value="ar">AR</option>
          </select>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form-head">
            <h2>{t('signUp')}</h2>
          </div>

          <label>
            <span>{t('name')}</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            <span>{t('email')}</span>
            <input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            <span>{t('phone')}</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            <span>{t('password')}</span>
            <input type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>

          {error && <p className="error" role="alert">{error}</p>}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? t('loading') : t('signUp')}
          </button>

          <p className="login-demo-hint">
            {t('alreadyHaveAccount')} <Link to="/portal/login">{t('login')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
