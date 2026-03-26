import { TableSkeleton } from '@/components/shared'

export default function IssuesLoading() {
  return (
    <div className="flex-1 overflow-auto p-[12px] md:p-[20px]">
      {/* Filter bar placeholder */}
      <div className="mb-[16px] flex items-center gap-[8px] flex-wrap">
        <div className="h-[34px] w-[200px] bg-surf2 rounded-[7px] animate-pulse" />
        <div className="h-[34px] w-[100px] bg-surf2 rounded-[7px] animate-pulse" />
        <div className="h-[34px] w-[80px] bg-surf2 rounded-[7px] animate-pulse" />
        <div className="h-[34px] w-[80px] bg-surf2 rounded-[7px] animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
        <TableSkeleton rows={8} columns={8} />
      </div>
    </div>
  )
}
