import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import en from './en.json';
import ar from './ar.json';

const dictionaries = { en, ar };
const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(localStorage.getItem('locale') || 'en');

  useEffect(() => {
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const t = useMemo(() => {
    const dict = dictionaries[locale];
    return (key) => dict[key] ?? key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
