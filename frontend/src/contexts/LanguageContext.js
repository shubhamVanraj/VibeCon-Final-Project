import { createContext, useContext, useState, useCallback } from 'react';
import { translations } from '../lib/translations';
import api from '../lib/api';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('rinkosh_language') || 'en';
  });

  const t = translations[language] || translations.en;

  const setLanguage = useCallback(async (lang) => {
    setLanguageState(lang);
    localStorage.setItem('rinkosh_language', lang);
    try {
      await api.put('/user/language', { language: lang });
    } catch {
      // Not logged in or failed - language still saved locally
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
