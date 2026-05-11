'use client'

import { Component, type ReactNode } from 'react'
import type { TemplateField } from '@/types/template'
import { useI18n } from '@/hooks/useI18n'

interface Props {
  field: TemplateField
  value: string | number | string[]
  onChange: (value: string | number | string[]) => void
}

// WEB-44: prevent a single broken template field from white-screening the whole task
// form (and dumping all entered data). Reported case: ECサイト運営保守 → モール選択画面
// で選択すると画面が真っ白になる現象。
class TemplateFieldErrorBoundary extends Component<
  { children: ReactNode; fieldLabel: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fieldLabel: string }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    console.error('[WEB-44] Template field render error:', this.props.fieldLabel, error)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-warning bg-warning/5 px-3 py-2 text-[12px] text-warning">
          項目「{this.props.fieldLabel}」の表示でエラーが発生しました。管理者にご連絡ください。
        </div>
      )
    }
    return this.props.children
  }
}

const inputClass = `
  w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text1
  bg-surface placeholder:text-text3
  focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
`

function FieldBody({ field, value, onChange }: Props) {
  const { t } = useI18n()
  const label = (
    <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
      {field.label}
      {field.required && <span className="text-danger"> *</span>}
    </label>
  )

  switch (field.type) {
    case 'text':
      return (
        <div>
          {label}
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={inputClass}
          />
        </div>
      )

    case 'textarea':
      return (
        <div>
          {label}
          <textarea
            rows={3}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`${inputClass} resize-y`}
          />
        </div>
      )

    case 'select':
      return (
        <div>
          {label}
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          >
            <option value="">{t('templates.selectPlaceholder')}</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )

    case 'number':
      return (
        <div>
          {label}
          <input
            type="number"
            value={value !== undefined && value !== '' ? value : ''}
            onChange={(e) => {
              const v = e.target.value
              onChange(v === '' ? '' : Number(v))
            }}
            placeholder={field.placeholder}
            className={inputClass}
          />
        </div>
      )

    case 'url':
      return (
        <div>
          {label}
          <input
            type="url"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? 'https://...'}
            className={inputClass}
          />
        </div>
      )

    case 'multiselect': {
      const selected = Array.isArray(value) ? value : []
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-2 mt-1">
            {(field.options ?? []).map((opt) => {
              const checked = selected.includes(opt)
              return (
                <label
                  key={opt}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] cursor-pointer transition-colors
                    ${checked
                      ? 'bg-mint/10 border-mint text-mint font-semibold'
                      : 'bg-surface border-wf-border text-text2 hover:bg-surf2'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        onChange(selected.filter((s) => s !== opt))
                      } else {
                        onChange([...selected, opt])
                      }
                    }}
                    className="sr-only"
                  />
                  {opt}
                </label>
              )
            })}
          </div>
        </div>
      )
    }

    case 'button_group': {
      // WEB-44: be permissive about value shape — DB-defined templates can serialize
      // value as null, string, number, or array regardless of the multiSelect flag.
      const selected = field.multiSelect
        ? (Array.isArray(value) ? value : [])
        : (Array.isArray(value) ? (value[0] ?? '') : value ?? '')
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-2 mt-1">
            {(field.options ?? []).map((opt) => {
              const isSelected = field.multiSelect
                ? (Array.isArray(selected) ? selected.includes(opt) : false)
                : selected === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (field.multiSelect) {
                      const arr = Array.isArray(value) ? value : []
                      onChange(isSelected ? arr.filter((v: string) => v !== opt) : [...arr, opt])
                    } else {
                      onChange(opt)
                    }
                  }}
                  aria-pressed={isSelected}
                  className={`
                    px-4 py-2 rounded-lg text-[12.5px] font-medium border transition-colors
                    ${isSelected
                      ? 'bg-mint-dd text-white border-mint-dd'
                      : 'bg-surface text-text2 border-wf-border hover:border-mint hover:bg-surf2'
                    }
                  `}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    default:
      // WEB-44: unknown field type — render as plain text input fallback so the form
      // does not silently swallow the field (which previously caused confusion when the
      // DB schema introduced types like "mall_select" before the renderer learned them).
      return (
        <div>
          {label}
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`${field.type} (未対応の型 — テキスト入力)`}
            className={inputClass}
          />
        </div>
      )
  }
}

export function TemplateFieldRenderer(props: Props) {
  return (
    <TemplateFieldErrorBoundary fieldLabel={props.field?.label ?? props.field?.key ?? 'unknown'}>
      <FieldBody {...props} />
    </TemplateFieldErrorBoundary>
  )
}
