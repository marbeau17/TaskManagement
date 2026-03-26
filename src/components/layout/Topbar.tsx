'use client'

interface TopbarProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export function Topbar({ title, subtitle, children, className }: TopbarProps) {
  return (
    <header className={`min-h-[50px] bg-surface border-b border-border2 flex flex-wrap items-center px-[12px] md:px-[20px] py-[6px] md:py-0 gap-[6px] shrink-0 ${className ?? ''}`}>
      <div className="flex flex-col justify-center min-w-0 flex-shrink">
        <h1 className="text-[13px] md:text-[15px] font-bold text-text leading-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-[9.5px] md:text-[10.5px] text-text3 leading-tight truncate">{subtitle}</p>
        )}
      </div>
      {/* Right side content */}
      {children && (
        <div className="ml-auto flex items-center gap-[6px] md:gap-[10px] flex-wrap">
          {children}
        </div>
      )}
    </header>
  )
}
