'use client'

import { useState, useEffect, useMemo } from 'react'
import { Save, Loader2, Users, Check, X } from 'lucide-react'
import { toast } from '@/stores/toastStore'
import { useI18n } from '@/hooks/useI18n'
import type { BookingCategory } from './CategoriesTab'

interface Member {
  id: string
  name: string
  name_short?: string | null
  avatar_color?: string | null
  avatar_url?: string | null
  email?: string | null
  role?: string | null
}

interface Consultant {
  user_id: string
  name: string
  name_short?: string | null
  avatar_color?: string | null
  avatar_url?: string | null
  email?: string | null
  role?: string | null
  ms365_connected: boolean
}

const AVATAR_BG: Record<string, string> = {
  'av-a': '#D8ECEA',
  'av-b': '#E8E0EE',
  'av-c': '#EEE4D8',
  'av-d': '#E0ECF4',
  'av-e': '#EEE0E4',
}

function AvatarCircle({ name, name_short, avatar_color, avatar_url, size = 28 }: { name: string; name_short?: string | null; avatar_color?: string | null; avatar_url?: string | null; size?: number }) {
  if (avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar_url} alt={name} className="rounded-full object-cover border border-border2" style={{ width: size, height: size }} />
  }
  const bg = (avatar_color && AVATAR_BG[avatar_color]) || '#D8ECEA'
  const initial = (name_short || name.charAt(0) || '?').slice(0, 2)
  return (
    <div
      className="rounded-full flex items-center justify-center text-text font-bold border border-border2"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: Math.round(size * 0.4) }}
    >
      {initial}
    </div>
  )
}

