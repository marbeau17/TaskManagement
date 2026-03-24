'use client'

import { useActivityLogs } from '@/hooks/useTasks'
import type { ActivityAction } from '@/types/database'

interface ActivityLogProps {
  taskId: string
}

const ACTION_LABELS: Record<ActivityAction, string> = {
  created: 'タスクを作成',
  assigned: 'アサインを設定',
  progress_updated: '進捗を更新',
  status_changed: 'ステータスを変更',
  hours_updated: '工数を更新',
  comment_added: 'コメントを追加',
  deadline_changed: '納期を変更',
  rejected: '差し戻し',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export function ActivityLog({ taskId }: ActivityLogProps) {
  const { data: logs, isLoading } = useActivityLogs(taskId)

  const sorted = logs
    ? [...logs].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : []

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      <h3 className="text-[13px] font-bold text-text mb-4">
        {'📝 更新履歴'}
      </h3>

      {isLoading && (
        <p className="text-[12px] text-text3">読み込み中...</p>
      )}

      {sorted.length === 0 && !isLoading && (
        <p className="text-[12px] text-text3">更新履歴はありません</p>
      )}

      <div className="flex flex-col gap-0">
        {sorted.map((log, i) => (
          <div key={log.id} className="flex gap-3">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div
                className="w-2 h-2 rounded-full bg-mint shrink-0 mt-1.5"
              />
              {i < sorted.length - 1 && (
                <div className="w-[1px] flex-1 bg-border2 min-h-[20px]" />
              )}
            </div>

            {/* Content */}
            <div className="pb-3 text-[12px]">
              <span className="text-text3">{formatDate(log.created_at)}</span>
              <span className="text-text3 mx-1">|</span>
              <span className="text-text2">
                {log.user?.name ?? '不明'}が
              </span>
              <span className="text-text font-bold mx-0.5">
                {ACTION_LABELS[log.action]}
              </span>
              <span className="text-text2">を行った</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
