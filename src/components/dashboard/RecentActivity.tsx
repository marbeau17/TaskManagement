'use client'

import Link from 'next/link'
import { useRecentActivityLogs } from '@/hooks/useTasks'
import { Avatar } from '@/components/shared'
import type { ActivityAction } from '@/types/database'

const ACTION_LABELS: Record<ActivityAction, string> = {
  created: 'タスクを作成',
  assigned: '担当者をアサイン',
  progress_updated: '進捗を更新',
  status_changed: 'ステータスを変更',
  hours_updated: '工数を更新',
  comment_added: 'コメントを追加',
  deadline_changed: '納期を変更',
  rejected: '差し戻し',
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'たった今'
  if (diffMin < 60) return `${diffMin}分前`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}時間前`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}日前`
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

export function RecentActivity() {
  const { data: logs, isLoading } = useRecentActivityLogs(5)

  return (
    <div className="bg-surface rounded-[10px] border border-wf-border shadow-sm p-5">
      <h3 className="text-[13px] font-bold text-text mb-4">
        最近のアクティビティ
      </h3>

      {isLoading && (
        <p className="text-[12px] text-text3">読み込み中...</p>
      )}

      {logs && logs.length === 0 && (
        <p className="text-[12px] text-text3">アクティビティはありません</p>
      )}

      <div className="flex flex-col gap-3">
        {logs?.map((log) => (
          <div key={log.id} className="flex items-start gap-3">
            {log.user && (
              <Avatar
                name_short={log.user.name_short}
                color={log.user.avatar_color}
                size="sm"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-text leading-relaxed">
                <span className="font-semibold">{log.user?.name ?? '不明'}</span>
                {'  '}
                {ACTION_LABELS[log.action] ?? log.action}
              </p>
              {log.task && (
                <Link
                  href={`/tasks/${log.task.id}`}
                  className="text-[11px] text-mint-dd hover:underline truncate block"
                  onClick={(e) => e.stopPropagation()}
                >
                  {log.task.title}
                </Link>
              )}
            </div>
            <span className="text-[10px] text-text3 whitespace-nowrap flex-shrink-0">
              {formatTimeAgo(log.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
