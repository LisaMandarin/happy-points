import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LanguageState {
  currentLanguage: string
  setLanguage: (language: string) => void
}

const getInitialLanguage = (): string => {
  if (typeof window === 'undefined') return 'en'
  
  // Check localStorage first
  const savedLanguage = localStorage.getItem('language-storage')
  if (savedLanguage) {
    try {
      const parsed = JSON.parse(savedLanguage)
      if (parsed.state?.currentLanguage) {
        return parsed.state.currentLanguage
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  // Fallback to browser language
  const browserLang = navigator.language.substring(0, 2)
  const supportedLanguages = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'pt', 'it', 'ru', 'ko']
  return supportedLanguages.includes(browserLang) ? browserLang : 'en'
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      currentLanguage: getInitialLanguage(),
      setLanguage: (language: string) => set({ currentLanguage: language }),
    }),
    {
      name: 'language-storage', // unique name for localStorage key
    }
  )
)