'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout'
import { NotificationBell } from '@/components/shared'
import { useI18n } from '@/hooks/useI18n'
import { useAuth } from '@/hooks/useAuth'
import { CalendarConnect } from '@/components/calendar/CalendarConnect'
import { CalendarFindTime } from '@/components/calendar/CalendarFindTime'
import { Calendar, Plus, Video, MapPin, Clock } from 'lucide-react'
import { toast } from '@/stores/toastStore'
import type { CalendarEvent } from '@/types/calendar'

export default function CalendarPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickForm, setQuickForm] = useState({ subject: '', date: new Date().toISOString().slice(0, 10), startTime: '10:00', duration: 30, location: '', includeTeams: true })

  useEffect(() => {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    fetch(`/api/ms365/events?user_id=${user.id}&start_date=${today}&end_date=${today}&viewer_id=${user.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setEvents(data.filter((e: any) => !e.is_cancelled)) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })

  const handleQuickCreate = async () => {
    if (!quickForm.subject.trim() || !user) return
    // Create event in calendar_events table
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      // Use API instead
      const startAt = `${quickForm.date}T${quickForm.startTime}:00+09:00`
      const endMinutes = parseInt(quickForm.startTime.split(':')[0]) * 60 + parseInt(quickForm.startTime.split(':')[1]) + quickForm.duration
      const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0')
      const endM = String(endMinutes % 60).padStart(2, '0')
      const endAt = `${quickForm.date}T${endH}:${endM}:00+09:00`

      const res = await fetch('/api/ms365/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          subject: quickForm.subject,
          start_at: startAt,
          end_at: endAt,
          duration_minutes: quickForm.duration,
          location: quickForm.location,
          sensitivity: 'normal',
          show_as: 'busy',
          organizer_name: user.name,
        }),
      })
      if (res.ok) {
        toast.success(t('calendar.meetingCreated'))
        setShowQuickCreate(false)
        setQuickForm({ subject: '', date: new Date().toISOString().slice(0, 10), startTime: '10:00', duration: 30, location: '', includeTeams: true })
        // Refresh events
        const today = new Date().toISOString().slice(0, 10)
        const r = await fetch(`/api/ms365/events?user_id=${user.id}&start_date=${today}&end_date=${today}&viewer_id=${user.id}`)
        if (r.ok) { const data = await r.json(); if (Array.isArray(data)) setEvents(data.filter((e: any) => !e.is_cancelled)) }
      }
    } catch {
      toast.error('Failed to create meeting')
    }
  }

  const inputClass = 'w-full text-[12px] px-[10px] py-[7px] bg-surface border border-border2 rounded-[8px] outline-none focus:border-mint'

  return (
    <>
      <Topbar title={t('calendar.pageTitle')}>
        <button onClick={() => setShowQuickCreate(!showQuickCreate)} className="flex items-center gap-[4px] px-[12px] py-[6px] text-[12px] font-bold bg-mint-dd text-white rounded-[6px] hover:bg-mint-d">
          <Plus className="w-[14px] h-[14px]" /> {t('calendar.createMeeting')}
        </button>
        <NotificationBell />
      </Topbar>

      <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
        {/* Quick Create Meeting */}
        {showQuickCreate && (
          <div className="bg-surface border border-border2 rounded-[12px] shadow p-[16px] space-y-[10px]">
            <h3 className="text-[14px] font-bold text-text flex items-center gap-[6px]">
              <Calendar className="w-[16px] h-[16px] text-blue-500" /> {t('calendar.createMeeting')}
            </h3>
            <input type="text" value={quickForm.subject} onChange={e => setQuickForm(f => ({...f, subject: e.target.value}))} placeholder={t('calendar.meetingSubject') + ' *'} className={inputClass} autoFocus />
            <div className="flex gap-[8px]">
              <input type="date" value={quickForm.date} onChange={e => setQuickForm(f => ({...f, date: e.target.value}))} className={`flex-1 ${inputClass}`} />
              <select value={quickForm.startTime} onChange={e => setQuickForm(f => ({...f, startTime: e.target.value}))} className={`w-[100px] ${inputClass}`}>
                {Array.from({length: 19}, (_, i) => i + 8).map(h => [0, 30].map(m => {
                  const t = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
                  return <option key={t} value={t}>{t}</option>
                })).flat()}
              </select>
              <select value={quickForm.duration} onChange={e => setQuickForm(f => ({...f, duration: parseInt(e.target.value)}))} className={`w-[90px] ${inputClass}`}>
                <option value={15}>15min</option>
                <option value={30}>30min</option>
                <option value={60}>1h</option>
                <option value={90}>1.5h</option>
                <option value={120}>2h</option>
              </select>
            </div>
            <div className="flex gap-[8px]">
              <input type="text" value={quickForm.location} onChange={e => setQuickForm(f => ({...f, location: e.target.value}))} placeholder="場所 / Teams会議" className={`flex-1 ${inputClass}`} />
              <label className="flex items-center gap-[4px] text-[12px] text-text shrink-0">
                <input type="checkbox" checked={quickForm.includeTeams} onChange={e => setQuickForm(f => ({...f, includeTeams: e.target.checked}))} className="rounded" />
                <Video className="w-[12px] h-[12px] text-blue-500" /> Teams
              </label>
            </div>
            <div className="flex gap-[6px] justify-end">
              <button onClick={() => setShowQuickCreate(false)} className="px-[12px] py-[6px] text-[12px] text-text2 bg-surf2 rounded-[6px]">{t('common.cancel')}</button>
              <button onClick={handleQuickCreate} disabled={!quickForm.subject.trim()} className="px-[14px] py-[6px] text-[12px] font-bold text-white bg-mint-dd rounded-[6px] disabled:opacity-50">{t('calendar.createMeeting')}</button>
            </div>
          </div>
        )}

        {/* Today's Meetings */}
        <div className="bg-surface border border-border2 rounded-[12px] shadow overflow-hidden">
          <div className="px-[14px] py-[10px] border-b border-border2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 flex items-center justify-between">
            <div className="flex items-center gap-[6px]">
              <Calendar className="w-[16px] h-[16px] text-blue-500" />
              <h3 className="text-[13px] font-bold text-text">{t('mypage.todayMeetings')}</h3>
              {events.length > 0 && <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-[6px] py-[1px] rounded-full font-bold">{events.length}</span>}
            </div>
          </div>
          {loading ? (
            <div className="p-[16px] animate-pulse space-y-[8px]">{[1,2,3].map(i => <div key={i} className="h-[48px] bg-surf2 rounded-[8px]" />)}</div>
          ) : events.length === 0 ? (
            <div className="p-[24px] text-center text-[12px] text-text3">{t('mypage.noMeetings')}</div>
          ) : (
            <div className="divide-y divide-border2">
              {events.map(evt => (
                <div key={evt.id} className="flex items-center gap-[12px] px-[14px] py-[10px] hover:bg-surf2/50 transition-colors">
                  <div className="w-[60px] text-right shrink-0">
                    <span className="text-[13px] font-bold text-text">{formatTime(evt.start_at)}</span>
                    <span className="text-[9px] text-text3 block">{evt.duration_minutes}min</span>
                  </div>
                  <div className="w-[3px] rounded-full bg-blue-500 self-stretch shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-text truncate">
                      {evt.sensitivity === 'private' || evt.sensitivity === 'confidential' ? '🔒 ブロック済み' : evt.subject || '(無題)'}
                    </p>
                    <div className="flex items-center gap-[8px] mt-[2px]">
                      {evt.location && <span className="flex items-center gap-[2px] text-[10px] text-text3"><MapPin className="w-[10px] h-[10px]" /> {evt.location}</span>}
                      {evt.organizer_name && <span className="text-[10px] text-text3">{evt.organizer_name}</span>}
                      {evt.show_as === 'tentative' && <span className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-[4px] py-[1px] rounded">仮</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <CalendarConnect />
        <CalendarFindTime />
      </div>
    </>
  )
}
