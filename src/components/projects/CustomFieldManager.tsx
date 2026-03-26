'use client'

import { useState } from 'react'
import type {
  CustomFieldDefinition,
  CustomFieldType,
  CreateCustomFieldDefinition,
} from '@/types/database'
import {
  useFieldDefinitions,
  useCreateFieldDefinition,
  useUpdateFieldDefinition,
  useDeleteFieldDefinition,
  useReorderFieldDefinitions,
} from '@/hooks/useCustomFields'
import { useI18n } from '@/hooks/useI18n'

interface CustomFieldManagerProps {
  projectId: string
}

const FIELD_TYPES: CustomFieldType[] = [
  'text',
  'number',
  'select',
  'date',
  'checkbox',
]

export function CustomFieldManager({ projectId }: CustomFieldManagerProps) {
  const { t } = useI18n()
  const { data: definitions, isLoading } = useFieldDefinitions(projectId)
  const createField = useCreateFieldDefinition()
  const updateField = useUpdateFieldDefinition()
  const deleteField = useDeleteFieldDefinition()
  const reorderFields = useReorderFieldDefinitions()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    field_type: CustomFieldType
    options: string
    required: boolean
  }>({
    name: '',
    field_type: 'text',
    options: '',
    required: false,
  })

  const resetForm = () => {
    setFormData({ name: '', field_type: 'text', options: '', required: false })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (def: CustomFieldDefinition) => {
    setFormData({
      name: def.name,
      field_type: def.field_type,
      options: (def.options ?? []).join(', '),
      required: def.required,
    })
    setEditingId(def.id)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) return

    const options =
      formData.field_type === 'select'
        ? formData.options
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : []

    if (editingId) {
      await updateField.mutateAsync({
        id: editingId,
        projectId,
        data: {
          name: formData.name.trim(),
          field_type: formData.field_type,
          options,
          required: formData.required,
        },
      })
    } else {
      const nextOrder = (definitions?.length ?? 0)
      await createField.mutateAsync({
        project_id: projectId,
        name: formData.name.trim(),
        field_type: formData.field_type,
        options,
        required: formData.required,
        sort_order: nextOrder,
      })
    }
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('customFields.confirmDelete'))) return
    await deleteField.mutateAsync({ id, projectId })
  }

  const handleMoveUp = (index: number) => {
    if (!definitions || index === 0) return
    const ids = definitions.map((d) => d.id)
    ;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
    reorderFields.mutate({ orderedIds: ids, projectId })
  }

  const handleMoveDown = (index: number) => {
    if (!definitions || index >= definitions.length - 1) return
    const ids = definitions.map((d) => d.id)
    ;[ids[index], ids[index + 1]] = [ids[index + 1], ids[index]]
    reorderFields.mutate({ orderedIds: ids, projectId })
  }

  const inputClass = `
    h-[32px] px-[8px] rounded-[6px]
    bg-surface border border-wf-border text-text text-[12px]
    placeholder:text-text3 focus:outline-none focus:border-mint
  `

  if (isLoading) {
    return <p className="text-text3 text-[12px]">{t('common.loading')}</p>
  }

  return (
    <div className="space-y-[16px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-text">
          {t('customFields.manageTitle')}
        </h3>
        {!showForm && (
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="
              h-[32px] px-[12px] rounded-[6px]
              bg-mint text-white text-[12px] font-medium
              hover:opacity-90 transition-opacity
            "
          >
            {t('customFields.addField')}
          </button>
        )}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="p-[16px] rounded-[8px] bg-surface border border-wf-border space-y-[12px]">
          <div className="grid grid-cols-2 gap-[12px]">
            <div>
              <label className="block text-[12px] text-text2 mb-[4px]">
                {t('customFields.fieldName')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                placeholder={t('customFields.fieldNamePlaceholder')}
                className={inputClass + ' w-full'}
              />
            </div>
            <div>
              <label className="block text-[12px] text-text2 mb-[4px]">
                {t('customFields.fieldType')}
              </label>
              <select
                value={formData.field_type}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    field_type: e.target.value as CustomFieldType,
                  }))
                }
                className={inputClass + ' w-full cursor-pointer'}
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {t(`customFields.type.${ft}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.field_type === 'select' && (
            <div>
              <label className="block text-[12px] text-text2 mb-[4px]">
                {t('customFields.options')}
              </label>
              <input
                type="text"
                value={formData.options}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, options: e.target.value }))
                }
                placeholder={t('customFields.optionsPlaceholder')}
                className={inputClass + ' w-full'}
              />
            </div>
          )}

          <div className="flex items-center gap-[8px]">
            <input
              type="checkbox"
              checked={formData.required}
              onChange={(e) =>
                setFormData((p) => ({ ...p, required: e.target.checked }))
              }
              className="h-[16px] w-[16px] accent-mint"
            />
            <span className="text-[12px] text-text2">
              {t('customFields.required')}
            </span>
          </div>

          <div className="flex gap-[8px]">
            <button
              onClick={handleSubmit}
              disabled={!formData.name.trim()}
              className="
                h-[32px] px-[12px] rounded-[6px]
                bg-mint text-white text-[12px] font-medium
                hover:opacity-90 transition-opacity
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {editingId ? t('common.save') : t('common.add')}
            </button>
            <button
              onClick={resetForm}
              className="
                h-[32px] px-[12px] rounded-[6px]
                bg-surface border border-wf-border text-text text-[12px]
                hover:bg-wf-border/30 transition-colors
              "
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Field list */}
      {definitions && definitions.length > 0 ? (
        <div className="space-y-[4px]">
          {definitions.map((def, index) => (
            <div
              key={def.id}
              className="
                flex items-center justify-between p-[12px]
                rounded-[6px] bg-surface border border-wf-border
              "
            >
              <div className="flex items-center gap-[12px]">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-[2px]">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="text-[10px] text-text3 hover:text-text disabled:opacity-30"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === definitions.length - 1}
                    className="text-[10px] text-text3 hover:text-text disabled:opacity-30"
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>

                <div>
                  <span className="text-[13px] text-text font-medium">
                    {def.name}
                  </span>
                  <span className="ml-[8px] text-[11px] text-text3">
                    {t(`customFields.type.${def.field_type}`)}
                    {def.required && ` (${t('customFields.required')})`}
                  </span>
                  {def.field_type === 'select' &&
                    def.options &&
                    def.options.length > 0 && (
                      <span className="ml-[8px] text-[11px] text-text3">
                        [{def.options.join(', ')}]
                      </span>
                    )}
                </div>
              </div>

              <div className="flex items-center gap-[6px]">
                <button
                  onClick={() => handleEdit(def)}
                  className="
                    h-[28px] px-[8px] rounded-[4px]
                    text-[11px] text-text2
                    hover:bg-wf-border/30 transition-colors
                  "
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => handleDelete(def.id)}
                  className="
                    h-[28px] px-[8px] rounded-[4px]
                    text-[11px] text-red-500
                    hover:bg-red-500/10 transition-colors
                  "
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <p className="text-[12px] text-text3">
            {t('customFields.noFields')}
          </p>
        )
      )}
    </div>
  )
}
