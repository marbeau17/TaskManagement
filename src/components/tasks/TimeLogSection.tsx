'use client'

import { useState } from 'react'
import {
  useTimeLogs,
  useTimeLogSummary,
  useAddTimeLog,
  useDeleteTimeLog,
} from '@/hooks/useTimeLogs'
import { Avatar } from '@/components/shared'
import { useI18n } from '@/hooks/useI18n'
import { formatDate, formatHours } from '@/lib/utils'

interface TimeLogSectionProps {
  taskId: string
  currentUserId: string
}

export function TimeLogSection({ taskId, currentUserId }: TimeLogSectionProps) {
  const { t } = useI18n()
  const { data: logs, isLoading } = useTimeLogs(taskId)
  const { data: summary } = useTimeLogSummary(taskId)
  const addTimeLog = useAddTimeLog()
  const deleteTimeLog = useDeleteTimeLog(taskId)

  const [hours, setHours] = useState('')
  const [description, setDescription] = useState('')
  const [loggedDate, setLoggedDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const handleSubmit = () => {
    const h = parseFloat(hours)
    if (!h || h <= 0) return
    addTimeLog.mutate(
      {
        task_id: taskId,
        user_id: currentUserId,
        hours: h,
        description: description.trim(),
        logged_date: loggedDate,
      },
      {
        onSuccess: () => {
          setHours('')
          setDescription('')
          setLoggedDate(new Date().toISOString().slice(0, 10))
        },
      }
    )
  }

  const handleDelete = (id: string) => {
    if (!confirm(t('timeLog.confirmDelete'))) return
    deleteTimeLog.mutate(id)
  }

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      {/* Summary */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-bold text-text">
          {t('timeLog.title')}
        </h3>
        {summary && (
          <span className="text-[12px] font-semibold text-mint">
            {t('timeLog.total')}: {formatHours(summary.totalHours)}
          </span>
        )}
      </div>

      {/* Per-user breakdown */}
      {summary && summary.byUser.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {summary.byUser.map((u) => (
            <span
              key={u.user_id}
              className="text-[10.5px] px-2 py-0.5 rounded-full bg-surf2 text-text2"
            >
              {u.user_name}: {formatHours(u.total_hours)}
            </span>
          ))}
        </div>
      )}

      {/* Log form */}
      <div className="flex flex-col gap-2 mb-4 p-3 bg-surf2 rounded-md">
        <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
          <label className="text-[11px] font-semibold text-text2">
            {t('timeLog.hours')}
          </label>
          <input
            type="number"
            step="0.25"
            min="0.25"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="0.0"
            className="w-full border border-wf-border rounded-md px-2 py-1.5 text-[12px] text-text bg-surface focus:outline-none focus:border-mint"
          />
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
          <label className="text-[11px] font-semibold text-text2">
            {t('timeLog.date')}
          </label>
          <input
            type="date"
            value={loggedDate}
            onChange={(e) => setLoggedDate(e.target.value)}
            className="w-full border border-wf-border rounded-md px-2 py-1.5 text-[12px] text-text bg-surface focus:outline-none focus:border-mint"
          />
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
          <label className="text-[11px] font-semibold text-text2 pt-1.5">
            {t('timeLog.description')}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('timeLog.descriptionPlaceholder')}
            className="w-full border border-wf-border rounded-md px-2 py-1.5 text-[12px] text-text bg-surface focus:outline-none focus:border-mint"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hours || parseFloat(hours) <= 0 || addTimeLog.isPending}
            className="px-4 py-1.5 rounded-md text-[12px] font-bold bg-mint text-white hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {addTimeLog.isPending
              ? t('common.loading')
              : t('timeLog.logHours')}
          </button>
        </div>
      </div>

      {/* Entries list */}
      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
        {isLoading && (
          <p className="text-[12px] text-text3">{t('common.loading')}</p>
        )}
        {logs && logs.length === 0 && (
          <p className="text-[12px] text-text3">{t('timeLog.noEntries')}</p>
        )}
        {logs?.map((log) => {
          const isOwn = log.user_id === currentUserId
          return (
            <div
              key={log.id}
              className="flex items-start gap-2 rounded-md p-2.5 bg-surf2"
            >
              {log.user && (
                <Avatar
                  name_short={log.user.name_short}
                  color={log.user.avatar_color}
                  size="sm"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-semibold text-text">
                    {log.user?.name ?? ''}
                  </span>
                  <span className="text-[11px] font-bold text-mint">
                    {formatHours(Number(log.hours))}
                  </span>
                  <span className="text-[10px] text-text3 ml-auto">
                    {formatDate(log.logged_date)}
                  </span>
                </div>
                {log.description && (
                  <p className="text-[11.5px] text-text2 mt-0.5 truncate">
                    {log.description}
                  </p>
                )}
              </div>
              {isOwn && (
                <button
                  type="button"
                  onClick={() => handleDelete(log.id)}
                  disabled={deleteTimeLog.isPending}
                  className="text-[10px] text-danger hover:text-danger-d shrink-0 mt-0.5"
                  title={t('common.delete')}
                >
                  {t('common.delete')}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
