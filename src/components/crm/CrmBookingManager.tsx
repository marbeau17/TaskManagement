'use client'

import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { Calendar, Tag, Users, Clock, Loader2 } from 'lucide-react'
import { toast } from '@/stores/toastStore'

// Lazy-loaded admin sub-tabs so the bundle only grows when the tab is opened.
const CategoriesTab = lazy(() => import('./booking/CategoriesTab'))
const ConsultantAssignmentTab = lazy(() => import('./booking/ConsultantAssignmentTab'))
const WorkingHoursTab = lazy(() => import('./booking/WorkingHoursTab'))

type BookingTab = 'categories' | 'consultants' | 'workingHours' | 'slots'

const TABS: Array<{ id: BookingTab; label: string; icon: typeof Tag }> = [
  { id: 'categories', label: 'カテゴリ設定', icon: Tag },
  { id: 'consultants', label: 'コンサルタント割当', icon: Users },
  { id: 'workingHours', label: '勤務時間設定', icon: Clock },
  { id: 'slots', label: '予約一覧', icon: Calendar },
]

interface BookingSlot {
  id: string
  event_name: string
  event_date: string
  start_time: string
  end_time: string
  slot_number: number
  is_available: boolean
  booked_by_name: string | null
  booked_by_email: string | null
  booked_by_company: string | null
  booked_at: string | null
}

