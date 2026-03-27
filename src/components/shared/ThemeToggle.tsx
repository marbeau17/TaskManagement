'use client'

import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/hooks/useI18n'

const THEME_OPTIONS = [
  { value: 'light' as const, labelKey: 'settings.light', icon: '\u2600\uFE0F' },
  { value: 'dark' as const, labelKey: 'settings.dark', icon: '\uD83C\uDF19' },
  { value: 'system' as const, labelKey: 'settings.system', icon: '\uD83D\uDCBB' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()

  return (
    <div className="flex items-center bg-surf2 rounded-[7px] p-[3px] gap-[2px]">
      {THEME_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={`
            px-[10px] py-[4px] rounded-[5px] text-[11px] transition-all whitespace-nowrap
            ${
              theme === opt.value
                ? 'bg-surface text-mint-d font-bold shadow'
                : 'text-text2 hover:text-text'
            }
          `}
        >
          <span className="mr-[3px]">{opt.icon}</span>
          {t(opt.labelKey)}
        </button>
      ))}
    </div>
  )
}
