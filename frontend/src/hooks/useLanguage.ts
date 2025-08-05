import { useState, useCallback, useEffect } from 'react';

type Language = 'es' | 'en';

export const useLanguage = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language');
    return (savedLanguage as Language) || 'es';
  });

  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const module = await import(`../translations/${language}.json`);
        setTranslations(module.default);
      } catch (error) {
        console.error('Error loading translations:', error);
      }
    };

    loadTranslations();
  }, [language]);

  const setAppLanguage = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string>) => {
      let translation = translations[key] || key;

      if (params) {
        Object.entries(params).forEach(([param, value]) => {
          translation = translation.replace(`{${param}}`, value);
        });
      }

      return translation;
    },
    [translations]
  );

  return {
    language,
    setLanguage: setAppLanguage,
    t,
  };
}; 