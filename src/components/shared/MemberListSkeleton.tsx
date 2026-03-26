'use client'

interface MemberListSkeletonProps {
  /** Number of skeleton rows to display */
  rows?: number
}

export function MemberListSkeleton({ rows = 6 }: MemberListSkeletonProps) {
  return (
    <div className="overflow-hidden">
      {/* Header skeleton */}
      <div className="min-w-[600px] grid grid-cols-[1fr_1fr_100px_80px_80px_110px] gap-[8px] px-[16px] py-[10px] bg-surf2 border-b border-border2">
        {['名前', 'メール', 'ロール', '週キャパ', 'ステータス', '操作'].map(
          (_, idx) => (
            <div
              key={`mh-${idx}`}
              className="h-[10px] bg-border2 rounded-[4px] animate-pulse"
              style={{ width: `${40 + (idx % 3) * 12}px` }}
            />
          )
        )}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`mr-${rowIdx}`}
          className="min-w-[600px] grid grid-cols-[1fr_1fr_100px_80px_80px_110px] gap-[8px] px-[16px] py-[10px] border-b border-border2 last:border-b-0 items-center"
        >
          {/* Name with avatar */}
          <div className="flex items-center gap-[8px]">
            <div
              className="h-[24px] w-[24px] bg-surf2 rounded-full animate-pulse"
              style={{ animationDelay: `${rowIdx * 80}ms` }}
            />
            <div
              className="h-[12px] bg-surf2 rounded-[4px] animate-pulse"
              style={{
                width: `${60 + (rowIdx % 4) * 15}px`,
                animationDelay: `${rowIdx * 80 + 30}ms`,
              }}
            />
          </div>

          {/* Email */}
          <div
            className="h-[10px] bg-surf2 rounded-[4px] animate-pulse"
            style={{
              width: `${100 + (rowIdx % 3) * 20}px`,
              animationDelay: `${rowIdx * 80 + 60}ms`,
            }}
          />

          {/* Role */}
          <div className="flex justify-center">
            <div
              className="h-[18px] w-[54px] bg-surf2 rounded-full animate-pulse"
              style={{ animationDelay: `${rowIdx * 80 + 90}ms` }}
            />
          </div>

          {/* Capacity */}
          <div className="flex justify-end">
            <div
              className="h-[10px] w-[28px] bg-surf2 rounded-[4px] animate-pulse"
              style={{ animationDelay: `${rowIdx * 80 + 120}ms` }}
            />
          </div>

          {/* Status */}
          <div className="flex justify-center">
            <div
              className="h-[18px] w-[36px] bg-surf2 rounded-full animate-pulse"
              style={{ animationDelay: `${rowIdx * 80 + 150}ms` }}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-[8px]">
            <div
              className="h-[10px] w-[24px] bg-surf2 rounded-[4px] animate-pulse"
              style={{ animationDelay: `${rowIdx * 80 + 180}ms` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
