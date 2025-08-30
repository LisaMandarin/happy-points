'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Select } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useLanguageStore } from '@/store/language'

const { Option } = Select

interface LanguageOption {
  code: string
  name: string
  nativeName: string
  flag: string
}

const languages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
]

interface LanguageDropdownProps {
  className?: string
}

export default function LanguageDropdown({ className }: LanguageDropdownProps) {
  const { i18n, t } = useTranslation('common')
  const [isLoading, setIsLoading] = useState(false)
  const { currentLanguage: storedLanguage, setLanguage } = useLanguageStore()

  const currentLanguage = languages.find(lang => lang.code === (i18n.language || storedLanguage)) || languages[0]

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === currentLanguage.code) return
    
    setIsLoading(true)
    
    try {
      // Update the language store
      setLanguage(languageCode)
      
      // Change the language in i18next
      await i18n.changeLanguage(languageCode)
    } catch (error) {
      console.error('Error changing language:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={className}>
      <Select
        value={currentLanguage.code}
        onChange={handleLanguageChange}
        loading={isLoading}
        className="min-w-[140px]"
        suffixIcon={<GlobalOutlined />}
        placeholder={t('language.selectLanguage')}
        size="middle"
      >
        {languages.map((language) => (
          <Option key={language.code} value={language.code}>
            <div className="flex items-center space-x-2">
              <span className="text-base">{language.flag}</span>
              <span className="font-medium">{language.nativeName}</span>
            </div>
          </Option>
        ))}
      </Select>
    </div>
  )
}