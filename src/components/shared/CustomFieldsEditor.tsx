'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CustomFieldDefinition, CustomFieldValue } from '@/types/database'
import {
  useFieldDefinitions,
  useFieldValues,
  useUpsertFieldValue,
} from '@/hooks/useCustomFields'
import { useI18n } from '@/hooks/useI18n'

interface CustomFieldsEditorProps {
  projectId: string
  entityType: 'issue' | 'task'
  entityId: string
  readOnly?: boolean
}

export function CustomFieldsEditor({
  projectId,
  entityType,
  entityId,
  readOnly = false,
}: CustomFieldsEditorProps) {
  const { t } = useI18n()
  const { data: definitions, isLoading: defsLoading } =
    useFieldDefinitions(projectId)
  const { data: values, isLoading: valsLoading } =
    useFieldValues(entityType, entityId)
  const upsertValue = useUpsertFieldValue()

  const [localValues, setLocalValues] = useState<Record<string, unknown>>({})

  // Sync fetched values into local state
  useEffect(() => {
    if (values) {
      const map: Record<string, unknown> = {}
      for (const v of values) {
        map[v.field_id] = v.value
      }
      setLocalValues(map)
    }
  }, [values])

  const handleChange = useCallback(
    (fieldId: string, value: unknown) => {
      setLocalValues((prev) => ({ ...prev, [fieldId]: value }))

      // Debounced save on blur instead; for checkboxes save immediately
      const def = definitions?.find((d) => d.id === fieldId)
      if (def?.field_type === 'checkbox') {
        upsertValue.mutate({ entityType, entityId, fieldId, value })
      }
    },
    [definitions, entityType, entityId, upsertValue]
  )

  const handleBlur = useCallback(
    (fieldId: string) => {
      const value = localValues[fieldId]
      upsertValue.mutate({ entityType, entityId, fieldId, value })
    },
    [localValues, entityType, entityId, upsertValue]
  )

  if (defsLoading || valsLoading) {
    return (
      <p className="text-text3 text-[12px]">{t('common.loading')}</p>
    )
  }

  if (!definitions || definitions.length === 0) {
    return null
  }

  return (
    <div className="space-y-[12px]">
      <h4 className="text-[13px] font-semibold text-text">
        {t('customFields.title')}
      </h4>
      {definitions.map((def) => (
        <FieldInput
          key={def.id}
          definition={def}
          value={localValues[def.id]}
          onChange={(val) => handleChange(def.id, val)}
          onBlur={() => handleBlur(def.id)}
          readOnly={readOnly}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual field renderer
// ---------------------------------------------------------------------------

interface FieldInputProps {
  definition: CustomFieldDefinition
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  readOnly: boolean
}

function FieldInput({
  definition,
  value,
  onChange,
  onBlur,
  readOnly,
}: FieldInputProps) {
  const { t } = useI18n()
  const inputClass = `
    w-full h-[32px] px-[8px] rounded-[6px]
    bg-surface border border-wf-border text-text text-[12px]
    placeholder:text-text3 focus:outline-none focus:border-mint
    disabled:opacity-50 disabled:cursor-not-allowed
  `

  const label = (
    <label className="block text-[12px] text-text2 mb-[4px]">
      {definition.name}
      {definition.required && (
        <span className="text-red-500 ml-[2px]">*</span>
      )}
    </label>
  )

  switch (definition.field_type) {
    case 'text':
      return (
        <div>
          {label}
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={readOnly}
            className={inputClass}
          />
        </div>
      )

    case 'number':
      return (
        <div>
          {label}
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) =>
              onChange(e.target.value === '' ? null : Number(e.target.value))
            }
            onBlur={onBlur}
            disabled={readOnly}
            className={inputClass}
          />
        </div>
      )

    case 'date':
      return (
        <div>
          {label}
          <input
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            onBlur={onBlur}
            disabled={readOnly}
            className={inputClass}
          />
        </div>
      )

    case 'select':
      return (
        <div>
          {label}
          <select
            value={(value as string) ?? ''}
            onChange={(e) => {
              onChange(e.target.value || null)
              // Save immediately for selects
            }}
            onBlur={onBlur}
            disabled={readOnly}
            className={inputClass + ' cursor-pointer'}
          >
            <option value="">{t('customFields.selectPlaceholder')}</option>
            {(definition.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )

    case 'checkbox':
      return (
        <div className="flex items-center gap-[8px]">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={readOnly}
            className="h-[16px] w-[16px] accent-mint rounded"
          />
          <span className="text-[12px] text-text2">
            {definition.name}
            {definition.required && (
              <span className="text-red-500 ml-[2px]">*</span>
            )}
          </span>
        </div>
      )

    default:
      return null
  }
}
