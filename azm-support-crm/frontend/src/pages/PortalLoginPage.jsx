import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../lib/portalAuth';
import { useI18n } from '../i18n';

export default function PortalLoginPage() {
  const { login, token } = usePortalAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      await login(email, password);
      navigate('/portal', { replace: true });
    } catch {
      setError(t('invalidCredentials'));
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
            <h2>{t('login')}</h2>
          </div>

          <label>
            <span>{t('email')}</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            <span>{t('password')}</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          {error && <p className="error" role="alert">{error}</p>}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? t('loading') : t('login')}
          </button>

          <p className="login-demo-hint">
            {t('noAccountYet')} <Link to="/portal/signup">{t('signUp')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
