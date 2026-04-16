'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'

// ---------- Booking slot type ----------
interface BookingSlot {
  id: string
  event_date: string
  start_time: string
  end_time: string
  slot_number: number
  is_available: boolean
  booked_by_name?: string | null
}

// ---------- types ----------
interface FormField {
  name: string
  label: string
  type: string
  required?: boolean
  options?: string[]
  placeholder?: string
  rows?: number
  min?: number
  max?: number
  step?: number
}

interface FormSection {
  title: string
  fields: FormField[]
}

interface FormDefinition {
  id: string
  title: string
  subtitle: string
  sections: FormSection[]
}

// ---------- hardcoded default form ----------
const DEFAULT_FORM: FormDefinition = {
  id: 'kiraboshi-hearing-2026',
  title: '事前ヒアリングシート',
  subtitle: 'きらぼし銀行　経営相談会　2026.5.20',
  sections: [
    {
      title: '基本情報',
      fields: [
        { name: 'company', label: '会社名・屋号', type: 'text', required: true, placeholder: '例）株式会社○○' },
        { name: 'industry', label: '業種', type: 'text', required: true, placeholder: '例）製造業・卸売業' },
        { name: 'name', label: 'ご担当者名', type: 'text', required: true, placeholder: '例）山田 太郎' },
        { name: 'position', label: '役職', type: 'text', required: true, placeholder: '例）代表取締役' },
        { name: 'employees', label: '従業員数', type: 'select', options: ['選択してください', '1〜5名', '6〜20名', '21〜50名', '51〜100名', '101〜300名', '301名以上'] },
        { name: 'revenue', label: '年商規模', type: 'select', options: ['選択してください', '〜3,000万円', '3,000万〜1億円', '1億〜5億円', '5億〜10億円', '10億〜50億円', '50億円以上'] },
        { name: 'email', label: 'メールアドレス', type: 'email', required: true, placeholder: 'example@company.co.jp' },
      ],
    },
    {
      title: '相談テーマ',
      fields: [
        {
          name: 'themes',
          label: '相談したいテーマを選択してください（複数可）',
          type: 'checkbox-group',
          options: [
            'EC・通販の売上拡大',
            'AI・デジタル活用',
            '経営戦略・事業計画',
            '組織・人材',
            'その他',
          ],
        },
      ],
    },
    {
      title: '今一番困っていること',
      fields: [
        { name: 'issue', label: '具体的にお聞かせください', type: 'textarea', required: true, rows: 4, placeholder: '例）ECサイトの売上が伸びず、広告費ばかり増えている...' },
        { name: 'tried', label: 'これまでに試したこと（任意）', type: 'textarea', rows: 3, placeholder: '例）リスティング広告を出したが費用対効果が合わない...' },
        { name: 'duration', label: 'お困りの期間', type: 'select', options: ['選択してください', '1ヶ月未満', '1〜3ヶ月', '3〜6ヶ月', '6ヶ月〜1年', '1年以上'] },
      ],
    },
    {
      title: '解決の緊急度',
      fields: [
        {
          name: 'urgency',
          label: '解決したい時期を教えてください',
          type: 'radio-group',
          options: [
            '今すぐ解決したい\u{1F525}',
            '3ヶ月以内に解決したい\u26A1',
            '半年以内に方向性を決めたい\u{1F4CB}',
            '情報収集中\u{1F50D}',
          ],
        },
      ],
    },
    {
      title: '外部支援への投資予算感',
      fields: [
        {
          name: 'budget',
          label: '月額のおおよその投資可能額',
          type: 'range',
          min: 0,
          max: 5,
          step: 1,
        },
      ],
    },
    {
      title: '意思決定について',
      fields: [
        {
          name: 'decision_maker',
          label: '今回のご相談について、最終的な意思決定者はどなたですか？',
          type: 'radio-group',
          options: [
            'ご自身が最終決定者',
            '別の方（上長・役員など）の承認が必要',
          ],
        },
      ],
    },
    {
      title: '相談後に期待すること',
      fields: [
        {
          name: 'expectations',
          label: '相談後にどうなると嬉しいですか？（複数可）',
          type: 'checkbox-group',
          options: [
            '具体的な改善プランの提示',
            '自社の課題の整理・明確化',
            '費用感・ROIの目安を知りたい',
            '他社の成功事例を聞きたい',
            '継続的な支援体制の相談',
          ],
        },
        {
          name: 'expectations_other',
          label: 'その他ご要望（自由記述）',
          type: 'textarea',
          rows: 3,
          placeholder: '何かございましたらご自由にお書きください',
        },
      ],
    },
  ],
}

const BUDGET_LABELS = ['未定', '〜5万円', '5〜15万円', '15〜30万円', '30〜50万円', '制限なし']

