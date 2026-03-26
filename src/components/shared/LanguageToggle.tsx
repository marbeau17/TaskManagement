'use client'

import { useI18n } from '@/hooks/useI18n'
import type { Locale } from '@/lib/i18n/translations'

interface LanguageToggleProps {
  className?: string
  /** Compact variant for sidebar */
  variant?: 'default' | 'sidebar'
}

export function LanguageToggle({ className = '', variant = 'default' }: LanguageToggleProps) {
  const { locale, setLocale } = useI18n()

  const options: { value: Locale; label: string }[] = [
    { value: 'ja', label: 'JP' },
    { value: 'en', label: 'EN' },
  ]

  if (variant === 'sidebar') {
    return (
      <div className={`flex items-center rounded-[5px] bg-white/[0.08] p-[2px] gap-[1px] ${className}`}>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setLocale(opt.value)}
            className={`
              px-[8px] py-[2px] rounded-[4px] text-[10px] font-semibold transition-all cursor-pointer
              ${locale === opt.value
                ? 'bg-white/[0.2] text-white'
                : 'text-white/50 hover:text-white/70'
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={`flex items-center bg-surf2 rounded-[7px] p-[3px] gap-[2px] ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setLocale(opt.value)}
          className={`
            px-[10px] py-[4px] rounded-[5px] text-[11px] font-semibold transition-all cursor-pointer
            ${locale === opt.value
              ? 'bg-surface text-mint-d font-bold shadow'
              : 'text-text2 hover:text-text'
            }
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
