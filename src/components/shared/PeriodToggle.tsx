'use client'

interface PeriodOption {
  label: string
  value: string
}

interface PeriodToggleProps {
  options: PeriodOption[]
  value: string
  onChange: (value: string) => void
}

export function PeriodToggle({ options, value, onChange }: PeriodToggleProps) {
  return (
    <div className="flex items-center bg-surf2 rounded-[7px] p-[3px] gap-[2px]">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`
            px-[12px] py-[4px] rounded-[5px] text-[11.5px] transition-all
            ${
              value === opt.value
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