export function CrmBookingManager() {
  const [tab, setTab] = useState<BookingTab>('categories')

  return (
    <div>
      {/* Top-level tab nav */}
      <div className="flex items-center gap-[4px] mb-[16px] border-b border-border2 overflow-x-auto">
        {TABS.map(tabDef => {
          const Icon = tabDef.icon
          const active = tab === tabDef.id
          return (
            <button
              key={tabDef.id}
              onClick={() => setTab(tabDef.id)}
              className={`flex items-center gap-[6px] px-[14px] py-[8px] text-[12px] font-semibold transition-colors border-b-2 whitespace-nowrap ${
                active
                  ? 'border-mint text-mint'
                  : 'border-transparent text-text2 hover:text-text'
              }`}
            >
              <Icon className="w-[13px] h-[13px]" />
              {tabDef.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-[40px] text-text3 text-[12px]">
            <Loader2 className="w-[16px] h-[16px] mr-[8px] animate-spin" /> 読み込み中...
          </div>
        }
      >
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'consultants' && <ConsultantAssignmentTab />}
        {tab === 'workingHours' && <WorkingHoursTab />}
        {tab === 'slots' && <BookingSlotList />}
      </Suspense>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BookingSlotList — the original list view, kept intact as Tab 4.
// ---------------------------------------------------------------------------
function BookingSlotList() {
  const [slots, setSlots] = useState<BookingSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [editingSlot, setEditingSlot] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ start_time: '', end_time: '' })

  // New event form
  const [newEventName, setNewEventName] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const [newSlotStart, setNewSlotStart] = useState('')
  const [newSlotEnd, setNewSlotEnd] = useState('')

  // Selected event filter
  const [selectedEvent, setSelectedEvent] = useState<string>('all')

  const fetchSlots = () => {
    fetch('/api/booking')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setSlots(data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSlots() }, [])

  // Get unique events
  const events = useMemo(() => {
    const map = new Map<string, { name: string; date: string; count: number; booked: number }>()
    for (const s of slots) {
      const key = `${s.event_date}|${s.event_name}`
      const existing = map.get(key) ?? { name: s.event_name, date: s.event_date, count: 0, booked: 0 }
      existing.count++
      if (s.booked_by_name) existing.booked++
      map.set(key, existing)
    }
    return [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => a.date.localeCompare(b.date))
  }, [slots])

  // Filtered slots
  const filteredSlots = useMemo(() => {
    if (selectedEvent === 'all') return slots
    return slots.filter(s => `${s.event_date}|${s.event_name}` === selectedEvent)
  }, [slots, selectedEvent])

  const cancelBooking = async (slotId: string, name: string) => {
    if (!confirm(`「${name}」の予約をキャンセルしますか？`)) return
    const res = await fetch('/api/booking', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', slot_id: slotId }),
    })
    if (res.ok) { toast.success('予約をキャンセルしました'); fetchSlots() }
    else toast.error('キャンセルに失敗しました')
  }

  const toggleAvailability = async (slotId: string) => {
    await fetch('/api/booking', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', slot_id: slotId }),
    })
    fetchSlots()
  }

  const deleteSlot = async (slotId: string) => {
    if (!confirm('このスロットを完全に削除しますか？')) return
    const res = await fetch('/api/booking', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', slot_id: slotId }),
    })
    if (res.ok) { toast.success('スロットを削除しました'); fetchSlots() }
    else toast.error('削除に失敗しました')
  }

  const updateSlotTime = async (slotId: string) => {
    if (!editDraft.start_time || !editDraft.end_time) return
    const res = await fetch('/api/booking', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', slot_id: slotId, start_time: editDraft.start_time, end_time: editDraft.end_time }),
    })
    if (res.ok) { toast.success('更新しました'); setEditingSlot(null); fetchSlots() }
    else toast.error('更新に失敗しました')
  }

  const addSlot = async () => {
    if (!newSlotStart || !newSlotEnd) return
    // Find event to add to
    const eventKey = selectedEvent !== 'all' ? selectedEvent : events[0]?.key
    if (!eventKey) { toast.error('イベントを選択してください'); return }
    const [date, name] = eventKey.split('|')
    const maxNum = filteredSlots.reduce((max, s) => Math.max(max, s.slot_number), 0)

    const res = await fetch('/api/booking', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'seed',
        slots: [{ event_name: name, event_date: date, slot_number: maxNum + 1, start_time: newSlotStart, end_time: newSlotEnd, is_available: true }],
      }),
    })
    if (res.ok) {
      toast.success('スロットを追加しました')
      setNewSlotStart('')
      setNewSlotEnd('')
      setShowAddSlot(false)
      fetchSlots()
    } else toast.error('追加に失敗しました')
  }

  const createEvent = async () => {
    if (!newEventName || !newEventDate) return
    // Generate default 30-min slots from 9:00 to 17:30
    const defaultSlots: Array<{ event_name: string; event_date: string; slot_number: number; start_time: string; end_time: string; is_available: boolean }> = []
    let num = 1
    for (let h = 9; h < 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 17 && m >= 30) break
        const sh = String(h).padStart(2, '0')
        const sm = String(m).padStart(2, '0')
        const eh = m === 30 ? String(h + 1).padStart(2, '0') : sh
        const em = m === 30 ? '00' : '30'
        defaultSlots.push({
          event_name: newEventName,
          event_date: newEventDate,
          slot_number: num++,
          start_time: `${sh}:${sm}`,
          end_time: `${eh}:${em}`,
          is_available: true,
        })
      }
    }

    const res = await fetch('/api/booking', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'seed', slots: defaultSlots }),
    })
    if (res.ok) {
      toast.success(`「${newEventName}」を作成しました（${defaultSlots.length}枠）`)
      setNewEventName('')
      setNewEventDate('')
      setShowAddEvent(false)
      fetchSlots()
      setSelectedEvent(`${newEventDate}|${newEventName}`)
    } else toast.error('作成に失敗しました')
  }

  const deleteEvent = async (eventKey: string) => {
    const [date, name] = eventKey.split('|')
    if (!confirm(`「${name}（${date}）」のすべてのスロットを削除しますか？`)) return
    const eventSlots = slots.filter(s => s.event_date === date && s.event_name === name)
    for (const s of eventSlots) {
      await fetch('/api/booking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', slot_id: s.id }),
      })
    }
    toast.success('イベントを削除しました')
    setSelectedEvent('all')
    fetchSlots()
  }

  if (loading) return <div className="p-6 text-center text-text3 text-xs">読み込み中...</div>

  const bookedCount = filteredSlots.filter(s => !s.is_available && s.booked_by_name).length
  const availableCount = filteredSlots.filter(s => s.is_available).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h3 className="text-[14px] font-bold text-text">📅 予約一覧</h3>
          <span className="text-[11px] text-text2">
            予約 <span className="font-bold text-mint">{bookedCount}</span> / 空き <span className="font-bold text-text">{availableCount}</span> / 全 {filteredSlots.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddEvent(!showAddEvent)}
            className="text-[11px] px-3 py-1.5 rounded-md bg-mint text-white font-semibold hover:bg-mint-d transition-colors">
            + 新規イベント
          </button>
          {selectedEvent !== 'all' && (
            <button onClick={() => setShowAddSlot(!showAddSlot)}
              className="text-[11px] px-3 py-1.5 rounded-md border border-wf-border text-text2 hover:bg-surf2 transition-colors">
              + スロット追加
            </button>
          )}
        </div>
      </div>

      {/* Event filter tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => setSelectedEvent('all')}
          className={`text-[11px] px-3 py-1.5 rounded-md transition-colors ${selectedEvent === 'all' ? 'bg-mint text-white font-bold' : 'bg-surf2 text-text2 hover:text-mint'}`}>
          すべて ({slots.length})
        </button>
        {events.map(evt => (
          <div key={evt.key} className="flex items-center gap-1">
            <button onClick={() => setSelectedEvent(evt.key)}
              className={`text-[11px] px-3 py-1.5 rounded-md transition-colors ${selectedEvent === evt.key ? 'bg-mint text-white font-bold' : 'bg-surf2 text-text2 hover:text-mint'}`}>
              {evt.name} ({evt.date.slice(5)}) — {evt.booked}/{evt.count}
            </button>
            <button onClick={() => deleteEvent(evt.key)}
              className="text-[9px] text-text3 hover:text-danger" title="イベント削除">✕</button>
          </div>
        ))}
      </div>

      {/* New event form */}
      {showAddEvent && (
        <div className="mb-4 p-4 bg-mint/5 border border-mint/20 rounded-lg">
          <h4 className="text-[12px] font-bold text-text mb-3">新規イベント作成</h4>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-[10px] text-text2 block mb-1">イベント名</label>
              <input type="text" value={newEventName} onChange={e => setNewEventName(e.target.value)}
                placeholder="例：経営相談会" className="text-[12px] px-2 py-1.5 rounded border border-wf-border bg-surface text-text w-[180px] focus:outline-none focus:border-mint" />
            </div>
            <div>
              <label className="text-[10px] text-text2 block mb-1">開催日</label>
              <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)}
                className="text-[12px] px-2 py-1.5 rounded border border-wf-border bg-surface text-text focus:outline-none focus:border-mint" />
            </div>
            <button onClick={createEvent} disabled={!newEventName || !newEventDate}
              className="text-[11px] px-4 py-1.5 rounded bg-mint text-white font-semibold hover:bg-mint-d disabled:opacity-50">
              作成（9:00-17:30 / 30分枠）
            </button>
            <button onClick={() => setShowAddEvent(false)} className="text-[11px] px-3 py-1.5 rounded border border-wf-border text-text2">
              キャンセル
            </button>
          </div>
          <p className="text-[10px] text-text3 mt-2">作成後、不要な時間帯は個別に削除・非公開にできます</p>
        </div>
      )}

      {/* Add slot form */}
      {showAddSlot && selectedEvent !== 'all' && (
        <div className="mb-4 p-4 bg-surf2/50 border border-border2 rounded-lg">
          <h4 className="text-[12px] font-bold text-text mb-3">スロット追加</h4>
          <div className="flex items-end gap-3">
            <div>
              <label className="text-[10px] text-text2 block mb-1">開始</label>
              <input type="time" value={newSlotStart} onChange={e => setNewSlotStart(e.target.value)}
                className="text-[12px] px-2 py-1.5 rounded border border-wf-border bg-surface text-text focus:outline-none focus:border-mint" />
            </div>
            <div>
              <label className="text-[10px] text-text2 block mb-1">終了</label>
              <input type="time" value={newSlotEnd} onChange={e => setNewSlotEnd(e.target.value)}
                className="text-[12px] px-2 py-1.5 rounded border border-wf-border bg-surface text-text focus:outline-none focus:border-mint" />
            </div>
            <button onClick={addSlot} disabled={!newSlotStart || !newSlotEnd}
              className="text-[11px] px-4 py-1.5 rounded bg-mint text-white font-semibold hover:bg-mint-d disabled:opacity-50">
              追加
            </button>
            <button onClick={() => setShowAddSlot(false)} className="text-[11px] px-3 py-1.5 rounded border border-wf-border text-text2">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Slot table */}
      <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden shadow">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-surf2 border-b border-border2">
              <th className="px-3 py-2 text-left text-text2 font-semibold w-[40px]">#</th>
              {selectedEvent === 'all' && <th className="px-3 py-2 text-left text-text2 font-semibold">イベント</th>}
              <th className="px-3 py-2 text-left text-text2 font-semibold">時間</th>
              <th className="px-3 py-2 text-left text-text2 font-semibold">ステータス</th>
              <th className="px-3 py-2 text-left text-text2 font-semibold">予約者</th>
              <th className="px-3 py-2 text-left text-text2 font-semibold">会社名</th>
              <th className="px-3 py-2 text-left text-text2 font-semibold">メール</th>
              <th className="px-3 py-2 text-center text-text2 font-semibold w-[160px]">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredSlots.map(slot => (
              <tr key={slot.id} className="border-b border-border2 hover:bg-surf2/30">
                <td className="px-3 py-2 font-bold text-text">{slot.slot_number}</td>
                {selectedEvent === 'all' && (
                  <td className="px-3 py-2 text-text2 text-[11px]">{slot.event_name}<br /><span className="text-[10px] text-text3">{slot.event_date}</span></td>
                )}
                <td className="px-3 py-2 text-text font-medium">
                  {editingSlot === slot.id ? (
                    <div className="flex items-center gap-1">
                      <input type="time" value={editDraft.start_time} onChange={e => setEditDraft(d => ({ ...d, start_time: e.target.value }))}
                        className="text-[11px] px-1 py-0.5 rounded border border-mint bg-surface w-[70px]" />
                      <span>〜</span>
                      <input type="time" value={editDraft.end_time} onChange={e => setEditDraft(d => ({ ...d, end_time: e.target.value }))}
                        className="text-[11px] px-1 py-0.5 rounded border border-mint bg-surface w-[70px]" />
                      <button onClick={() => updateSlotTime(slot.id)} className="text-[10px] text-mint hover:text-mint-d font-bold">✓</button>
                      <button onClick={() => setEditingSlot(null)} className="text-[10px] text-text3">✕</button>
                    </div>
                  ) : (
                    <span className="cursor-pointer hover:text-mint" onDoubleClick={() => { setEditingSlot(slot.id); setEditDraft({ start_time: slot.start_time, end_time: slot.end_time }) }}>
                      {slot.start_time} 〜 {slot.end_time}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {slot.booked_by_name ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">予約済み</span>
                  ) : slot.is_available ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">空き</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">非公開</span>
                  )}
                </td>
                <td className="px-3 py-2 text-text">{slot.booked_by_name || '-'}</td>
                <td className="px-3 py-2 text-text2">{slot.booked_by_company || '-'}</td>
                <td className="px-3 py-2 text-text2 text-[11px]">{slot.booked_by_email || '-'}</td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {slot.booked_by_name && (
                      <button onClick={() => cancelBooking(slot.id, slot.booked_by_name!)}
                        className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors">
                        キャンセル
                      </button>
                    )}
                    <button onClick={() => toggleAvailability(slot.id)}
                      className="text-[10px] px-2 py-1 rounded bg-surf2 text-text2 hover:bg-mint hover:text-white transition-colors">
                      {slot.is_available ? '非公開' : '公開'}
                    </button>
                    <button onClick={() => deleteSlot(slot.id)}
                      className="text-[10px] px-1.5 py-1 rounded text-text3 hover:bg-red-600 hover:text-white transition-colors">
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredSlots.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-text3 text-[12px]">スロットがありません</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Embed info */}
      {selectedEvent !== 'all' && (
        <div className="mt-4 p-3 bg-surf2/50 border border-border2 rounded-lg">
          <p className="text-[10px] text-text3 mb-1">フォーム埋め込み用パラメータ:</p>
          <code className="text-[11px] text-mint font-mono bg-surface px-2 py-1 rounded border border-border2 select-all">
            /form/hearing?event_date={selectedEvent.split('|')[0]}
          </code>
        </div>
      )}
    </div>
  )
}
