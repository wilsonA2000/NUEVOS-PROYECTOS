import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonEs from './locales/es/common.json';
import contractsEs from './locales/es/contracts.json';
import propertiesEs from './locales/es/properties.json';
import paymentsEs from './locales/es/payments.json';
import maintenanceEs from './locales/es/maintenance.json';

import commonEn from './locales/en/common.json';
import contractsEn from './locales/en/contracts.json';
import propertiesEn from './locales/en/properties.json';
import paymentsEn from './locales/en/payments.json';
import maintenanceEn from './locales/en/maintenance.json';

const resources = {
  es: {
    common: commonEs,
    contracts: contractsEs,
    properties: propertiesEs,
    payments: paymentsEs,
    maintenance: maintenanceEs,
  },
  en: {
    common: commonEn,
    contracts: contractsEn,
    properties: propertiesEn,
    payments: paymentsEn,
    maintenance: maintenanceEn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'contracts', 'properties', 'payments', 'maintenance'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Default to Spanish if no language detected or if detected language is not supported
if (!['es', 'en'].includes(i18n.language)) {
  i18n.changeLanguage('es');
}

export default i18n;
