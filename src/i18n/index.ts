import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { moment } from 'obsidian';
import en from './locales/en';
import zh from './locales/zh';
import zhMeme from './locales/zh-meme';

const resources = {
  en: {
    translation: en,
  },
  zh: {
    translation: zh,
  },
  'zh-cn': {
    translation: zh,
  },
  'zh-CN': {
    translation: zh,
  },
  // Fallback for Traditional Chinese to Simplified if not available
  'zh-tw': {
    translation: zh,
  },
  'zh-TW': {
    translation: zh,
  },
  'zh-meme': {
    translation: zhMeme,
  },
};

// Use Obsidian's moment.locale() as the primary source of truth
// window.localStorage may not be reliable or accessible in all contexts immediately
const getUserLocale = () => {
  let loc = moment.locale();
  if (loc === 'en') {
    const saved = window.localStorage.getItem('language');
    if (saved) loc = saved;
  }
  return loc;
};

const locale = getUserLocale();

i18n.use(initReactI18next).init({
  resources,
  lng: locale,
  fallbackLng: 'en',
  load: 'currentOnly',
  lowerCaseLng: true,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
