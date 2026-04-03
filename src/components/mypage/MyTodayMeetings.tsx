'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Video } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useAuth } from '@/hooks/useAuth'
import type { CalendarEvent } from '@/types/calendar'

interface Props {
  isLoading?: boolean
}

export function MyTodayMeetings({ isLoading }: Props) {
  const { t } = useI18n()
  const { user } = useAuth()
  const [meetings, setMeetings] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    fetch(`/api/ms365/events?user_id=${user.id}&start_date=${today}&end_date=${today}&viewer_id=${user.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setMeetings(data.filter(e => !e.is_cancelled && e.show_as !== 'free' && e.response_status !== 'declined'))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })

  if (isLoading || loading) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden" data-testid="mypage-meetings">
        <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
          <h3 className="text-[13px] font-bold text-text">{t('mypage.todayMeetings')}</h3>
        </div>
        <div className="p-[12px] space-y-[8px] animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-[40px] bg-surf2 rounded" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden" data-testid="mypage-meetings">
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2 flex items-center justify-between">
        <div className="flex items-center gap-[6px]">
          <Calendar className="w-[14px] h-[14px] text-blue-500" />
          <h3 className="text-[13px] font-bold text-text">{t('mypage.todayMeetings')}</h3>
        </div>
        {meetings.length > 0 && (
          <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-[6px] py-[1px] rounded-full font-bold">
            {meetings.length}
          </span>
        )}
      </div>

      {meetings.length === 0 ? (
        <div className="px-[12px] py-[16px] text-[12px] text-text3 text-center">
          {t('mypage.noMeetings')}
        </div>
      ) : (
        <div className="max-h-[250px] overflow-y-auto">
          {meetings.map(meeting => {
            const isPrivate = meeting.sensitivity === 'private' || meeting.sensitivity === 'confidential'
            return (
              <div key={meeting.id} className="flex items-start gap-[10px] px-[12px] py-[8px] border-b border-border2 last:border-b-0 hover:bg-surf2 transition-colors">
                {/* Time */}
                <div className="w-[50px] shrink-0 text-right">
                  <span className="text-[12px] font-bold text-text">{formatTime(meeting.start_at)}</span>
                  <span className="text-[9px] text-text3 block">{meeting.duration_minutes}min</span>
                </div>

                {/* Divider */}
                <div className="w-[3px] rounded-full bg-blue-500 self-stretch shrink-0" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-text truncate">
                    {isPrivate ? '🔒 ブロック済み' : meeting.subject || '(無題)'}
                  </p>
                  <div className="flex items-center gap-[8px] mt-[2px]">
                    {meeting.location && (
                      <span className="flex items-center gap-[2px] text-[10px] text-text3">
                        <MapPin className="w-[10px] h-[10px]" /> {meeting.location}
                      </span>
                    )}
                    {meeting.organizer_name && (
                      <span className="text-[10px] text-text3">{meeting.organizer_name}</span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="shrink-0">
                  {meeting.show_as === 'tentative' ? (
                    <span className="text-[9px] text-amber-600 dark:text-amber-400">仮</span>
                  ) : (
                    <Video className="w-[12px] h-[12px] text-blue-500" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
