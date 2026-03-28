import { CardGridSkeleton } from '@/components/shared'

export default function TemplatesLoading() {
  return (
    <div className="flex-1 overflow-auto p-[12px] md:p-[20px]">
      {/* Filter bar placeholder */}
      <div className="mb-[16px] flex items-center gap-[8px]">
        <div className="h-[34px] w-[200px] bg-surf2 rounded-[7px] animate-pulse" />
        <div className="h-[34px] w-[100px] bg-surf2 rounded-[7px] animate-pulse" />
      </div>

      {/* Card grid skeleton */}
      <CardGridSkeleton cards={6} />
    </div>
  )
}
