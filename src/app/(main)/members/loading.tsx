import { MemberListSkeleton } from '@/components/shared'

export default function MembersLoading() {
  return (
    <div className="flex-1 overflow-auto p-[12px] md:p-[20px]">
      {/* Tab bar placeholder */}
      <div className="flex gap-[4px] mb-[16px] border-b border-border2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[32px] w-[90px] bg-surf2 rounded-t-[6px] animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>

      {/* Count placeholder */}
      <div className="flex items-center justify-between mb-[12px]">
        <div className="h-[12px] w-[100px] bg-surf2 rounded-[4px] animate-pulse" />
      </div>

      {/* Member list skeleton */}
      <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden shadow overflow-x-auto">
        <MemberListSkeleton rows={6} />
      </div>
    </div>
  )
}
