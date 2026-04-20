import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Spanish translations
import commonEs from './locales/es/common.json';
import navigationEs from './locales/es/navigation.json';
import authEs from './locales/es/auth.json';
import contractsEs from './locales/es/contracts.json';
import propertiesEs from './locales/es/properties.json';
import paymentsEs from './locales/es/payments.json';
import maintenanceEs from './locales/es/maintenance.json';
import dashboardEs from './locales/es/dashboard.json';

// English translations
import commonEn from './locales/en/common.json';
import navigationEn from './locales/en/navigation.json';
import authEn from './locales/en/auth.json';
import contractsEn from './locales/en/contracts.json';
import propertiesEn from './locales/en/properties.json';
import paymentsEn from './locales/en/payments.json';
import maintenanceEn from './locales/en/maintenance.json';
import dashboardEn from './locales/en/dashboard.json';

const resources = {
  es: {
    common: commonEs,
    navigation: navigationEs,
    auth: authEs,
    contracts: contractsEs,
    properties: propertiesEs,
    payments: paymentsEs,
    maintenance: maintenanceEs,
    dashboard: dashboardEs,
  },
  en: {
    common: commonEn,
    navigation: navigationEn,
    auth: authEn,
    contracts: contractsEn,
    properties: propertiesEn,
    payments: paymentsEn,
    maintenance: maintenanceEn,
    dashboard: dashboardEn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    defaultNS: 'common',
    ns: [
      'common',
      'navigation',
      'auth',
      'contracts',
      'properties',
      'payments',
      'maintenance',
      'dashboard',
    ],
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
