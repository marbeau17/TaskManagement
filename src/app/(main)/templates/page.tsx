'use client'

import { useState, useCallback } from 'react'
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from '@/hooks/useTemplates'
import { useI18n } from '@/hooks/useI18n'
import { usePermission } from '@/hooks/usePermission'
import type { TaskTemplate, TemplateField } from '@/types/template'

// ---------------------------------------------------------------------------
// Blank field factory
// ---------------------------------------------------------------------------

function blankField(): TemplateField {
  return {
    key: `field_${Date.now()}`,
    label: '',
    type: 'text',
    required: false,
  }
}

// ---------------------------------------------------------------------------
// Template editor (inline)
// ---------------------------------------------------------------------------

interface EditorProps {
  initial?: TaskTemplate | null
  onSave: (data: { name: string; category: string; fields: TemplateField[] }) => void
  onCancel: () => void
  isSaving: boolean
}

function TemplateEditor({ initial, onSave, onCancel, isSaving }: EditorProps) {
  const { t } = useI18n()
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [fields, setFields] = useState<TemplateField[]>(
    initial?.fields ? initial.fields.map((f) => ({ ...f })) : [blankField()]
  )

  const fieldTypeOptions: { value: TemplateField['type']; labelKey: string }[] = [
    { value: 'text', labelKey: 'templates.fieldTypeText' },
    { value: 'textarea', labelKey: 'templates.fieldTypeTextarea' },
    { value: 'select', labelKey: 'templates.fieldTypeSelect' },
    { value: 'number', labelKey: 'templates.fieldTypeNumber' },
    { value: 'url', labelKey: 'templates.fieldTypeUrl' },
    { value: 'multiselect', labelKey: 'templates.fieldTypeMultiselect' },
    { value: 'button_group', labelKey: 'templates.fieldTypeButtonGroup' },
  ]

  const addField = () => setFields((prev) => [...prev, blankField()])

  const removeField = (index: number) =>
    setFields((prev) => prev.filter((_, i) => i !== index))

  const updateField = (index: number, patch: Partial<TemplateField>) =>
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
    )

  const moveField = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= fields.length) return
    setFields((prev) => {
      const copy = [...prev]
      ;[copy[index], copy[target]] = [copy[target], copy[index]]
      return copy
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !category.trim()) return
    // Generate stable keys from labels
    const processed = fields.map((f, i) => ({
      ...f,
      key: f.label
        ? f.label
            .toLowerCase()
            .replace(/[^a-z0-9ぁ-んァ-ヶ亜-熙]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '') || `field_${i}`
        : `field_${i}`,
    }))
    onSave({ name: name.trim(), category: category.trim(), fields: processed })
  }

  const inputClass =
    'w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text1 bg-surface placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint'

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-wf-border shadow-sm">
      <div className="px-6 py-4 border-b border-wf-border">
        <h2 className="text-[15px] font-bold text-text1">
          {initial ? t('templates.edit') : t('templates.create')}
        </h2>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
            {t('templates.name')} <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('templates.namePlaceholder')}
            className={inputClass}
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
            {t('templates.category')} <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={t('templates.categoryPlaceholder')}
            className={inputClass}
            required
          />
        </div>

        {/* Fields */}
        <div>
          <label className="block text-[12.5px] font-semibold text-text2 mb-2">
            {t('templates.fieldList')}
          </label>
          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div
                key={idx}
                className="bg-surf2 rounded-lg border border-wf-border p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-text3 font-bold w-6 text-center">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(idx, { label: e.target.value })}
                    placeholder={t('templates.fieldName')}
                    className={`flex-1 ${inputClass}`}
                  />
                  <select
                    value={field.type}
                    onChange={(e) =>
                      updateField(idx, { type: e.target.value as TemplateField['type'] })
                    }
                    className={`w-[140px] ${inputClass}`}
                  >
                    {fieldTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-[11px] text-text2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={field.required ?? false}
                      onChange={(e) => updateField(idx, { required: e.target.checked })}
                      className="rounded border-wf-border"
                    />
                    {t('templates.fieldRequired')}
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveField(idx, -1)}
                      disabled={idx === 0}
                      className="px-1.5 py-0.5 rounded text-[11px] text-text3 hover:bg-wf-border disabled:opacity-30 transition-colors"
                      title={t('templates.moveUp')}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(idx, 1)}
                      disabled={idx === fields.length - 1}
                      className="px-1.5 py-0.5 rounded text-[11px] text-text3 hover:bg-wf-border disabled:opacity-30 transition-colors"
                      title={t('templates.moveDown')}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="px-2 py-0.5 rounded text-[11px] text-danger hover:bg-danger/10 transition-colors"
                    title={t('templates.removeField')}
                  >
                    ✕
                  </button>
                </div>

                {/* Options for select / multiselect */}
                {(field.type === 'select' || field.type === 'multiselect' || field.type === 'button_group') && (
                  <div>
                    <label className="block text-[11px] text-text3 mb-1">
                      {t('templates.selectOptions')}
                    </label>
                    <input
                      type="text"
                      value={(field.options ?? []).join(', ')}
                      onChange={(e) =>
                        updateField(idx, {
                          options: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder={t('templates.selectOptionsPlaceholder')}
                      className={inputClass}
                    />
                  </div>
                )}

                {/* Placeholder */}
                <div>
                  <label className="block text-[11px] text-text3 mb-1">
                    {t('templates.placeholder')}
                  </label>
                  <input
                    type="text"
                    value={field.placeholder ?? ''}
                    onChange={(e) => updateField(idx, { placeholder: e.target.value || undefined })}
                    placeholder={t('templates.placeholderExample')}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addField}
            className="
              mt-3 px-4 py-2 rounded-lg text-[12.5px] font-semibold
              text-mint bg-mint/10 border border-mint/20
              hover:bg-mint/20 transition-colors
            "
          >
            {t('templates.addField')}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-wf-border flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="
            px-5 py-2 rounded-lg text-[13px] font-semibold
            text-text2 bg-surf2 border border-wf-border
            hover:bg-wf-border transition-colors
          "
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSaving || !name.trim() || !category.trim()}
          className="
            px-5 py-2 rounded-lg text-[13px] font-semibold
            text-white bg-mint hover:bg-mint-d transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isSaving ? t('templates.saving') : t('common.save')}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Template card
