'use client'

import { useActivityLogs } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'
import type { ActivityAction } from '@/types/database'

interface ActivityLogProps {
  taskId: string
}

const ACTION_LABEL_KEYS: Record<ActivityAction, string> = {
  created: 'activity.created',
  assigned: 'activity.assigned',
  progress_updated: 'activity.progressUpdated',
  status_changed: 'activity.statusChanged',
  hours_updated: 'activity.hoursUpdated',
  comment_added: 'activity.commentAdded',
  deadline_changed: 'activity.deadlineChanged',
  rejected: 'activity.rejected',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

// IMP_MC-1 / WEB-41: surface what actually changed so the requester can see
// e.g. deadline changes / status moves in plain language.
function formatDetail(detail: unknown): string {
  if (!detail) return ''
  if (typeof detail === 'string') return detail
  if (typeof detail !== 'object') return String(detail)
  const obj = detail as Record<string, unknown>
  if (obj.message && typeof obj.message === 'string') return obj.message
  const pairs: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === '') continue
    pairs.push(`${k}: ${String(v)}`)
  }
  return pairs.join(' / ')
}

export function ActivityLog({ taskId }: ActivityLogProps) {
  const { t } = useI18n()
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
        {'📝 '}{t('activity.title')}
      </h3>

      {isLoading && (
        <p className="text-[12px] text-text3">{t('common.loading')}</p>
      )}

      {sorted.length === 0 && !isLoading && (
        <p className="text-[12px] text-text3">{t('activity.noHistory')}</p>
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
                {log.user?.name ?? t('activity.unknownUser')}
              </span>
              <span className="text-text font-bold mx-0.5">
                {t(ACTION_LABEL_KEYS[log.action])}
              </span>
              {t('activity.suffix') && (
                <span className="text-text2">{t('activity.suffix')}</span>
              )}
              {(() => {
                const d = formatDetail(log.detail)
                return d ? (
                  <div className="text-text3 mt-0.5 pl-1 border-l-2 border-border2 ml-1">
                    {d}
                  </div>
                ) : null
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
