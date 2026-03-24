'use client'

import { useTheme } from '@/hooks/useTheme'

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'ライト', icon: '\u2600\uFE0F' },
  { value: 'dark' as const, label: 'ダーク', icon: '\uD83C\uDF19' },
  { value: 'system' as const, label: 'システム', icon: '\uD83D\uDCBB' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

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
          {opt.label}
        </button>
      ))}
    </div>
  )
}