// ---------------------------------------------------------------------------

interface CardProps {
  template: TaskTemplate
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
  canDelete: boolean
}

function TemplateCard({ template, onEdit, onDelete, canEdit, canDelete }: CardProps) {
  const { t } = useI18n()
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="bg-surface rounded-xl border border-wf-border shadow-sm p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-bold text-text1">{template.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-block px-2 py-0.5 rounded bg-mint/10 text-mint text-[11px] font-semibold">
              {template.category}
            </span>
            {template.is_default && (
              <span className="inline-block px-2 py-0.5 rounded bg-info-bg text-info text-[11px] font-semibold">
                {t('templates.default')}
              </span>
            )}
          </div>
        </div>
        <span className="text-[12px] text-text3">
          {template.fields.length} {t('templates.fieldCount')}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {template.fields.map((f) => (
          <span
            key={f.key}
            className="inline-block px-2 py-0.5 rounded bg-surf2 text-text2 text-[11px]"
          >
            {f.label}
            {f.required && <span className="text-danger ml-0.5">*</span>}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-2">
        {canEdit && (
          <button
            onClick={onEdit}
            className="
              px-3 py-1.5 rounded-lg text-[12px] font-semibold
              text-text2 bg-surf2 border border-wf-border
              hover:bg-wf-border transition-colors
            "
          >
            {t('common.edit')}
          </button>
        )}
        {canDelete && !template.is_default && (
          <>
            {showConfirm ? (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-danger">{t('templates.deleteConfirm')}</span>
                <button
                  onClick={onDelete}
                  className="px-2 py-1 rounded text-[11px] font-semibold text-white bg-danger hover:bg-danger/80 transition-colors"
                >
                  {t('common.delete')}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-2 py-1 rounded text-[11px] text-text3 hover:bg-surf2 transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                className="
                  px-3 py-1.5 rounded-lg text-[12px] font-semibold
                  text-danger bg-danger/5 border border-danger/20
                  hover:bg-danger/10 transition-colors
                "
              >
                {t('common.delete')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function TemplatesPage() {
  const { t } = useI18n()
  const { can } = usePermission()
  const { data: templates, isLoading } = useTemplates()
  const createMutation = useCreateTemplate()
  const updateMutation = useUpdateTemplate()
  const deleteMutation = useDeleteTemplate()

  const [editorMode, setEditorMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)

  const handleCreate = useCallback(() => {
    setEditingTemplate(null)
    setEditorMode('create')
  }, [])

  const handleEdit = useCallback((template: TaskTemplate) => {
    setEditingTemplate(template)
    setEditorMode('edit')
  }, [])

  const handleCancel = useCallback(() => {
    setEditorMode('closed')
    setEditingTemplate(null)
  }, [])

  const handleSave = useCallback(
    async (data: { name: string; category: string; fields: TemplateField[] }) => {
      if (editorMode === 'edit' && editingTemplate) {
        await updateMutation.mutateAsync({
          id: editingTemplate.id,
          data: { name: data.name, category: data.category, fields: data.fields },
        })
      } else {
        await createMutation.mutateAsync(data)
      }
      setEditorMode('closed')
      setEditingTemplate(null)
    },
    [editorMode, editingTemplate, createMutation, updateMutation]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id)
    },
    [deleteMutation]
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Topbar */}
      <div className="bg-surface border-b border-wf-border shrink-0">
        <div className="max-w-[960px] mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-[16px] font-bold text-text1">
            {t('templates.title')}
          </h1>
          {editorMode === 'closed' && can('templates', 'create') && (
            <button
              onClick={handleCreate}
              className="
                px-4 py-2 rounded-lg text-[13px] font-semibold
                text-white bg-mint hover:bg-mint-d transition-colors
              "
            >
              {t('templates.createNew')}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[960px] mx-auto px-6 py-8">
          {/* Editor */}
          {editorMode !== 'closed' && (
            <div className="mb-8">
              <TemplateEditor
                initial={editingTemplate}
                onSave={handleSave}
                onCancel={handleCancel}
                isSaving={createMutation.isPending || updateMutation.isPending}
              />
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-12 text-[14px] text-text3">
              {t('common.loading')}
            </div>
          )}

          {/* Template cards grid */}
          {!isLoading && templates && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tmpl) => (
                <TemplateCard
                  key={tmpl.id}
                  template={tmpl}
                  onEdit={() => handleEdit(tmpl)}
                  onDelete={() => handleDelete(tmpl.id)}
                  canEdit={can('templates', 'update')}
                  canDelete={can('templates', 'delete')}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && templates && templates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[14px] text-text3 mb-4">
                {t('templates.empty')}
              </p>
              <button
                onClick={handleCreate}
                className="
                  px-5 py-2 rounded-lg text-[13px] font-semibold
                  text-white bg-mint hover:bg-mint-d transition-colors
                "
              >
                {t('templates.createNew')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
