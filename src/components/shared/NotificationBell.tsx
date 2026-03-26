'use client'

import { useState, useRef, useEffect } from 'react'
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications'
import { useI18n } from '@/hooks/useI18n'
import type { NotificationType } from '@/types/database'

// ---------------------------------------------------------------------------
// Notification type icons
// ---------------------------------------------------------------------------

const TYPE_ICON: Record<NotificationType, string> = {
  task_assigned: '\uD83D\uDC64',
  task_status_changed: '\uD83D\uDD04',
  comment_added: '\uD83D\uDCAC',
  deadline_changed: '\uD83D\uDCC5',
  mention: '\uD83D\uDCE2',
  info: '\uD83D\uDCDD',
}

// ---------------------------------------------------------------------------
// Time-ago formatter with i18n
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string, t: (key: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return t('notifications.justNow')
  if (minutes < 60)
    return t('notifications.minutesAgo').replace('{n}', String(minutes))
  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return t('notifications.hoursAgo').replace('{n}', String(hours))
  const days = Math.floor(hours / 24)
  if (days < 30)
    return t('notifications.daysAgo').replace('{n}', String(days))
  return t('notifications.monthsAgo').replace(
    '{n}',
    String(Math.floor(days / 30))
  )
}

// ---------------------------------------------------------------------------
// NotificationBell component
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useI18n()
  const { notifications } = useNotifications()
  const { unreadCount } = useUnreadCount()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()

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

  const handleNotificationClick = (notificationId: string, link: string | null) => {
    markAsRead.mutate(notificationId)
    if (link) {
      window.location.href = link
    }
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate()
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        className="relative w-[32px] h-[32px] flex items-center justify-center rounded-[8px] hover:bg-surf2 transition-colors text-text2"
        aria-label={t('notifications.title')}
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
          <span className="absolute top-[2px] right-[2px] min-w-[16px] h-[16px] flex items-center justify-center bg-[#C05050] dark:bg-[#E07070] text-white text-[10px] font-bold rounded-full px-[4px] leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[38px] w-[360px] bg-surface border border-wf-border rounded-[10px] shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border2 flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-text">
              {t('notifications.title')}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
                className="text-[11px] text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-[24px] mb-2 opacity-40">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto text-text3"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <p className="text-[12px] text-text3">
                  {t('notifications.empty')}
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    handleNotificationClick(item.id, item.link)
                  }
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-surf2 transition-colors border-b border-border2 last:border-b-0 text-left ${
                    !item.is_read ? 'bg-accent/5' : ''
                  }`}
                >
                  {/* Unread dot */}
                  <div className="flex items-center mt-1.5 shrink-0 w-[8px]">
                    {!item.is_read && (
                      <span className="w-[6px] h-[6px] bg-[#C05050] dark:bg-[#E07070] rounded-full" />
                    )}
                  </div>

                  {/* Icon */}
                  <span className="text-[14px] mt-0.5 shrink-0">
                    {TYPE_ICON[item.type as NotificationType] ?? TYPE_ICON.info}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-text leading-relaxed truncate">
                      {item.title}
                    </p>
                    {item.message && (
                      <p className="text-[11px] text-text2 mt-0.5 truncate">
                        {item.message}
                      </p>
                    )}
                    <p className="text-[10px] text-text3 mt-1">
                      {timeAgo(item.created_at, t)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
