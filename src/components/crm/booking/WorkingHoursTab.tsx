'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from '@/stores/toastStore'
import { useI18n } from '@/hooks/useI18n'

interface Member {
  id: string
  name: string
  name_short?: string | null
  avatar_color?: string | null
  avatar_url?: string | null
  email?: string | null
  role?: string | null
}

interface WorkingHour {
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

const DAYS_JA = ['日', '月', '火', '水', '木', '金', '土']
const DAY_COLORS = ['text-red-500', 'text-text', 'text-text', 'text-text', 'text-text', 'text-text', 'text-blue-500']

const DEFAULT_HOURS: WorkingHour[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  start_time: '10:00',
  end_time: '17:00',
  is_active: i >= 1 && i <= 5, // Mon-Fri by default
}))

function timeToHHMM(v: string): string {
  // Accept "HH:MM" or "HH:MM:SS" — always trim to 5 chars.
  if (!v) return '10:00'
  return v.length >= 5 ? v.slice(0, 5) : v
}

export function WorkingHoursTab() {
  const { t } = useI18n()
  const [members, setMembers] = useState<Member[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [hours, setHours] = useState<WorkingHour[]>(DEFAULT_HOURS)
  const [original, setOriginal] = useState<WorkingHour[]>(DEFAULT_HOURS)
  const [loading, setLoading] = useState(true)
  const [loadingHours, setLoadingHours] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ms365Connected, setMs365Connected] = useState<boolean | null>(null)

  // Load members once
  useEffect(() => {
    fetch('/api/members')
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (Array.isArray(data)) {
          setMembers(data)
          if (data.length > 0 && !selectedUserId) setSelectedUserId(data[0].id)
        }
      })
      .catch(() => toast.error('メンバーの取得に失敗しました'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load working hours for selected user
  useEffect(() => {
    if (!selectedUserId) return
    setLoadingHours(true)
    setMs365Connected(null)

    // Fetch working hours
    fetch(`/api/booking/working-hours?user_id=${selectedUserId}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Merge with defaults — fill missing weekdays
          const map = new Map<number, WorkingHour>()
          for (const row of data as WorkingHour[]) {
            map.set(row.day_of_week, {
              day_of_week: row.day_of_week,
              start_time: timeToHHMM(row.start_time),
              end_time: timeToHHMM(row.end_time),
              is_active: row.is_active,
            })
          }
          const merged = DEFAULT_HOURS.map(def => map.get(def.day_of_week) ?? { ...def, is_active: false })
          setHours(merged)
          setOriginal(merged.map(h => ({ ...h })))
        } else {
          setHours(DEFAULT_HOURS.map(h => ({ ...h })))
          setOriginal(DEFAULT_HOURS.map(h => ({ ...h })))
        }
      })
      .catch(() => toast.error('勤務時間の取得に失敗しました'))
      .finally(() => setLoadingHours(false))

    // Check MS365 status via consultants endpoints — we search through any category
    // that includes this user and read ms365_connected. If no category matches, null.
    fetch('/api/booking/categories')
      .then(r => (r.ok ? r.json() : []))
      .then(async (cats: Array<{ id: string }>) => {
        if (!Array.isArray(cats)) return
        for (const c of cats) {
          try {
            const list = await fetch(`/api/booking/categories/${c.id}/consultants`).then(r =>
              r.ok ? r.json() : []
            )
            if (Array.isArray(list)) {
              const found = list.find((x: { user_id: string; ms365_connected: boolean }) => x.user_id === selectedUserId)
              if (found) {
                setMs365Connected(Boolean(found.ms365_connected))
                return
              }
            }
          } catch {
            /* ignore */
          }
        }
        // Not assigned to any category — cannot determine connection from consultants
        // endpoint; leave as null and UI will show "未検出"
      })
      .catch(() => {
        /* ignore */
      })
  }, [selectedUserId])

  const updateHour = (dow: number, patch: Partial<WorkingHour>) => {
    setHours(hs => hs.map(h => (h.day_of_week === dow ? { ...h, ...patch } : h)))
  }

  const dirty = (() => {
    if (hours.length !== original.length) return true
    for (let i = 0; i < hours.length; i++) {
      const a = hours[i]
      const b = original[i]
      if (
        a.day_of_week !== b.day_of_week ||
        a.is_active !== b.is_active ||
        a.start_time !== b.start_time ||
        a.end_time !== b.end_time
      )
        return true
    }
    return false
  })()

  const save = async () => {
    if (!selectedUserId) return
    // Validation: start < end for active rows
    for (const h of hours) {
      if (h.is_active && h.start_time >= h.end_time) {
        toast.error(`${DAYS_JA[h.day_of_week]}曜日: 開始時刻は終了時刻より前にしてください`)
        return
      }
    }
    setSaving(true)
    try {
      const res = await fetch('/api/booking/working-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          hours: hours.map(h => ({
            day_of_week: h.day_of_week,
            start_time: h.start_time,
            end_time: h.end_time,
            is_active: h.is_active,
          })),
        }),
      })
      if (!res.ok) throw new Error('save failed')
      toast.success(t('booking.admin.workingHours.saved') || '勤務時間を保存しました')
      setOriginal(hours.map(h => ({ ...h })))
    } catch {
      toast.error(t('booking.admin.workingHours.saveError') || '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const selectedMember = members.find(m => m.id === selectedUserId)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-[40px] text-text3 text-[12px]">
        <Loader2 className="w-[16px] h-[16px] mr-[8px] animate-spin" /> 読み込み中...
      </div>
    )
  }

  return (
    <div className="space-y-[16px]">
      {/* Header */}
      <div className="bg-surface border border-border2 rounded-[10px] p-[12px] shadow flex items-center gap-[12px] flex-wrap">
        <div className="flex items-center gap-[8px]">
          <Clock className="w-[16px] h-[16px] text-mint" />
          <h3 className="text-[14px] font-bold text-text">勤務時間設定</h3>
        </div>
        <div className="flex items-center gap-[8px]">
          <label className="text-[11px] text-text2">コンサルタント</label>
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="text-[13px] text-text px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint min-w-[200px]"
          >
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.role ? ` (${m.role})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-[8px]">
          {dirty && <span className="text-[10px] text-orange-500">未保存の変更</span>}
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="flex items-center gap-[6px] text-[12px] font-bold px-[16px] py-[7px] rounded-[6px] bg-mint text-white hover:bg-mint-d transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-[12px] h-[12px] animate-spin" /> : <Save className="w-[12px] h-[12px]" />}
            保存
          </button>
        </div>
      </div>

      {/* MS365 status */}
      {selectedMember && (
        <div
          className={`rounded-[10px] border p-[12px] flex items-start gap-[10px] ${
            ms365Connected === true
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : ms365Connected === false
              ? 'bg-orange-50 border-orange-200 text-orange-800'
              : 'bg-surf2 border-border2 text-text2'
          }`}
        >
          {ms365Connected === true ? (
            <CheckCircle2 className="w-[16px] h-[16px] mt-[1px] flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-[16px] h-[16px] mt-[1px] flex-shrink-0" />
          )}
          <div className="text-[12px] flex-1">
            {ms365Connected === true && (
              <>
                <span className="font-bold">MS Calendar 連携: ✓ 接続済み</span>
                <p className="text-[11px] mt-[2px]">
                  {selectedMember.name} さんの空き時間はMS365カレンダーの予定と自動で同期されます。
                </p>
              </>
            )}
            {ms365Connected === false && (
              <>
                <span className="font-bold">✗ 未接続 — このコンサルタントの空き時間計算には接続が必要です</span>
                <p className="text-[11px] mt-[2px]">
                  {selectedMember.name} さん本人が設定画面からMS365カレンダーを連携してください。未接続の場合、勤務時間は保存できますが、予約フォーム側で空き時間が正しく表示されません。
                </p>
              </>
            )}
            {ms365Connected === null && (
              <>
                <span className="font-bold">MS365連携状態: 未検出</span>
                <p className="text-[11px] mt-[2px]">
                  このユーザーはまだどのカテゴリにも割当されていません。連携状態は「コンサルタント割当」で確認できます。
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Weekday grid */}
      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
        <div className="p-[12px] border-b border-border2">
          <h4 className="text-[12px] font-bold text-text">週間スケジュール</h4>
          <p className="text-[10px] text-text3 mt-[2px]">アクティブな曜日のみが予約可能時間として扱われます。</p>
        </div>

        {loadingHours ? (
          <div className="flex items-center justify-center p-[40px] text-text3 text-[12px]">
            <Loader2 className="w-[16px] h-[16px] mr-[8px] animate-spin" /> 読み込み中...
          </div>
        ) : (
          <div className="divide-y divide-border2">
            {hours.map(h => (
              <div
                key={h.day_of_week}
                className={`flex items-center gap-[16px] p-[12px] transition-colors ${
                  h.is_active ? 'bg-surface' : 'bg-surf2/40'
                }`}
              >
                <div className={`w-[32px] text-center font-bold text-[14px] ${DAY_COLORS[h.day_of_week]}`}>
                  {DAYS_JA[h.day_of_week]}
                </div>

                <label className="flex items-center gap-[6px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={h.is_active}
                    onChange={e => updateHour(h.day_of_week, { is_active: e.target.checked })}
                    className="accent-mint w-[16px] h-[16px]"
                  />
                  <span className={`text-[11px] ${h.is_active ? 'text-mint font-semibold' : 'text-text3'}`}>
                    {h.is_active ? 'アクティブ' : '休業'}
                  </span>
                </label>

                <div className="flex items-center gap-[8px] ml-auto">
                  <div className="flex items-center gap-[4px]">
                    <label className="text-[11px] text-text2">開始</label>
                    <input
                      type="time"
                      value={timeToHHMM(h.start_time)}
                      onChange={e => updateHour(h.day_of_week, { start_time: e.target.value })}
                      disabled={!h.is_active}
                      className="text-[13px] text-text px-[8px] py-[5px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint disabled:opacity-50"
                    />
                  </div>
                  <span className="text-text3 text-[13px]">〜</span>
                  <div className="flex items-center gap-[4px]">
                    <label className="text-[11px] text-text2">終了</label>
                    <input
                      type="time"
                      value={timeToHHMM(h.end_time)}
                      onChange={e => updateHour(h.day_of_week, { end_time: e.target.value })}
                      disabled={!h.is_active}
                      className="text-[13px] text-text px-[8px] py-[5px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkingHoursTab
