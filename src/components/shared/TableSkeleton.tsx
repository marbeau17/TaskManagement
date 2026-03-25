'use client'

interface TableSkeletonProps {
  /** Number of skeleton rows to display */
  rows?: number
  /** Number of columns per row */
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 8 }: TableSkeletonProps) {
  return (
    <div className="overflow-hidden">
      {/* Header skeleton */}
      <div className="flex gap-[8px] px-[12px] py-[10px] border-b border-wf-border">
        {Array.from({ length: columns }).map((_, colIdx) => (
          <div
            key={`header-${colIdx}`}
            className="h-[12px] bg-surf2 rounded-[4px] animate-pulse"
            style={{ width: `${60 + (colIdx % 3) * 20}px` }}
          />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="flex items-center gap-[8px] px-[12px] py-[12px] border-b border-wf-border last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={`cell-${rowIdx}-${colIdx}`}
              className="h-[14px] bg-surf2 rounded-[4px] animate-pulse"
              style={{
                width: `${50 + ((colIdx * 37 + rowIdx * 13) % 60)}px`,
                animationDelay: `${(rowIdx * columns + colIdx) * 50}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
