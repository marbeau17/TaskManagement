'use client'

interface KpiCardProps {
  label: string
  value: string | number
  unit?: string
  subText?: string
  subColor?: string
  variant: 'mint' | 'warning' | 'danger' | 'info' | 'purple'
}

const VARIANT_COLORS: Record<KpiCardProps['variant'], string> = {
  mint: 'var(--color-mint, #6FB5A3)',
  warning: 'var(--bar-warning, #C8A030)',
  danger: 'var(--bar-danger, #C05050)',
  info: 'var(--color-info, #1E4A7A)',
  purple: 'var(--color-purple, #8060B0)',
}

export function KpiCard({ label, value, unit, subText, subColor, variant }: KpiCardProps) {
  const borderColor = VARIANT_COLORS[variant]

  return (
    <div
      className="bg-surface border border-border2 rounded-[10px] p-[13px] relative overflow-hidden shadow"
    >
      {/* Top colored border */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ backgroundColor: borderColor }}
      />
      <div className="text-[10.5px] text-text2 mb-[4px]">{label}</div>
      <div className="flex items-baseline gap-[3px]">
        <span className="text-[22px] font-bold text-text leading-none">{value}</span>
        {unit && <span className="text-[11px] text-text2">{unit}</span>}
      </div>
      {subText && (
        <div
          className="text-[10px] mt-[4px]"
          style={{ color: subColor || 'var(--color-text3)' }}
        >
          {subText}
        </div>
      )}
    </div>
  )
}
