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
        headers: { 'Content-Type': 'application/json' },
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

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

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
              <div
                key={i}
                className={`flex items-center gap-[8px] px-[10px] py-[8px] rounded-[8px] border transition-colors ${
                  slot.score >= 90
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-800'
                    : slot.score >= 50
                      ? 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-800'
                      : 'bg-surf2 border-border2'
                }`}
              >
                {slot.score >= 90 && <Star className="w-[14px] h-[14px] text-emerald-500 shrink-0" />}
                <div className="flex-1">
                  <span className="text-[12px] font-bold text-text">
                    {formatTime(slot.start)} — {formatTime(slot.end)}
                  </span>
                  <span className="text-[10px] text-text2 ml-[8px]">
                    {slot.available_members.length}/{selectedMembers.length} {t('calendar.available')}
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-[6px] py-[1px] rounded-full ${
                  slot.score >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : slot.score >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'
                }`}>
                  {slot.score}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