export function ConsultantAssignmentTab() {
  const { t } = useI18n()
  const [categories, setCategories] = useState<BookingCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [members, setMembers] = useState<Member[]>([])
  const [currentConsultants, setCurrentConsultants] = useState<Consultant[]>([])
  const [checkedUserIds, setCheckedUserIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingConsultants, setLoadingConsultants] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')

  // Load categories + members once
  useEffect(() => {
    Promise.all([
      fetch('/api/booking/categories').then(r => (r.ok ? r.json() : [])),
      fetch('/api/members').then(r => (r.ok ? r.json() : [])),
    ])
      .then(([cats, mems]) => {
        if (Array.isArray(cats)) {
          const sorted = [...cats].sort((a, b) => a.display_order - b.display_order)
          setCategories(sorted)
          if (sorted.length > 0 && !selectedCategoryId) setSelectedCategoryId(sorted[0].id)
        }
        if (Array.isArray(mems)) setMembers(mems)
      })
      .catch(() => toast.error('データの取得に失敗しました'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load consultants for the currently selected category
  useEffect(() => {
    if (!selectedCategoryId) return
    setLoadingConsultants(true)
    fetch(`/api/booking/categories/${selectedCategoryId}/consultants`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (Array.isArray(data)) {
          setCurrentConsultants(data)
          setCheckedUserIds(new Set(data.map((c: Consultant) => c.user_id)))
        } else {
          setCurrentConsultants([])
          setCheckedUserIds(new Set())
        }
      })
      .catch(() => toast.error('コンサルタントの取得に失敗しました'))
      .finally(() => setLoadingConsultants(false))
  }, [selectedCategoryId])

  const toggleUser = (userId: string) => {
    setCheckedUserIds(s => {
      const next = new Set(s)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const filteredMembers = useMemo(() => {
    if (!filter.trim()) return members
    const q = filter.trim().toLowerCase()
    return members.filter(
      m =>
        m.name.toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q) ||
        (m.role ?? '').toLowerCase().includes(q)
    )
  }, [members, filter])

  // Quick lookup: which user_ids have ms365 connected, taken from currentConsultants where present
  const ms365Map = useMemo(() => {
    const m = new Map<string, boolean>()
    for (const c of currentConsultants) m.set(c.user_id, c.ms365_connected)
    return m
  }, [currentConsultants])

  const selectedCategory = categories.find(c => c.id === selectedCategoryId)

  const previewConsultants = useMemo(() => {
    // Combine current consultant metadata with any newly-checked members
    const map = new Map<string, Consultant>()
    for (const c of currentConsultants) map.set(c.user_id, c)
    for (const id of checkedUserIds) {
      if (!map.has(id)) {
        const m = members.find(x => x.id === id)
        if (m) {
          map.set(id, {
            user_id: m.id,
            name: m.name,
            name_short: m.name_short,
            avatar_color: m.avatar_color,
            avatar_url: m.avatar_url,
            email: m.email,
            role: m.role,
            ms365_connected: false,
          })
        }
      }
    }
    // Only return those still checked
    return Array.from(map.values()).filter(c => checkedUserIds.has(c.user_id))
  }, [currentConsultants, checkedUserIds, members])

  const save = async () => {
    if (!selectedCategoryId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/booking/categories/${selectedCategoryId}/consultants`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: Array.from(checkedUserIds) }),
      })
      if (!res.ok) throw new Error('save failed')
      toast.success(t('booking.admin.consultants.saved') || 'コンサルタント割当を保存しました')
      // Refresh list
      const fresh = await fetch(`/api/booking/categories/${selectedCategoryId}/consultants`).then(r => (r.ok ? r.json() : []))
      if (Array.isArray(fresh)) {
        setCurrentConsultants(fresh)
        setCheckedUserIds(new Set(fresh.map((c: Consultant) => c.user_id)))
      }
    } catch {
      toast.error(t('booking.admin.consultants.saveError') || '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // Detect dirty state
  const dirty = useMemo(() => {
    const orig = new Set(currentConsultants.map(c => c.user_id))
    if (orig.size !== checkedUserIds.size) return true
    for (const id of checkedUserIds) if (!orig.has(id)) return true
    return false
  }, [currentConsultants, checkedUserIds])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-[40px] text-text3 text-[12px]">
        <Loader2 className="w-[16px] h-[16px] mr-[8px] animate-spin" /> 読み込み中...
      </div>
    )
  }

  return (
    <div className="space-y-[16px]">
      {/* Header + category selector */}
      <div className="bg-surface border border-border2 rounded-[10px] p-[12px] shadow flex items-center gap-[12px] flex-wrap">
        <div className="flex items-center gap-[8px]">
          <Users className="w-[16px] h-[16px] text-mint" />
          <h3 className="text-[14px] font-bold text-text">コンサルタント割当</h3>
        </div>
        <div className="flex items-center gap-[8px]">
          <label className="text-[11px] text-text2">カテゴリ</label>
          <select
            value={selectedCategoryId}
            onChange={e => setSelectedCategoryId(e.target.value)}
            className="text-[13px] text-text px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.title} {!c.is_public && '（非公開）'}
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

      {selectedCategory && (
        <p className="text-[11px] text-text2 px-[4px]">
          「{selectedCategory.icon} {selectedCategory.title}」を担当できるコンサルタントを選択してください。MS365カレンダー連携が必須です。
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-[16px]">
        {/* Left: all members */}
        <div className="bg-surface border border-border2 rounded-[10px] shadow">
          <div className="p-[12px] border-b border-border2 flex items-center gap-[8px]">
            <h4 className="text-[12px] font-bold text-text">メンバー一覧</h4>
            <span className="text-[11px] text-text3">({members.length})</span>
            <input
              type="text"
              placeholder="検索..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="ml-auto text-[12px] px-[8px] py-[5px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint w-[150px]"
            />
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-border2">
            {filteredMembers.map(m => {
              const checked = checkedUserIds.has(m.id)
              const ms365 = ms365Map.get(m.id)
              return (
                <label
                  key={m.id}
                  className={`flex items-center gap-[12px] p-[12px] cursor-pointer hover:bg-surf2/40 transition-colors ${
                    checked ? 'bg-mint/5' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleUser(m.id)}
                    className="accent-mint w-[16px] h-[16px]"
                  />
                  <AvatarCircle name={m.name} name_short={m.name_short} avatar_color={m.avatar_color} avatar_url={m.avatar_url} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-text font-medium truncate">{m.name}</div>
                    <div className="text-[10px] text-text3 truncate">{m.email ?? '—'}</div>
                  </div>
                  {checked && (
                    <span
                      className={`text-[10px] px-[6px] py-[2px] rounded-full font-semibold ${
                        ms365 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                      }`}
                      title={ms365 ? 'MS365連携済み' : 'MS365未連携 — 空き時間が算出できません'}
                    >
                      {ms365 ? (
                        <span className="inline-flex items-center gap-[2px]">
                          <Check className="w-[10px] h-[10px]" /> MS365
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-[2px]">
                          <X className="w-[10px] h-[10px]" /> MS365
                        </span>
                      )}
                    </span>
                  )}
                  {m.role && (
                    <span className="text-[10px] px-[6px] py-[2px] rounded-full bg-surf2 text-text2 border border-border2">
                      {m.role}
                    </span>
                  )}
                </label>
              )
            })}
            {filteredMembers.length === 0 && (
              <div className="text-center text-text3 text-[12px] p-[24px]">メンバーが見つかりません</div>
            )}
          </div>
        </div>

        {/* Right: preview of assigned */}
        <div className="bg-surface border border-border2 rounded-[10px] shadow">
          <div className="p-[12px] border-b border-border2 flex items-center gap-[8px]">
            <h4 className="text-[12px] font-bold text-text">割当中のコンサルタント</h4>
            <span className="text-[11px] text-text3">({previewConsultants.length})</span>
            {loadingConsultants && <Loader2 className="w-[12px] h-[12px] text-text3 animate-spin ml-[4px]" />}
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-border2">
            {previewConsultants.map(c => (
              <div key={c.user_id} className="flex items-center gap-[12px] p-[12px]">
                <AvatarCircle name={c.name} name_short={c.name_short} avatar_color={c.avatar_color} avatar_url={c.avatar_url} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-text font-medium truncate">{c.name}</div>
                  <div className="text-[10px] text-text3 truncate">{c.email ?? '—'}</div>
                </div>
                <span
                  className={`text-[10px] px-[6px] py-[2px] rounded-full font-semibold inline-flex items-center gap-[2px] ${
                    c.ms365_connected ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {c.ms365_connected ? <Check className="w-[10px] h-[10px]" /> : <X className="w-[10px] h-[10px]" />}
                  MS365
                </span>
                <button
                  onClick={() => toggleUser(c.user_id)}
                  className="text-[10px] px-[8px] py-[3px] rounded-[4px] text-text3 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="割当を解除"
                >
                  解除
                </button>
              </div>
            ))}
            {previewConsultants.length === 0 && !loadingConsultants && (
              <div className="text-center text-text3 text-[12px] p-[40px]">
                まだコンサルタントが割当されていません。<br />左のリストから選択してください。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsultantAssignmentTab
