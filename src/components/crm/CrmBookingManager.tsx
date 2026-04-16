'use client'

import { useState, useEffect } from 'react'
import { toast } from '@/stores/toastStore'

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
  const [slots, setSlots] = useState<BookingSlot[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSlots = () => {
    fetch('/api/booking')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setSlots(data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSlots() }, [])

  const cancelBooking = async (slotId: string, name: string) => {
    if (!confirm(`「${name}」の予約をキャンセルしますか？`)) return
    const res = await fetch('/api/booking', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', slot_id: slotId }),
    })
    if (res.ok) {
      toast.success('予約をキャンセルしました')
      fetchSlots()
    } else {
      toast.error('キャンセルに失敗しました')
    }
  }

  const toggleAvailability = async (slotId: string) => {
    const res = await fetch('/api/booking', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', slot_id: slotId }),
    })
    if (res.ok) fetchSlots()
  }

  if (loading) return <div className="p-6 text-center text-text3 text-xs">読み込み中...</div>

  const bookedCount = slots.filter(s => !s.is_available && s.booked_by_name).length
  const availableCount = slots.filter(s => s.is_available).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-[14px] font-bold text-text">📅 予約管理</h3>
          <span className="text-[11px] text-text2">
            予約済み <span className="font-bold text-mint">{bookedCount}</span> / 空き <span className="font-bold text-text">{availableCount}</span> / 全 {slots.length}
          </span>
        </div>
      </div>

      <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden shadow">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-surf2 border-b border-border2">
              <th className="px-3 py-2 text-left text-text2 font-semibold w-[40px]">#</th>
              <th className="px-3 py-2 text-left text-text2 font-semibold">時間</th>
              <th className="px-3 py-2 text-left text-text2 font-semibold">ステータス</th>
              <th className="px-3 py-2 text-left text-text2 font-semibold">予約者</th>
              <th className="px-3 py-2 text-left text-text2 font-semibold">会社名</th>
              <th className="px-3 py-2 text-left text-text2 font-semibold">メール</th>
              <th className="px-3 py-2 text-center text-text2 font-semibold w-[120px]">操作</th>
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => (
              <tr key={slot.id} className="border-b border-border2 hover:bg-surf2/30">
                <td className="px-3 py-2 font-bold text-text">{slot.slot_number}</td>
                <td className="px-3 py-2 text-text font-medium">{slot.start_time} 〜 {slot.end_time}</td>
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
                  <div className="flex items-center justify-center gap-2">
                    {slot.booked_by_name && (
                      <button
                        onClick={() => cancelBooking(slot.id, slot.booked_by_name!)}
                        className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                      >
                        キャンセル
                      </button>
                    )}
                    <button
                      onClick={() => toggleAvailability(slot.id)}
                      className="text-[10px] px-2 py-1 rounded bg-surf2 text-text2 hover:bg-mint hover:text-white transition-colors"
                    >
                      {slot.is_available ? '非公開' : '公開'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
