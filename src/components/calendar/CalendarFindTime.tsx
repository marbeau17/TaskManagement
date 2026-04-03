'use client'

import { useState } from 'react'
import { Clock, Users, Star, Calendar } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useMembers } from '@/hooks/useMembers'
import type { TimeSlot } from '@/types/calendar'

export function CalendarFindTime() {
  const { t } = useI18n()
  const { data: members } = useMembers()
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [duration, setDuration] = useState(30)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [workStart, setWorkStart] = useState(9)
  const [workEnd, setWorkEnd] = useState(18)

  const activeMembers = (members ?? []).filter(m => m.is_active)

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSearch = async () => {
    if (selectedMembers.length === 0) return
    setSearching(true)
    try {
      const res = await fetch('/api/ms365/find-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-work-start': String(workStart),
          'x-work-end': String(workEnd),
        },
        body: JSON.stringify({ member_ids: selectedMembers, duration_minutes: duration, date }),
      })
      if (res.ok) {
        const data = await res.json()
        setSlots(data.slots ?? [])
      }
    } catch {} finally {
      setSearching(false)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })
  }

  return (
    <div className="bg-surface border border-border2 rounded-[12px] shadow overflow-hidden">
      <div className="px-[16px] py-[12px] border-b border-border2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 flex items-center gap-[10px]">
        <Clock className="w-[20px] h-[20px] text-purple-600 dark:text-purple-400" />
        <h3 className="text-[14px] font-bold text-text">{t('calendar.findTime')}</h3>
      </div>

      <div className="p-[16px] space-y-[12px]">
        {/* Date + Duration */}
        <div className="flex gap-[8px]">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-text2 block mb-[4px]">{t('calendar.date')}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full text-[12px] px-[8px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
          </div>
          <div className="w-[120px]">
            <label className="text-[11px] font-semibold text-text2 block mb-[4px]">{t('calendar.duration')}</label>
            <select value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="w-full text-[12px] px-[8px] py-[6px] bg-surface border border-border2 rounded-[6px]">
              <option value={15}>15min</option>
              <option value={30}>30min</option>
              <option value={60}>1h</option>
              <option value={90}>1.5h</option>
              <option value={120}>2h</option>
            </select>
          </div>
        </div>

        {/* Working hours */}
        <div className="flex gap-[8px]">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-text2 block mb-[4px]">{t('calendar.workStart')}</label>
            <select value={workStart} onChange={e => setWorkStart(parseFloat(e.target.value))} className="w-full text-[12px] px-[8px] py-[6px] bg-surface border border-border2 rounded-[6px]">
              {Array.from({length: 24}, (_, i) => 6 + i * 0.5).filter(h => h <= 17).map(h => {
                const hh = String(Math.floor(h)).padStart(2, '0')
                const mm = h % 1 === 0.5 ? '30' : '00'
                return <option key={h} value={h}>{hh}:{mm}</option>
              })}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-text2 block mb-[4px]">{t('calendar.workEnd')}</label>
            <select value={workEnd} onChange={e => setWorkEnd(parseFloat(e.target.value))} className="w-full text-[12px] px-[8px] py-[6px] bg-surface border border-border2 rounded-[6px]">
              {Array.from({length: 24}, (_, i) => 12 + i * 0.5).filter(h => h <= 23).map(h => {
                const hh = String(Math.floor(h)).padStart(2, '0')
                const mm = h % 1 === 0.5 ? '30' : '00'
                return <option key={h} value={h}>{hh}:{mm}</option>
              })}
            </select>
          </div>
        </div>

        {/* Member selection */}
        <div>
          <label className="text-[11px] font-semibold text-text2 block mb-[4px]">
            <Users className="w-[12px] h-[12px] inline mr-[4px]" />
            {t('calendar.selectMembers')} ({selectedMembers.length})
          </label>
          <div className="flex flex-wrap gap-[4px]">
            {activeMembers.map(m => (
              <button
                key={m.id}
                onClick={() => toggleMember(m.id)}
                className={`px-[8px] py-[4px] rounded-[6px] text-[11px] font-medium transition-colors ${
                  selectedMembers.includes(m.id)
                    ? 'bg-mint-dd text-white'
                    : 'bg-surf2 text-text2 border border-border2 hover:border-mint'
                }`}
              >
                {m.name_short || m.name.charAt(0)} {m.name.split(' ').pop()}
              </button>
            ))}
          </div>
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={searching || selectedMembers.length === 0}
          className="w-full py-[8px] text-[12px] font-bold text-white bg-purple-600 rounded-[8px] hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {searching ? '...' : t('calendar.findAvailable')}
        </button>

        {/* Results */}
        {slots.length > 0 && (
          <div className="space-y-[6px]">
            <p className="text-[11px] font-semibold text-text2">{t('calendar.suggestedSlots')}</p>
            {slots.map((slot, i) => (
              <button
                key={i}
                onClick={() => setSelectedSlot(slot)}
                className={`w-full flex items-center gap-[8px] px-[10px] py-[8px] rounded-[8px] border transition-all text-left ${
                  selectedSlot?.start === slot.start
                    ? 'ring-2 ring-mint-dd border-mint-dd bg-mint-dd/5'
                    : slot.score >= 90
                      ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-800 hover:shadow-md'
                      : slot.score >= 50
                        ? 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-800 hover:shadow-md'
                        : 'bg-surf2 border-border2 hover:shadow-md'
                }`}
              >
                {slot.score >= 90 && <Star className="w-[14px] h-[14px] text-emerald-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[12px] font-bold text-text">
                      {formatTime(slot.start)} — {formatTime(slot.end)}
                    </span>
                    <span className="text-[10px] text-text2">
                      {slot.available_members.length}/{selectedMembers.length} {t('calendar.available')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-[2px] mt-[2px]">
                    {slot.available_members.map((id: string) => {
                      const m = activeMembers.find(x => x.id === id)
                      return m ? <span key={id} className="text-[9px] text-emerald-600 dark:text-emerald-400">✓{m.name.split(' ').pop()}</span> : null
                    })}
                    {slot.unavailable_members.map((id: string) => {
                      const m = activeMembers.find(x => x.id === id)
                      return m ? <span key={id} className="text-[9px] text-red-500">✗{m.name.split(' ').pop()}</span> : null
                    })}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-[6px] py-[1px] rounded-full ${
                  slot.score >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : slot.score >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'
                }`}>
                  {slot.score}%
                </span>
              </button>
            ))}
            {selectedSlot && (
              <MeetingCreateForm
                slot={selectedSlot}
                members={activeMembers}
                selectedMembers={selectedMembers}
                formatTime={formatTime}
                t={t}
                onClose={() => setSelectedSlot(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Meeting Creation Form
// ---------------------------------------------------------------------------

function MeetingCreateForm({ slot, members, selectedMembers, formatTime, t, onClose }: {
  slot: TimeSlot
  members: any[]
  selectedMembers: string[]
  formatTime: (iso: string) => string
  t: (key: string) => string
  onClose: () => void
}) {
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [includeTeamsLink, setIncludeTeamsLink] = useState(true)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)

  const attendeeNames = selectedMembers.map(id => {
    const m = members.find((x: any) => x.id === id)
    return m?.name ?? id
  })

  const handleCreate = async () => {
    if (!subject.trim()) return
    setCreating(true)
    // In production: call MS Graph API to create event
    // For now: simulate success
    await new Promise(r => setTimeout(r, 1500))
    setCreating(false)
    setCreated(true)
  }

  if (created) {
    return (
      <div className="mt-[12px] p-[16px] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-[10px] text-center">
        <span className="text-[24px] block mb-[6px]">✅</span>
        <p className="text-[13px] font-bold text-emerald-700 dark:text-emerald-300">{t('calendar.meetingCreated')}</p>
        <p className="text-[11px] text-text2 mt-[4px]">{formatTime(slot.start)} — {formatTime(slot.end)}</p>
        <button onClick={onClose} className="mt-[8px] px-[14px] py-[6px] text-[11px] font-bold text-white bg-mint-dd rounded-[6px]">OK</button>
      </div>
    )
  }

  const inputClass = 'w-full text-[12px] px-[10px] py-[7px] bg-surface border border-border2 rounded-[8px] outline-none focus:border-mint'

  return (
    <div className="mt-[12px] p-[14px] bg-mint-dd/5 border border-mint-dd/20 rounded-[10px] space-y-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-text">📅 {t('calendar.createMeeting')}</p>
        <p className="text-[12px] font-bold text-mint-dd">{formatTime(slot.start)} — {formatTime(slot.end)}</p>
      </div>

      {/* Attendees */}
      <div>
        <label className="text-[10px] font-semibold text-text3 uppercase block mb-[4px]">{t('calendar.attendees')}</label>
        <div className="flex flex-wrap gap-[4px]">
          {attendeeNames.map((name, i) => {
            const isAvail = slot.available_members.includes(selectedMembers[i])
            return (
              <span key={i} className={`text-[10px] px-[6px] py-[2px] rounded-full font-medium ${
                isAvail ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
              }`}>
                {isAvail ? '✓' : '✗'} {name}
              </span>
            )
          })}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="text-[11px] font-semibold text-text2 block mb-[4px]">{t('calendar.meetingSubject')} *</label>
        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="例: 週次ミーティング" className={inputClass} autoFocus />
      </div>

      {/* Content */}
      <div>
        <label className="text-[11px] font-semibold text-text2 block mb-[4px]">{t('calendar.meetingContent')}</label>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="アジェンダや議題を入力..." rows={3} className={`${inputClass} resize-y`} />
      </div>

      {/* Teams Link */}
      <label className="flex items-center gap-[6px] text-[12px] text-text">
        <input type="checkbox" checked={includeTeamsLink} onChange={e => setIncludeTeamsLink(e.target.checked)} className="rounded" />
        <span className="text-[14px]">📹</span> {t('calendar.includeTeamsLink')}
      </label>

      {/* Actions */}
      <div className="flex gap-[6px]">
        <button onClick={handleCreate} disabled={creating || !subject.trim()} className="flex-1 py-[8px] text-[12px] font-bold text-white bg-mint-dd rounded-[8px] hover:bg-mint-d disabled:opacity-50 transition-colors">
          {creating ? '作成中...' : t('calendar.createMeeting')}
        </button>
        <button onClick={onClose} className="px-[14px] py-[8px] text-[12px] text-text2 bg-surface border border-border2 rounded-[8px]">{t('common.cancel')}</button>
      </div>
    </div>
  )
}
