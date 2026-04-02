export default function MyPageLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border2 rounded-[10px] p-[13px] shadow h-[88px] animate-pulse" />
        ))}
      </div>

      {/* Warnings skeleton */}
      <div className="bg-surface border border-border2 rounded-[10px] shadow h-[80px] animate-pulse" />

      {/* Two column skeleton */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1.2fr_1fr] gap-[16px]">
        <div className="bg-surface border border-border2 rounded-[10px] shadow h-[200px] animate-pulse" />
        <div className="bg-surface border border-border2 rounded-[10px] shadow h-[200px] animate-pulse" />
      </div>

      {/* Week tasks skeleton */}
      <div className="bg-surface border border-border2 rounded-[10px] shadow h-[300px] animate-pulse" />

      {/* Activity skeleton */}
      <div className="bg-surface border border-border2 rounded-[10px] shadow h-[200px] animate-pulse" />
    </div>
  )
}
