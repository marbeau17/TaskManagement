'use client'

import type { TemplateField } from '@/types/template'
import { useI18n } from '@/hooks/useI18n'

interface Props {
  field: TemplateField
  value: string | number | string[]
  onChange: (value: string | number | string[]) => void
}

const inputClass = `
  w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text1
  bg-surface placeholder:text-text3
  focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
`

export function TemplateFieldRenderer({ field, value, onChange }: Props) {
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
      const selected = field.multiSelect
        ? (Array.isArray(value) ? value : [])
        : value
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-2 mt-1">
            {(field.options ?? []).map((opt) => {
              const isSelected = field.multiSelect
                ? (selected as string[]).includes(opt)
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
      return null
  }
}
