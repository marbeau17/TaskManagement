'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'

interface TranslateButtonProps {
  text: string
  className?: string
}

export function TranslateButton({ text, className = '' }: TranslateButtonProps) {
  const { locale, t } = useI18n()
  const [translated, setTranslated] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showResult, setShowResult] = useState(false)

  const handleTranslate = async () => {
    if (translated && showResult) {
      setShowResult(false)
      return
    }
    if (translated) {
      setShowResult(true)
      return
    }

    setLoading(true)
    try {
      const targetLang = locale === 'ja' ? 'en' : 'ja'
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang }),
      })
      const data = await res.json()
      if (data.translated) {
        setTranslated(data.translated)
        setShowResult(true)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className={`inline-flex items-center gap-[4px] ${className}`}>
      <button
        onClick={handleTranslate}
        disabled={loading}
        className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-[4px] text-[12px] hover:bg-surf2 transition-colors disabled:opacity-50 cursor-pointer"
        title={locale === 'ja' ? t('translate.toEnglish') : t('translate.toJapanese')}
      >
        {loading ? (
          <span className="animate-spin text-[10px]">...</span>
        ) : (
          <span>🌐</span>
        )}
      </button>
      {showResult && translated && (
        <span className="text-[11px] text-text2 bg-surf2 px-[6px] py-[2px] rounded-[4px]">
          {translated}
        </span>
      )}
    </span>
  )
}
