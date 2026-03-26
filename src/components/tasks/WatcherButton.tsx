'use client'

import { useState } from 'react'
import { useWatchers, useIsWatching, useAddWatcher, useRemoveWatcher } from '@/hooks/useWatchers'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'

interface WatcherButtonProps {
  taskId: string
}

export function WatcherButton({ taskId }: WatcherButtonProps) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { data: watchers = [] } = useWatchers(taskId)
  const { data: watching } = useIsWatching(taskId, user?.id)
  const addWatcher = useAddWatcher()
  const removeWatcher = useRemoveWatcher()
  const [showTooltip, setShowTooltip] = useState(false)

  const isPending = addWatcher.isPending || removeWatcher.isPending

  const handleToggle = () => {
    if (!user || isPending) return
    if (watching) {
      removeWatcher.mutate({ taskId, userId: user.id })
    } else {
      addWatcher.mutate({ taskId, userId: user.id })
    }
  }

  const watcherNames = watchers
    .map((w) => w.user?.name ?? w.user_id)
    .join(', ')

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={handleToggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={isPending || !user}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-bold
          border transition-colors disabled:opacity-50
          ${
            watching
              ? 'bg-mint-ll text-mint border-mint hover:bg-mint hover:text-white'
              : 'bg-surface text-text2 border-wf-border hover:text-mint hover:border-mint'
          }
        `}
        title={watching ? t('watcher.unwatch') : t('watcher.watch')}
      >
        {/* Eye icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={watching ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>{watchers.length}</span>
      </button>

      {/* Tooltip with watcher names */}
      {showTooltip && watchers.length > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-md bg-gray-900 text-white text-[11px] whitespace-nowrap z-50 shadow-lg">
          <div className="font-bold mb-0.5">{t('watcher.title')}</div>
          <div>{watcherNames}</div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  )
}
