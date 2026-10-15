import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';

export type AppLanguage = 'en' | 'ar';

export function applyDocumentLanguage(language: AppLanguage) {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.body.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.body.classList.toggle('font-arabic', language === 'ar');
}

const saved = (localStorage.getItem('cg-language') as AppLanguage | null) ?? 'en';
applyDocumentLanguage(saved);

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: saved,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on('languageChanged', (language) => {
  applyDocumentLanguage(language === 'ar' ? 'ar' : 'en');
});

export default i18n;
