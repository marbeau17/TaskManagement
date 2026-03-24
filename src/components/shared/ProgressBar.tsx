'use client'

interface ProgressBarProps {
  value: number
  height?: 'sm' | 'md' | 'lg'
}

const HEIGHTS = {
  sm: 6,
  md: 8,
  lg: 10,
} as const

function getBarColor(value: number): string {
  if (value >= 100) return 'var(--color-ok)'
  if (value >= 75) return '#C8A030'
  if (value >= 26) return 'var(--color-mint)'
  return 'var(--color-text3)'
}

export function ProgressBar({ value, height = 'md' }: ProgressBarProps) {
  const h = HEIGHTS[height]
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      className="w-full bg-surf2 rounded-full overflow-hidden"
      style={{ height: h }}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${clamped}%`,
          backgroundColor: getBarColor(clamped),
        }}
      />
    </div>
  )
}
