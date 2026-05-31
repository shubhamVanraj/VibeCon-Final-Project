import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations } from '../lib/translations';
import api from '../lib/api';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('rinkosh_language') || 'en';
  });

  const t = translations[language] || translations.en;

  // Mirror language to <html lang> so [lang="hi"] CSS rules activate
  // (Devanagari font swap relies on this attribute.)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback(async (lang) => {
    setLanguageState(lang);
    localStorage.setItem('rinkosh_language', lang);
    try {
      await api.put('/user/language', { language: lang });
    } catch (err) {
      // Not logged in or failed - language still saved locally
      console.debug('Language sync skipped:', err.message);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
