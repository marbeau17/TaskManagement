'use client'

interface TopbarProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export function Topbar({ title, subtitle, children }: TopbarProps) {
  return (
    <header className="h-[50px] bg-surface border-b border-border2 flex items-center px-[20px] shrink-0">
      <div className="flex flex-col justify-center">
        <h1 className="text-[15px] font-bold text-text leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-[10.5px] text-text3 leading-tight">{subtitle}</p>
        )}
      </div>
      {/* Right side content */}
      {children && (
        <div className="ml-auto flex items-center gap-[10px]">
          {children}
        </div>
      )}
    </header>
  )
}
