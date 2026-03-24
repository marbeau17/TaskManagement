'use client'

import { KpiCard } from '@/components/shared'
import { useTaskStats } from '@/hooks/useTasks'

export function KpiCards() {
  const { data: stats } = useTaskStats()

  return (
    <div className="grid grid-cols-4 gap-[12px]">
      {/* 今週のタスク数 */}
      <KpiCard
        label="今週のタスク数"
        value={stats.totalCount}
        unit="件"
        subText={`▲ 先週比 +${stats.totalCount}タスク`}
        subColor="#4A9482"
        variant="mint"
      />

      {/* アサイン待ち */}
      <KpiCard
        label="アサイン待ち"
        value={stats.waitingCount}
        unit="件"
        subText={stats.waitingCount > 0 ? '⚠ 要対応' : '対応不要'}
        subColor={stats.waitingCount > 0 ? '#C8A030' : undefined}
        variant="warning"
      />

      {/* 今週の完了率 */}
      <KpiCard
        label="今週の完了率"
        value={stats.completionRate}
        unit="%"
        subText={`${stats.doneCount} / ${stats.totalCount}件 完了`}
        variant="mint"
      />

      {/* 納期超過 */}
      <KpiCard
        label="納期超過"
        value={stats.overdueCount}
        unit="件"
        subText={stats.overdueCount > 0 ? '即時対応が必要' : '超過なし'}
        subColor={stats.overdueCount > 0 ? '#C05050' : undefined}
        variant="danger"
      />
    </div>
  )
}
