export default function CrmLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
      <div className="h-[40px] bg-surf2 rounded animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border2 rounded-[10px] p-[13px] shadow h-[88px] animate-pulse" />
        ))}
      </div>
      <div className="bg-surface border border-border2 rounded-[10px] shadow h-[400px] animate-pulse" />
    </div>
  )
}
