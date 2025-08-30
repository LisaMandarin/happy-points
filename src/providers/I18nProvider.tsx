'use client'

import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import { useLanguageStore } from '@/store/language'
import { initI18next } from '@/lib/i18n'

interface I18nProviderProps {
  children: React.ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const { currentLanguage } = useLanguageStore()

  useEffect(() => {
    // Initialize i18next with the current language
    initI18next(currentLanguage)
  }, [currentLanguage])

  return (
    <I18nextProvider i18n={initI18next(currentLanguage)}>
      {children}
    </I18nextProvider>
  )
}