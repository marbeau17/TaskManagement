export default function SettingsLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
      {/* Tab bar placeholder */}
      <div className="flex items-center gap-[4px] border-b border-border2 pb-[1px]">
        <div className="h-[32px] w-[100px] bg-surf2 rounded-t-[8px] animate-pulse" />
        <div className="h-[32px] w-[100px] bg-surf2 rounded-t-[8px] animate-pulse" />
        <div className="h-[32px] w-[100px] bg-surf2 rounded-t-[8px] animate-pulse" />
      </div>

      {/* Form fields skeleton */}
      <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow-sm flex flex-col gap-[20px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-[8px]">
            <div className="h-[14px] w-[120px] bg-surf2 rounded-[4px] animate-pulse" />
            <div className="h-[38px] w-full bg-surf2 rounded-[7px] animate-pulse" />
          </div>
        ))}

        {/* Save button placeholder */}
        <div className="h-[38px] w-[100px] bg-surf2 rounded-[7px] animate-pulse mt-[8px]" />
      </div>
    </div>
  )
}
