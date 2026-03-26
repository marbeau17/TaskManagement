'use client'

interface CardGridSkeletonProps {
  /** Number of card placeholders to display */
  cards?: number
}

export function CardGridSkeleton({ cards = 4 }: CardGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={`card-${i}`}
          className="bg-surface border border-border2 rounded-[10px] shadow p-[16px] animate-pulse"
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-[10px]">
            <div className="flex items-center gap-[8px]">
              <div className="h-[16px] w-[40px] bg-surf2 rounded-[4px]" />
              <div
                className="h-[14px] bg-surf2 rounded-[4px]"
                style={{ width: `${100 + (i % 3) * 30}px` }}
              />
            </div>
            <div className="h-[18px] w-[48px] bg-surf2 rounded-full" />
          </div>

          {/* Description */}
          <div className="space-y-[4px] mb-[12px]">
            <div className="h-[10px] w-full bg-surf2 rounded-[4px]" />
            <div className="h-[10px] w-[70%] bg-surf2 rounded-[4px]" />
          </div>

          {/* Avatar row */}
          <div className="flex items-center gap-[6px] mb-[12px]">
            <div className="h-[22px] w-[22px] bg-surf2 rounded-full" />
            <div className="h-[10px] w-[60px] bg-surf2 rounded-[4px]" />
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-[16px] mb-[8px]">
            <div className="h-[10px] w-[50px] bg-surf2 rounded-[4px]" />
            <div className="h-[10px] w-[50px] bg-surf2 rounded-[4px]" />
            <div className="h-[10px] w-[30px] bg-surf2 rounded-[4px] ml-auto" />
          </div>

          {/* Progress bar */}
          <div className="h-[4px] w-full bg-surf2 rounded-full" />
        </div>
      ))}
    </div>
  )
}
