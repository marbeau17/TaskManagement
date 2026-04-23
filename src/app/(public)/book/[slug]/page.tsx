'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// ---------- types ----------
interface Category {
  id: string
  slug: string
  title: string
  description: string
  duration_min: number
  icon: string
  color: string
}

interface Slot {
  start_at: string
  end_at: string
  candidate_consultants: string[]
}

interface Consultant {
  id: string
  name: string
  avatar_url?: string | null
}

interface ReservationResult {
  token: string
  slot_start_at: string
  slot_end_at: string
}

// ---------- helpers ----------
function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateJP(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  return { from: toYMD(first), to: toYMD(last) }
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

// ---------- page ----------
export default function BookSlugPage() {
  const params = useParams()
  const slug = (params?.slug as string) || ''

  const [category, setCategory] = useState<Category | null>(null)
  const [loadingCategory, setLoadingCategory] = useState(true)

  const [viewDate, setViewDate] = useState<Date>(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [consultants, setConsultants] = useState<Record<string, Consultant>>({})

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: '',
    website: '', // honeypot
  })

  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [result, setResult] = useState<ReservationResult | null>(null)

  // ---- fetch category ----
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/book/categories')
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) {
          const found = data.find((c: Category) => c.slug === slug)
          if (found) setCategory(found)
        }
      } catch {
        // ignored
      } finally {
        if (!cancelled) setLoadingCategory(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  // ---- fetch consultants for category ----
  useEffect(() => {
    if (!category) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/booking/categories/${category!.id}/consultants`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) {
          const map: Record<string, Consultant> = {}
          data.forEach((c: Consultant) => {
            map[c.id] = c
          })
          setConsultants(map)
        }
      } catch {
        // ignored
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [category])

  // ---- fetch slots for the visible month ----
  useEffect(() => {
    if (!slug) return
    let cancelled = false
    async function load() {
      setLoadingSlots(true)
      const { from, to } = monthRange(viewDate.getFullYear(), viewDate.getMonth())
      try {
        const res = await fetch(
          `/api/book/slots?slug=${encodeURIComponent(slug)}&from=${from}&to=${to}`,
        )
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) {
          setSlots(data)
        }
      } catch {
        if (!cancelled) setSlots([])
      } finally {
        if (!cancelled) setLoadingSlots(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug, viewDate])

  // group slots by date
  const slotsByDate = useMemo(() => {
    const map: Record<string, Slot[]> = {}
    for (const s of slots) {
      const d = new Date(s.start_at)
      const key = toYMD(d)
      if (!map[key]) map[key] = []
      map[key].push(s)
    }
    // sort each day by start time
    for (const key of Object.keys(map)) {
      map[key].sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      )
    }
    return map
  }, [slots])

  const color = category?.color || '#0d1f3c'

  // ---- calendar grid ----
  const calendarCells = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const startWeekday = firstOfMonth.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: Array<{ date: Date | null; key: string }> = []
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ date: null, key: `pad-${i}` })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), key: `d-${d}` })
    }
    // pad to multiple of 7
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, key: `pad-end-${cells.length}` })
    }
    return cells
  }, [viewDate])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const maxDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 60)
    d.setHours(23, 59, 59, 999)
    return d
  }, [])

  const goPrevMonth = useCallback(() => {
    setViewDate((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() - 1)
      return d
    })
    setSelectedDate(null)
    setSelectedSlot(null)
  }, [])

  const goNextMonth = useCallback(() => {
    setViewDate((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + 1)
      return d
    })
    setSelectedDate(null)
    setSelectedSlot(null)
  }, [])

  const canGoPrev = useMemo(() => {
    // Don't go before current month
    const now = new Date()
    return (
      viewDate.getFullYear() > now.getFullYear() ||
      (viewDate.getFullYear() === now.getFullYear() &&
        viewDate.getMonth() > now.getMonth())
    )
  }, [viewDate])

  const canGoNext = useMemo(() => {
    // 60 days ahead
    const nextMonth = new Date(viewDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(1)
    return nextMonth <= maxDate
  }, [viewDate, maxDate])

  // ---- form validation ----
  const formValid = useMemo(() => {
    if (!form.name.trim()) return false
    if (!form.email.trim()) return false
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return false
    return true
  }, [form])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  // ---- submit ----
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!selectedSlot) {
        showToast('時間を選択してください')
        return
      }
      if (!formValid) {
        showToast('必須項目を入力してください')
        return
      }
      setSubmitting(true)
      try {
        const res = await fetch(`/api/book/${encodeURIComponent(slug)}/reserve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot_start_at: selectedSlot.start_at,
            slot_end_at: selectedSlot.end_at,
            name: form.name,
            email: form.email,
            company: form.company,
            phone: form.phone,
            message: form.message,
            honeypot: form.website,
          }),
        })
        if (!res.ok) {
          showToast('予約に失敗しました。時間を置いて再度お試しください。')
          return
        }
        const data = await res.json()
        setResult({
          token: data.token,
          slot_start_at: selectedSlot.start_at,
          slot_end_at: selectedSlot.end_at,
        })
      } catch {
        showToast('予約に失敗しました。時間を置いて再度お試しください。')
      } finally {
        setSubmitting(false)
      }
    },
    [selectedSlot, form, slug, formValid, showToast],
  )

  // ---- loading category ----
  if (loadingCategory) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#f8f4ec' }}
      >
        <div
          className="animate-spin h-8 w-8 border-4 rounded-full"
          style={{ borderColor: '#0d1f3c', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (!category) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: '#f8f4ec' }}
      >
        <div className="max-w-md text-center bg-white rounded-2xl shadow-sm p-8">
          <div className="text-4xl mb-3">?</div>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#0d1f3c' }}>
            カテゴリが見つかりません
          </h2>
          <Link
            href="/book"
            className="inline-block mt-4 px-5 py-2 rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: '#0d1f3c' }}
          >
            戻る
          </Link>
        </div>
      </div>
    )
  }

  // ---- confirmation screen ----
  if (result) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f8f4ec' }}>
        <header
          className="text-center py-10"
          style={{ background: 'linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 100%)' }}
        >
          <p
            className="text-xs tracking-widest mb-2"
            style={{ color: '#b8922a' }}
          >
            株式会社MEETS
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            ご予約ありがとうございます
          </h1>
        </header>
        <main className="max-w-xl mx-auto px-4 py-10">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">&#10003;</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#0d1f3c' }}>
              ご予約ありがとうございます
            </h2>
            <p className="text-sm mb-6" style={{ color: '#4a4a5a' }}>
              確認メールをお送りしました。メール内のリンクからご予約のキャンセルが可能です。
            </p>

            <div className="text-left border-t border-b py-5 my-5 space-y-2">
              <SummaryRow label="カテゴリ" value={category.title} />
              <SummaryRow label="日時" value={`${formatDateJP(result.slot_start_at)} ${formatTime(result.slot_start_at)} – ${formatTime(result.slot_end_at)}`} />
              <SummaryRow label="お名前" value={form.name} />
              <SummaryRow label="メールアドレス" value={form.email} />
              {form.company && <SummaryRow label="会社名" value={form.company} />}
            </div>

            <Link
              href={`/book/cancel?token=${encodeURIComponent(result.token)}`}
              className="text-sm underline"
              style={{ color: '#8a8a9a' }}
            >
              ご予約をキャンセルする
            </Link>
          </div>
          <div className="text-center mt-6">
            <Link
              href="/book"
              className="text-sm"
              style={{ color: '#4a4a5a' }}
            >
              ← 予約トップへ戻る
            </Link>
          </div>
        </main>
        <footer
          className="text-center py-6 text-xs"
          style={{ color: '#8a8a9a' }}
        >
          &copy; {new Date().getFullYear()} 株式会社MEETS
        </footer>
      </div>
    )
  }

  // ---- main booking flow ----
  const daySlots = selectedDate ? slotsByDate[selectedDate] || [] : []

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f4ec' }}>
      {/* Header */}
      <header
        className="text-center py-8"
        style={{ background: 'linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 100%)' }}
      >
        <p
          className="text-xs tracking-widest mb-2"
          style={{ color: '#b8922a' }}
        >
          株式会社MEETS
        </p>
        <h1 className="text-xl md:text-2xl font-bold text-white px-4">
          無料診断のご予約
        </h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-24 space-y-6">
        {/* Back link */}
        <Link
          href="/book"
          className="inline-flex items-center text-sm"
          style={{ color: '#4a4a5a' }}
        >
          ← カテゴリ一覧へ戻る
        </Link>

        {/* Step 1 — category info */}
        <section
          className="bg-white rounded-2xl shadow-sm p-6 md:p-8"
          style={{ borderTop: `4px solid ${color}` }}
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl md:text-5xl" aria-hidden>
              {category.icon || '📅'}
            </div>
            <div className="flex-1">
              <h2 className="text-lg md:text-xl font-bold mb-2" style={{ color: '#0d1f3c' }}>
                {category.title}
              </h2>
              <p className="text-sm" style={{ color: '#4a4a5a' }}>
                {category.description}
              </p>
              <span
                className="inline-block mt-3 text-xs px-3 py-1 rounded-full font-medium"
                style={{ backgroundColor: `${color}15`, color }}
              >
                約{category.duration_min}分
              </span>
            </div>
          </div>
        </section>

        {/* Step 2 — calendar */}
        <section className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <h2 className="text-base font-bold mb-4" style={{ color: '#0d1f3c' }}>
            日付を選択してください
          </h2>

          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goPrevMonth}
              disabled={!canGoPrev}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-30"
              style={{ borderColor: '#d0c9b8', color: '#0d1f3c' }}
            >
              ← 前月
            </button>
            <div className="text-base font-bold" style={{ color: '#0d1f3c' }}>
              {viewDate.getFullYear()}年{viewDate.getMonth() + 1}月
            </div>
            <button
              type="button"
              onClick={goNextMonth}
              disabled={!canGoNext}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-30"
              style={{ borderColor: '#d0c9b8', color: '#0d1f3c' }}
            >
              翌月 →
            </button>
          </div>

          {/* weekday headings */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className="text-center text-xs font-medium py-1"
                style={{
                  color: i === 0 ? '#c0392b' : i === 6 ? '#2980b9' : '#4a4a5a',
                }}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell) => {
              if (!cell.date) {
                return <div key={cell.key} />
              }
              const ymd = toYMD(cell.date)
              const inRange = cell.date >= today && cell.date <= maxDate
              const hasSlots = (slotsByDate[ymd]?.length || 0) > 0
              const available = inRange && hasSlots
              const isSelected = selectedDate === ymd
              const isToday = toYMD(today) === ymd

              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={!available}
                  onClick={() => {
                    setSelectedDate(ymd)
                    setSelectedSlot(null)
                  }}
                  className={`aspect-square rounded-lg text-sm flex flex-col items-center justify-center transition ${
                    !available
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? color
                      : available
                        ? '#fffbeb'
                        : '#f5f3ef',
                    color: isSelected ? '#fff' : '#0d1f3c',
                    border: isToday ? '2px solid #b8922a' : '1px solid transparent',
                  }}
                >
                  <span className={isSelected ? 'font-bold' : ''}>
                    {cell.date.getDate()}
                  </span>
                  {available && !isSelected && (
                    <span
                      className="mt-0.5 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {loadingSlots && (
            <div className="text-center text-xs mt-3" style={{ color: '#8a8a9a' }}>
              読み込み中...
            </div>
          )}
        </section>

        {/* Step 3 — time slots */}
        {selectedDate && (
          <section className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
            <h2 className="text-base font-bold mb-1" style={{ color: '#0d1f3c' }}>
              時間を選択してください
            </h2>
            <p className="text-xs mb-4" style={{ color: '#8a8a9a' }}>
              {formatDateJP(selectedDate)}
            </p>

            {daySlots.length === 0 ? (
              <div className="text-sm text-center py-6" style={{ color: '#8a8a9a' }}>
                この日は予約可能な時間がありません
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {daySlots.map((s) => {
                  const isSelected =
                    selectedSlot?.start_at === s.start_at &&
                    selectedSlot?.end_at === s.end_at
                  const firstConsultant = s.candidate_consultants?.[0]
                  const consultant = firstConsultant
                    ? consultants[firstConsultant]
                    : undefined
                  return (
                    <button
                      key={`${s.start_at}-${s.end_at}`}
                      type="button"
                      onClick={() => setSelectedSlot(isSelected ? null : s)}
                      className="flex items-center gap-3 p-3 rounded-lg border-2 text-left transition"
                      style={{
                        borderColor: isSelected ? color : '#e5e0d0',
                        backgroundColor: isSelected ? `${color}10` : '#fff',
                      }}
                    >
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {formatTime(s.start_at).slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-bold"
                          style={{ color: '#0d1f3c' }}
                        >
                          {formatTime(s.start_at)} – {formatTime(s.end_at)}
                        </div>
                        {consultant && (
                          <div
                            className="text-xs truncate"
                            style={{ color: '#8a8a9a' }}
                          >
                            担当: {consultant.name}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <span style={{ color }} className="text-lg">
                          &#10003;
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* Step 4 — reservation form */}
        {selectedSlot && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm p-6 md:p-8 space-y-5"
          >
            <h2 className="text-base font-bold" style={{ color: '#0d1f3c' }}>
              ご予約情報
            </h2>

            <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: `${color}10`, color: '#0d1f3c' }}>
              {formatDateJP(selectedSlot.start_at)}{' '}
              {formatTime(selectedSlot.start_at)} – {formatTime(selectedSlot.end_at)}
            </div>

            <FormField
              label="お名前"
              required
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <FormField
              label="メールアドレス"
              type="email"
              required
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <FormField
              label="会社名"
              value={form.company}
              onChange={(v) => setForm({ ...form, company: v })}
            />
            <FormField
              label="電話番号"
              type="tel"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
            />

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0d1f3c' }}>
                ご相談内容（任意）
              </label>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:border-[#b8922a] focus:ring-1 focus:ring-[#b8922a]"
                style={{ borderColor: '#e5e0d0', backgroundColor: '#fafaf5' }}
              />
            </div>

            {/* honeypot */}
            <input
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              style={{ display: 'none' }}
              aria-hidden="true"
            />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSlot(null)
                }}
                className="px-5 py-3 rounded-lg border text-sm font-bold"
                style={{ borderColor: '#d0c9b8', color: '#0d1f3c' }}
              >
                戻る
              </button>
              <button
                type="submit"
                disabled={submitting || !formValid}
                className="flex-1 py-3 rounded-lg text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: color }}
              >
                {submitting ? '送信中...' : '確認して予約する'}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg shadow-lg text-sm text-white z-50"
          style={{ backgroundColor: '#c0392b' }}
        >
          {toast}
        </div>
      )}

      <footer
        className="text-center py-6 text-xs"
        style={{ color: '#8a8a9a' }}
      >
        &copy; {new Date().getFullYear()} 株式会社MEETS
      </footer>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span style={{ color: '#8a8a9a' }}>{label}</span>
      <span style={{ color: '#0d1f3c' }} className="font-medium text-right">
        {value}
      </span>
    </div>
  )
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: '#0d1f3c' }}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:border-[#b8922a] focus:ring-1 focus:ring-[#b8922a]"
        style={{ borderColor: '#e5e0d0', backgroundColor: '#fafaf5' }}
      />
    </div>
  )
}
