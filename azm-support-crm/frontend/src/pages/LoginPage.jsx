import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useI18n } from '../i18n';

export default function LoginPage() {
  const { login, token } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@azmsquad.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (token) {
    navigate('/tickets', { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/tickets', { replace: true });
    } catch {
      setError(t('invalidCredentials'));
    }
  }

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>{t('appName')}</h1>
        <label>
          {t('email')}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          {t('password')}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">{t('login')}</button>
      </form>
    </div>
  );
}
