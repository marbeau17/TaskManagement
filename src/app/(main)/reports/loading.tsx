export default function ReportsLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
      {/* KPI skeleton row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-border2 rounded-[10px] p-[13px] shadow h-[88px] animate-pulse"
          />
        ))}
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow-sm flex flex-col gap-[12px]"
          >
            <div className="h-[16px] w-[140px] bg-surf2 rounded-[4px] animate-pulse" />
            <div className="h-[200px] w-full bg-surf2 rounded-[8px] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