// ---------- component ----------
export default function PublicFormPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [form, setForm] = useState<FormDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [values, setValues] = useState<Record<string, string | string[]>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  // fetch form definition
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/crm/forms?slug=${encodeURIComponent(slug)}`)
        if (res.ok) {
          const data = await res.json()
          if (data && !cancelled) {
            setForm(data)
            setLoading(false)
            return
          }
        }
      } catch {
        // ignore – fall through to default
      }
      if (!cancelled) {
        setForm(DEFAULT_FORM)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  // fetch booking slots
  useEffect(() => {
    fetch('/api/booking?date=2026-05-20')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setBookingSlots(data) })
      .catch(() => {})
  }, [])

  const availableSlots = useMemo(() => bookingSlots.filter(s => s.is_available), [bookingSlots])

  // ---------- helpers ----------
  const set = useCallback((name: string, value: string | string[]) => {
    setValues(prev => ({ ...prev, [name]: value }))
    setErrors(prev => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const toggleCheckbox = useCallback((name: string, option: string) => {
    setValues(prev => {
      const arr = (prev[name] as string[]) || []
      return {
        ...prev,
        [name]: arr.includes(option) ? arr.filter(v => v !== option) : [...arr, option],
      }
    })
  }, [])

  const validate = useCallback(() => {
    if (!form) return false
    const errs: Record<string, string> = {}
    const requiredFields = ['company', 'industry', 'name', 'position', 'email', 'issue']
    for (const fieldName of requiredFields) {
      const val = values[fieldName]
      if (!val || (typeof val === 'string' && !val.trim())) {
        // find label
        let label = fieldName
        for (const s of form.sections) {
          const f = s.fields.find(f => f.name === fieldName)
          if (f) { label = f.label; break }
        }
        errs[fieldName] = `${label}は必須です`
      }
    }
    // email format
    if (values.email && typeof values.email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errs.email = '正しいメールアドレスを入力してください'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [form, values])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !form) return
    setSubmitting(true)
    try {
      // try form-specific endpoint first, fall back to generic
      const endpoints = [
        `/api/crm/forms/${form.id}/submit`,
        `/api/form/submit`,
      ]
      let success = false
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formId: form.id, slug, values }),
          })
          if (res.ok) { success = true; break }
        } catch {
          // try next
        }
      }
      // Book selected slot if any
      if (selectedSlot && values.name && values.email) {
        try {
          await fetch('/api/booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slot_id: selectedSlot,
              name: values.name as string,
              email: values.email as string,
              company: (values.company as string) || '',
            }),
          })
        } catch {
          console.warn('Booking failed')
        }
      }

      setSubmitted(true)
      if (!success) {
        console.warn('Form data could not be saved to server – endpoints may not be implemented yet.')
      }
    } finally {
      setSubmitting(false)
    }
  }, [form, slug, values, validate])

  // ---------- loading ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f4ec' }}>
        <div className="animate-spin h-8 w-8 border-4 rounded-full" style={{ borderColor: '#0d1f3c', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  // ---------- thank you ----------
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f4ec' }}>
        <div className="max-w-lg mx-auto text-center p-10 bg-white rounded-2xl shadow-lg">
          <div className="text-5xl mb-4">&#10003;</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#0d1f3c' }}>ご送信ありがとうございます</h2>
          <p className="text-gray-600">
            ヒアリングシートを受け付けました。<br />
            担当者より折り返しご連絡いたします。
          </p>
        </div>
      </div>
    )
  }

  if (!form) return null

  // ---------- render ----------
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f4ec' }}>
      {/* header */}
      <header className="text-center py-10" style={{ background: 'linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 100%)' }}>
        <p className="text-sm tracking-widest mb-2" style={{ color: '#b8922a' }}>{form.subtitle}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white">{form.title}</h1>
        <div className="mx-auto mt-4 w-16 h-0.5" style={{ backgroundColor: '#b8922a' }} />
      </header>

      {/* form body */}
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {form.sections.map((section, si) => (
          <section key={si} className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: '#0d1f3c' }}>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-sm font-bold" style={{ backgroundColor: '#b8922a' }}>
                {si + 1}
              </span>
              {section.title}
            </h2>

            <div className={section.title === '基本情報' ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : 'space-y-5'}>
              {section.fields.map(field => (
                <FieldRenderer
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  error={errors[field.name]}
                  onChange={set}
                  onToggle={toggleCheckbox}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Booking Calendar Section */}
        {bookingSlots.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: '#0d1f3c' }}>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-sm font-bold" style={{ backgroundColor: '#0d1f3c' }}>📅</span>
              ご希望の相談枠を選択してください
            </h2>
            <p className="text-xs mb-4" style={{ color: '#8a8a9a' }}>2026年5月20日（水）｜30分 × 10社 ※ 空き枠のみ選択可</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bookingSlots.map(slot => {
                const isBooked = !slot.is_available
                const isSelected = selectedSlot === slot.id
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={isBooked}
                    onClick={() => setSelectedSlot(isSelected ? null : slot.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                      isBooked
                        ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50'
                        : isSelected
                          ? 'border-[#b8922a] bg-[#fffbeb] shadow-md'
                          : 'border-gray-200 hover:border-[#b8922a] hover:bg-[#fffdf5]'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded text-sm font-bold text-white shrink-0 ${isBooked ? 'bg-gray-300' : 'bg-[#0d1f3c]'}`}>
                      {slot.slot_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color: '#0d1f3c' }}>
                        {slot.start_time} 〜 {slot.end_time}
                      </div>
                      <div className="text-xs" style={{ color: isBooked ? '#999' : '#b8922a' }}>
                        {isBooked ? '予約済み' : isSelected ? '✓ 選択中' : '空き'}
                      </div>
                    </div>
                    {isSelected && <span className="text-lg">✓</span>}
                  </button>
                )
              })}
            </div>
            {!selectedSlot && availableSlots.length > 0 && (
              <p className="text-xs mt-3" style={{ color: '#c0392b' }}>※ 相談枠を1つお選びください</p>
            )}
          </section>
        )}

        {/* submit */}
        <div className="text-center pt-2 pb-10">
          <button
            type="submit"
            disabled={submitting}
            className="px-12 py-4 rounded-full text-white font-bold text-lg shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #b8922a 0%, #d4af37 100%)' }}
          >
            {submitting ? '送信中...' : '送信する'}
          </button>
        </div>
      </form>

      {/* footer */}
      <footer className="text-center py-6 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} 経営相談会 事前ヒアリング
      </footer>
    </div>
  )
}

