'use client'

import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, Loader2, Copy, ExternalLink, Check } from 'lucide-react'
import { toast } from '@/stores/toastStore'
import { useI18n } from '@/hooks/useI18n'

export interface BookingCategory {
  id: string
  slug: string
  title: string
  description: string
  duration_min: number
  buffer_min: number
  is_public: boolean
  display_order: number
  icon: string
  color: string
}

const COLOR_PRESETS = ['#6FB5A3', '#E09B5A', '#7B9BD4', '#9B7BC4', '#D47B9B', '#5AB2A8', '#475569']

export function CategoriesTab() {
  const { t } = useI18n()
  const [categories, setCategories] = useState<BookingCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, BookingCategory>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const publicUrlFor = (slug: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://portal.meetsc.co.jp'
    return `${origin}/book/${slug}`
  }

  const copyUrl = async (id: string, slug: string) => {
    try {
      await navigator.clipboard.writeText(publicUrlFor(slug))
      setCopiedId(id)
      toast.success('URLをコピーしました')
      setTimeout(() => setCopiedId(c => (c === id ? null : c)), 1500)
    } catch {
      toast.error('コピーに失敗しました')
    }
  }

  useEffect(() => {
    fetch('/api/booking/categories')
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => a.display_order - b.display_order)
          setCategories(sorted)
          const draftMap: Record<string, BookingCategory> = {}
          for (const c of sorted) draftMap[c.id] = { ...c }
          setDrafts(draftMap)
        }
      })
      .catch(() => toast.error(t('booking.admin.categories.fetchError') || 'カテゴリの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [t])

  const updateDraft = (id: string, patch: Partial<BookingCategory>) => {
    setDrafts(d => ({ ...d, [id]: { ...d[id], ...patch } }))
  }

  const isDirty = (id: string) => {
    const orig = categories.find(c => c.id === id)
    const draft = drafts[id]
    if (!orig || !draft) return false
    return (
      orig.title !== draft.title ||
      orig.description !== draft.description ||
      orig.duration_min !== draft.duration_min ||
      orig.buffer_min !== draft.buffer_min ||
      orig.is_public !== draft.is_public ||
      orig.display_order !== draft.display_order ||
      orig.icon !== draft.icon ||
      orig.color !== draft.color
    )
  }

  const save = async (id: string) => {
    const draft = drafts[id]
    if (!draft) return
    setSavingId(id)

    // Optimistic update
    const prevCategories = categories
    setCategories(cs => cs.map(c => (c.id === id ? draft : c)))

    try {
      const res = await fetch(`/api/booking/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          duration_min: draft.duration_min,
          buffer_min: draft.buffer_min,
          is_public: draft.is_public,
          display_order: draft.display_order,
          icon: draft.icon,
          color: draft.color,
        }),
      })
      if (!res.ok) throw new Error('save failed')
      toast.success(t('booking.admin.categories.saved') || 'カテゴリを保存しました')
    } catch {
      // Rollback
      setCategories(prevCategories)
      toast.error(t('booking.admin.categories.saveError') || '保存に失敗しました')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-[40px] text-text3 text-[12px]">
        <Loader2 className="w-[16px] h-[16px] mr-[8px] animate-spin" /> 読み込み中...
      </div>
    )
  }

  return (
    <div className="space-y-[16px]">
      <div className="flex items-center justify-between mb-[8px]">
        <div>
          <h3 className="text-[14px] font-bold text-text">カテゴリ設定</h3>
          <p className="text-[11px] text-text2 mt-[2px]">5種類の診断カテゴリの表示内容・所要時間・公開状態を編集できます</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
        {categories.map(cat => {
          const draft = drafts[cat.id] ?? cat
          const dirty = isDirty(cat.id)
          const saving = savingId === cat.id

          return (
            <div
              key={cat.id}
              className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow"
              style={{ borderLeft: `4px solid ${draft.color}` }}
            >
              {/* Top row: icon + title + public toggle */}
              <div className="flex items-start gap-[12px] mb-[12px]">
                <input
                  type="text"
                  value={draft.icon}
                  onChange={e => updateDraft(cat.id, { icon: e.target.value })}
                  maxLength={4}
                  className="w-[44px] h-[44px] text-[22px] text-center bg-surf2 border border-border2 rounded-[8px] outline-none focus:border-mint"
                  placeholder="🎯"
                />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={draft.title}
                    onChange={e => updateDraft(cat.id, { title: e.target.value })}
                    className="w-full text-[14px] font-bold text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                    placeholder="カテゴリ名"
                  />
                  <p className="text-[10px] text-text3 mt-[4px] font-mono truncate">slug: {draft.slug}</p>
                </div>
                <button
                  onClick={() => updateDraft(cat.id, { is_public: !draft.is_public })}
                  className={`flex items-center gap-[4px] text-[11px] px-[10px] py-[6px] rounded-[6px] border transition-colors ${
                    draft.is_public
                      ? 'bg-mint/10 text-mint border-mint/30'
                      : 'bg-surf2 text-text3 border-border2'
                  }`}
                  title={draft.is_public ? '公開中 — 予約フォームに表示' : '非公開 — 予約フォームに表示されません'}
                >
                  {draft.is_public ? (
                    <>
                      <Eye className="w-[12px] h-[12px]" /> 公開
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-[12px] h-[12px]" /> 非公開
                    </>
                  )}
                </button>
              </div>

              {/* Description */}
              <div className="mb-[12px]">
                <label className="text-[11px] text-text2 font-medium block mb-[4px]">説明</label>
                <textarea
                  value={draft.description}
                  onChange={e => updateDraft(cat.id, { description: e.target.value })}
                  rows={3}
                  className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint resize-y"
                  placeholder="このカテゴリの説明文"
                />
              </div>

              {/* Duration / Buffer / Order */}
              <div className="grid grid-cols-3 gap-[12px] mb-[12px]">
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">所要時間（分）</label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    step={5}
                    value={draft.duration_min}
                    onChange={e => updateDraft(cat.id, { duration_min: Number(e.target.value) || 0 })}
                    className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">バッファ（分）</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    step={5}
                    value={draft.buffer_min}
                    onChange={e => updateDraft(cat.id, { buffer_min: Number(e.target.value) || 0 })}
                    className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">表示順</label>
                  <input
                    type="number"
                    min={0}
                    value={draft.display_order}
                    onChange={e => updateDraft(cat.id, { display_order: Number(e.target.value) || 0 })}
                    className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                  />
                </div>
              </div>

              {/* Color */}
              <div className="mb-[16px]">
                <label className="text-[11px] text-text2 font-medium block mb-[6px]">カラー</label>
                <div className="flex items-center gap-[8px] flex-wrap">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      onClick={() => updateDraft(cat.id, { color: c })}
                      className={`w-[28px] h-[28px] rounded-full border-2 transition-all ${
                        draft.color === c ? 'border-text scale-110' : 'border-border2'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={draft.color}
                    onChange={e => updateDraft(cat.id, { color: e.target.value })}
                    className="w-[28px] h-[28px] rounded-full border border-border2 cursor-pointer"
                    title="カスタムカラー"
                  />
                  <span className="text-[11px] text-text3 font-mono ml-[4px]">{draft.color}</span>
                </div>
              </div>

              {/* Public URL */}
              {draft.is_public && (
                <div className="mb-[12px] p-[10px] bg-surf2 border border-border2 rounded-[6px]">
                  <div className="flex items-center justify-between gap-[8px] mb-[4px]">
                    <label className="text-[11px] text-text2 font-medium">公開URL</label>
                    <div className="flex items-center gap-[4px]">
                      <button
                        onClick={() => copyUrl(cat.id, draft.slug)}
                        className="flex items-center gap-[4px] text-[10px] px-[8px] py-[4px] rounded-[4px] bg-surface border border-border2 hover:bg-surf2 transition-colors text-text2"
                        title="URLをコピー"
                      >
                        {copiedId === cat.id ? (
                          <>
                            <Check className="w-[10px] h-[10px] text-mint" />
                            コピー済み
                          </>
                        ) : (
                          <>
                            <Copy className="w-[10px] h-[10px]" />
                            コピー
                          </>
                        )}
                      </button>
                      <a
                        href={publicUrlFor(draft.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-[4px] text-[10px] px-[8px] py-[4px] rounded-[4px] bg-surface border border-border2 hover:bg-surf2 transition-colors text-text2"
                        title="新しいタブで開く"
                      >
                        <ExternalLink className="w-[10px] h-[10px]" />
                        開く
                      </a>
                    </div>
                  </div>
                  <p className="text-[11px] text-text3 font-mono truncate select-all">{publicUrlFor(draft.slug)}</p>
                </div>
              )}

              {/* Save button */}
              <div className="flex items-center justify-end gap-[8px]">
                {dirty && <span className="text-[10px] text-orange-500">未保存の変更</span>}
                <button
                  onClick={() => save(cat.id)}
                  disabled={!dirty || saving}
                  className="flex items-center gap-[6px] text-[12px] font-bold px-[16px] py-[7px] rounded-[6px] bg-mint text-white hover:bg-mint-d transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-[12px] h-[12px] animate-spin" />
                  ) : (
                    <Save className="w-[12px] h-[12px]" />
                  )}
                  保存
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {categories.length === 0 && !loading && (
        <div className="text-center text-text3 text-[12px] p-[40px]">カテゴリが見つかりません</div>
      )}
    </div>
  )
}

export default CategoriesTab
