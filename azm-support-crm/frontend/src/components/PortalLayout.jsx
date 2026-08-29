import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../i18n';
import { usePortalAuth } from '../lib/portalAuth';

export default function PortalLayout() {
  const { t, locale, setLocale } = useI18n();
  const { customer, logout } = usePortalAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="app-name">{t('customerPortal')}</span>
        <nav className="nav">
          <NavLink to="/portal">{t('myTicketsNav')}</NavLink>
        </nav>
        <div className="topbar-right">
          <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="en">EN</option>
            <option value="ar">AR</option>
          </select>
          <span className="user-name">{customer?.name}</span>
          <button className="btn-ghost" onClick={logout}>{t('logout')}</button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