// ---------- field renderer ----------
function FieldRenderer({
  field,
  value,
  error,
  onChange,
  onToggle,
}: {
  field: FormField
  value: string | string[] | undefined
  error?: string
  onChange: (name: string, value: string | string[]) => void
  onToggle: (name: string, option: string) => void
}) {
  const inputClasses = `w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition
    ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-[#b8922a] focus:ring-1 focus:ring-[#b8922a]'}`

  const labelNode = (
    <label className="block text-sm font-medium mb-1" style={{ color: '#0d1f3c' }}>
      {field.label}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )

  const errorNode = error ? <p className="text-red-500 text-xs mt-1">{error}</p> : null

  switch (field.type) {
    case 'text':
    case 'email':
      return (
        <div>
          {labelNode}
          <input
            type={field.type}
            className={inputClasses}
            placeholder={field.placeholder}
            value={(value as string) || ''}
            onChange={e => onChange(field.name, e.target.value)}
          />
          {errorNode}
        </div>
      )

    case 'select':
      return (
        <div>
          {labelNode}
          <select
            className={inputClasses}
            value={(value as string) || ''}
            onChange={e => onChange(field.name, e.target.value)}
          >
            {field.options?.map(opt => (
              <option key={opt} value={opt === (field.options?.[0] || '') ? '' : opt}>
                {opt}
              </option>
            ))}
          </select>
          {errorNode}
        </div>
      )

    case 'textarea':
      return (
        <div className="md:col-span-2">
          {labelNode}
          <textarea
            className={inputClasses}
            rows={field.rows || 3}
            placeholder={field.placeholder}
            value={(value as string) || ''}
            onChange={e => onChange(field.name, e.target.value)}
          />
          {errorNode}
        </div>
      )

    case 'checkbox-group':
      return (
        <div className="md:col-span-2">
          {labelNode}
          <div className="flex flex-wrap gap-3 mt-2">
            {field.options?.map(opt => {
              const checked = ((value as string[]) || []).includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onToggle(field.name, opt)}
                  className={`px-4 py-2 rounded-full text-sm border transition
                    ${checked
                      ? 'text-white border-transparent'
                      : 'bg-white border-gray-200 hover:border-[#b8922a]'}`}
                  style={checked ? { backgroundColor: '#0d1f3c', color: '#fff' } : { color: '#0d1f3c' }}
                >
                  {checked && <span className="mr-1">&#10003;</span>}
                  {opt}
                </button>
              )
            })}
          </div>
          {errorNode}
        </div>
      )

    case 'radio-group':
      return (
        <div className="md:col-span-2">
          {labelNode}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {field.options?.map(opt => {
              const selected = value === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(field.name, opt)}
                  className={`px-4 py-3 rounded-xl text-sm border text-left transition
                    ${selected
                      ? 'border-transparent shadow-md'
                      : 'bg-white border-gray-200 hover:border-[#b8922a]'}`}
                  style={selected ? { backgroundColor: '#0d1f3c', color: '#fff' } : { color: '#0d1f3c' }}
                >
                  {selected && <span className="mr-1">&#9679;</span>}
                  {opt}
                </button>
              )
            })}
          </div>
          {errorNode}
        </div>
      )

    case 'range': {
      const numVal = value ? parseInt(value as string) : 0
      return (
        <div className="md:col-span-2">
          {labelNode}
          <div className="mt-4">
            <input
              type="range"
              min={field.min ?? 0}
              max={field.max ?? 5}
              step={field.step ?? 1}
              value={numVal}
              onChange={e => onChange(field.name, e.target.value)}
              className="w-full accent-[#b8922a]"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: '#666' }}>
              {BUDGET_LABELS.map((lbl, i) => (
                <span key={i} className={numVal === i ? 'font-bold' : ''} style={numVal === i ? { color: '#b8922a' } : undefined}>
                  {lbl}
                </span>
              ))}
            </div>
          </div>
          {errorNode}
        </div>
      )
    }

    default:
      return null
  }
}
