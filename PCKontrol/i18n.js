import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import tr from './locales/tr.json';

const resources = {
  en: { translation: en },
  tr: { translation: tr }
};

const getDeviceLang = () => {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const languageCode = locales[0].languageCode;
    if (languageCode === 'tr') return 'tr';
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLang(), // default language based on device
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false 
    }
  });

AsyncStorage.getItem('@language').then(savedLang => {
  if (savedLang) {
    i18n.changeLanguage(savedLang);
  }
});

export default i18n;
