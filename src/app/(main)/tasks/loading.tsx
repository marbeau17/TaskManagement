import { TableSkeleton } from '@/components/shared'

export default function TasksLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
      {/* Filter bar placeholder */}
      <div className="flex items-center gap-[8px]">
        <div className="h-[34px] w-[200px] bg-surf2 rounded-[7px] animate-pulse" />
        <div className="h-[34px] w-[100px] bg-surf2 rounded-[7px] animate-pulse" />
        <div className="h-[34px] w-[100px] bg-surf2 rounded-[7px] animate-pulse" />
      </div>

      {/* Status tabs placeholder */}
      <div className="flex gap-[4px] border-b border-border2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[32px] w-[72px] bg-surf2 rounded-t-[6px] animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-surface rounded-[10px] border border-wf-border shadow-sm overflow-hidden">
        <TableSkeleton rows={8} columns={8} />
      </div>
    </div>
  )
}
