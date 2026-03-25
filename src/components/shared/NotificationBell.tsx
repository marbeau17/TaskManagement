'use client'

import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import type { ActivityAction } from '@/types/database'

// ---------------------------------------------------------------------------
// Action icons & labels
// ---------------------------------------------------------------------------

const ACTION_ICON: Record<ActivityAction, string> = {
  created: '\uD83D\uDCDD',
  assigned: '\uD83D\uDC64',
  progress_updated: '\uD83D\uDCC8',
  status_changed: '\uD83D\uDD04',
  hours_updated: '\u23F1',
  comment_added: '\uD83D\uDCAC',
  deadline_changed: '\uD83D\uDCC5',
  rejected: '\u274C',
}

const ACTION_LABEL: Record<ActivityAction, string> = {
  created: 'タスクを作成',
  assigned: 'アサインを設定',
  progress_updated: '進捗を更新',
  status_changed: 'ステータスを変更',
  hours_updated: '工数を更新',
  comment_added: 'コメントを追加',
  deadline_changed: '納期を変更',
  rejected: '差し戻し',
}

// ---------------------------------------------------------------------------
// Time-ago formatter
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}日前`
  return `${Math.floor(days / 30)}ヶ月前`
}

// ---------------------------------------------------------------------------
// NotificationBell component
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount } = useNotifications()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        className="relative w-[32px] h-[32px] flex items-center justify-center rounded-[8px] hover:bg-surf2 transition-colors text-text2"
        aria-label="通知"
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-[4px] right-[4px] w-[6px] h-[6px] bg-[#C05050] dark:bg-[#E07070] rounded-full" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[38px] w-[320px] bg-surface border border-wf-border rounded-[10px] shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border2">
            <h3 className="text-[13px] font-bold text-text">通知</h3>
          </div>

          {/* Notification list */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[12px] text-text3">通知はありません</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-surf2 transition-colors border-b border-border2 last:border-b-0"
                >
                  {/* Icon */}
                  <span className="text-[14px] mt-0.5 shrink-0">
                    {ACTION_ICON[item.action]}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-text leading-relaxed">
                      <span className="font-semibold">
                        {item.user?.name ?? '不明'}
                      </span>
                      <span className="text-text2">
                        {'が'}
                        {ACTION_LABEL[item.action]}
                        {'しました'}
                      </span>
                    </p>
                    <p className="text-[10px] text-text3 mt-0.5">
                      {timeAgo(item.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
