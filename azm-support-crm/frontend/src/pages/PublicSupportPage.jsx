import ChatWidget from '../components/ChatWidget';
import { useI18n } from '../i18n';

export default function PublicSupportPage() {
  const { t, locale, setLocale } = useI18n();

  return (
    <div className="public-page">
      <header className="public-header">
        <span className="app-name">{t('appName')}</span>
        <select className="locale-select" value={locale} onChange={(e) => setLocale(e.target.value)}>
          <option value="en">EN</option>
          <option value="ar">AR</option>
        </select>
      </header>

      <main className="public-hero">
        <h1>{t('publicHeroTitle')}</h1>
        <p>{t('publicHeroBody')}</p>
      </main>

      <ChatWidget />
    </div>
  );
}
