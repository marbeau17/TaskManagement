export default function MyPageLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border2 rounded-[10px] p-[13px] shadow h-[88px] animate-pulse">
            <div className="h-[10px] bg-surf2 rounded w-1/2 mb-[8px]" />
            <div className="h-[22px] bg-surf2 rounded w-1/3" />
          </div>
        ))}
      </div>

      {/* Warnings skeleton */}
      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
        <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
          <div className="h-[13px] bg-border2 rounded w-[140px]" />
        </div>
        <div className="p-[12px] space-y-[8px] animate-pulse">
          <div className="h-[36px] bg-surf2 rounded" />
          <div className="h-[36px] bg-surf2 rounded" />
        </div>
      </div>

      {/* Two column skeleton */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1.2fr_1fr] gap-[16px]">
        <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
          <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
            <div className="h-[13px] bg-border2 rounded w-[120px]" />
          </div>
          <div className="p-[12px] space-y-[8px] animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[32px] bg-surf2 rounded" />
            ))}
          </div>
        </div>
        <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
          <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
            <div className="h-[13px] bg-border2 rounded w-[100px]" />
          </div>
          <div className="p-[12px] space-y-[8px] animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[32px] bg-surf2 rounded" />
            ))}
          </div>
        </div>
      </div>

      {/* Week tasks skeleton */}
      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
        <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
          <div className="h-[13px] bg-border2 rounded w-[160px]" />
        </div>
        <div className="p-[12px] space-y-[8px] animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[32px] bg-surf2 rounded" />
          ))}
        </div>
      </div>

      {/* Activity skeleton */}
      <div className="bg-surface border border-border2 rounded-[10px] shadow-sm p-5">
        <div className="h-[13px] bg-surf2 rounded w-[160px] mb-4" />
        <div className="space-y-[12px] animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-surf2 shrink-0" />
              <div className="flex-1">
                <div className="h-[12px] bg-surf2 rounded w-3/4 mb-[6px]" />
                <div className="h-[10px] bg-surf2 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
