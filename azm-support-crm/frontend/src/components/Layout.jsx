import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../lib/auth';

export default function Layout() {
  const { t, locale, setLocale } = useI18n();
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="app-name">{t('appName')}</span>
        <nav className="nav">
          <NavLink to="/dashboard">{t('dashboard')}</NavLink>
          <NavLink to="/tickets">{t('tickets')}</NavLink>
          <NavLink to="/leads">{t('leads')}</NavLink>
          <NavLink to="/live-chat">{t('liveChat')}</NavLink>
          <NavLink to="/customers">{t('customers')}</NavLink>
          <NavLink to="/knowledge-base">{t('knowledgeBase')}</NavLink>
        </nav>
        <div className="topbar-right">
          <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="en">EN</option>
            <option value="ar">AR</option>
          </select>
          <span className="user-name">{user?.name}</span>
          <button onClick={logout}>{t('logout')}</button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
