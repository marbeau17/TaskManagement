import { TableSkeleton } from '@/components/shared'

export default function ClientsLoading() {
  return (
    <div className="flex-1 overflow-auto p-[12px] md:p-[20px]">
      {/* Count placeholder */}
      <div className="flex items-center justify-between mb-[12px]">
        <div className="h-[12px] w-[120px] bg-surf2 rounded-[4px] animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden shadow overflow-x-auto">
        <TableSkeleton rows={6} columns={3} />
      </div>
    </div>
  )
}
