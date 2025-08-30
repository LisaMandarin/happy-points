import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import translation files
import enCommon from '../../public/locales/en/common.json'
import esCommon from '../../public/locales/es/common.json'
import frCommon from '../../public/locales/fr/common.json'
import deCommon from '../../public/locales/de/common.json'
import zhCommon from '../../public/locales/zh/common.json'
import jaCommon from '../../public/locales/ja/common.json'
import ptCommon from '../../public/locales/pt/common.json'
import itCommon from '../../public/locales/it/common.json'
import ruCommon from '../../public/locales/ru/common.json'
import koCommon from '../../public/locales/ko/common.json'

const resources = {
  en: { common: enCommon },
  es: { common: esCommon },
  fr: { common: frCommon },
  de: { common: deCommon },
  zh: { common: zhCommon },
  ja: { common: jaCommon },
  pt: { common: ptCommon },
  it: { common: itCommon },
  ru: { common: ruCommon },
  ko: { common: koCommon },
}

let isInitialized = false

export const initI18next = (language = 'en') => {
  if (!isInitialized) {
    i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: language,
        fallbackLng: 'en',
        defaultNS: 'common',
        ns: ['common'],
        interpolation: {
          escapeValue: false, // React already escapes by default
        },
        react: {
          useSuspense: false,
        },
      })
    isInitialized = true
  } else {
    // If already initialized, just change the language
    i18n.changeLanguage(language)
  }
  
  return i18n
}

export default i18n