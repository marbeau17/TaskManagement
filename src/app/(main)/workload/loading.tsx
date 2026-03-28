import { TableSkeleton } from '@/components/shared'

export default function WorkloadLoading() {
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

      {/* Table skeleton */}
      <div className="bg-surface rounded-[10px] border border-wf-border shadow-sm overflow-hidden">
        <TableSkeleton rows={8} columns={6} />
      </div>
    </div>
  )
}
