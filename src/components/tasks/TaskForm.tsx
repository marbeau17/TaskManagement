'use client'

import { useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { TaskFormStep1 } from '@/types/task'
import type { TaskTemplate } from '@/types/template'
import { useClients } from '@/hooks/useClients'
import { useTasks } from '@/hooks/useTasks'
import { useTemplates } from '@/hooks/useTemplates'
import { useProjects } from '@/hooks/useProjects'
import { TemplateFieldRenderer } from '@/components/tasks/TemplateFieldRenderer'
import { useI18n } from '@/hooks/useI18n'

// ---------------------------------------------------------------------------
// Zod schema for Step 1
// ---------------------------------------------------------------------------

function createStep1Schema(t: (key: string) => string) {
  return z.object({
    client_name: z.string().min(1, t('taskForm.clientNameRequired')),
    title: z.string().min(1, t('taskForm.taskNameRequired')),
    description: z.string().optional(),
    desired_deadline: z.string().optional(),
    reference_url: z.string().optional(),
  })
}

type Step1FormValues = z.infer<ReturnType<typeof createStep1Schema>>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TaskFormProps {
  defaultValues?: Partial<TaskFormStep1>
  onSubmit: (data: TaskFormStep1) => void
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskForm({ defaultValues, onSubmit, onCancel }: TaskFormProps) {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const parentTaskId = searchParams.get('parent') ?? defaultValues?.parent_task_id ?? undefined

  const step1Schema = useMemo(() => createStep1Schema(t), [t])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<Step1FormValues>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      client_name: defaultValues?.client_name ?? '',
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      desired_deadline: defaultValues?.desired_deadline ?? '',
      reference_url: defaultValues?.reference_url ?? '',
    },
    mode: 'onTouched',
  })

  // Project state
  const { data: projectList } = useProjects()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  // Template state
  const { data: templates } = useTemplates()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    defaultValues?.template_id ?? ''
  )
  const [templateData, setTemplateData] = useState<Record<string, any>>(
    defaultValues?.template_data ?? {}
  )

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId || !templates) return null
    return templates.find((t) => t.id === selectedTemplateId) ?? null
  }, [selectedTemplateId, templates])

  const handleTemplateChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value
      setSelectedTemplateId(id)
      setTemplateData({}) // reset template data when switching templates
    },
    []
  )

  const handleTemplateFieldChange = useCallback(
    (key: string, value: string | number | string[]) => {
      setTemplateData((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  // Fetch existing clients for autocomplete suggestions
  const { data: clients } = useClients()

  // Fetch existing tasks for task title suggestions
  const { data: tasks } = useTasks()

  // Deduplicate task titles for suggestions
  const uniqueTaskTitles = useMemo(() => {
    if (!tasks) return []
    const titles = new Set(tasks.map((t) => t.title))
    return Array.from(titles).sort((a, b) => a.localeCompare(b, 'ja'))
  }, [tasks])

  const submit = (values: Step1FormValues) => {
    const data: TaskFormStep1 = {
      client_name: values.client_name,
      title: values.title,
      description: values.description || undefined,
      desired_deadline: values.desired_deadline || undefined,
      reference_url: values.reference_url || undefined,
      template_id: selectedTemplateId || undefined,
      template_data:
        selectedTemplateId && Object.keys(templateData).length > 0
          ? templateData
          : undefined,
      parent_task_id: parentTaskId || undefined,
    }
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {/* Project selector */}
      <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
        <div className="px-6 py-4 border-b border-wf-border">
          <h2 className="text-[15px] font-bold text-text1">
            {t('taskForm.projectSection')}
          </h2>
        </div>
        <div className="px-6 py-5">
          <label
            htmlFor="project_select"
            className="block text-[12.5px] font-semibold text-text2 mb-1.5"
          >
            {t('taskForm.projectLabel')}
          </label>
          <select
            id="project_select"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="
              w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text1
              bg-surface
              focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
            "
          >
            <option value="">{t('taskForm.projectNone')}</option>
            {(projectList ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                [{p.key_prefix}] {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Template selector */}
      <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
        <div className="px-6 py-4 border-b border-wf-border">
          <h2 className="text-[15px] font-bold text-text1">
            {t('taskForm.templateSection')}
          </h2>
        </div>
        <div className="px-6 py-5">
          <label
            htmlFor="template_select"
            className="block text-[12.5px] font-semibold text-text2 mb-1.5"
          >
            {t('taskForm.templateLabel')}
          </label>
          <select
            id="template_select"
            value={selectedTemplateId}
            onChange={handleTemplateChange}
            className="
              w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text1
              bg-surface
              focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
            "
          >
            <option value="">{t('taskForm.templateNone')}</option>
            {(templates ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.category})
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <p className="mt-1.5 text-[11px] text-text3">
              {selectedTemplate.fields.length} {t('taskForm.templateFieldCount')}
            </p>
          )}
        </div>
      </div>

      {/* Card */}
      <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
        {/* Card header */}
        <div className="px-6 py-4 border-b border-wf-border">
          <h2 className="text-[15px] font-bold text-text1">
            {t('taskForm.basicInfoSection')}
          </h2>
        </div>

        {/* Card body */}
        <div className="px-6 py-5 space-y-5">
          {/* Client name */}
          <div>
            <label
              htmlFor="client_name"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              {t('taskForm.clientName')} <span className="text-danger">*</span>
            </label>
            <input
              id="client_name"
              type="text"
              list="client-list"
              autoComplete="off"
              placeholder={t('taskForm.clientPlaceholder')}
              className={`
                w-full rounded-lg border px-3 py-2 text-[13px] text-text1
                bg-surface placeholder:text-text3
                focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
                ${errors.client_name ? 'border-danger' : 'border-wf-border'}
              `}
              {...register('client_name')}
            />
            <datalist id="client-list">
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            {errors.client_name && (
              <p className="mt-1 text-[11px] text-danger">
                {errors.client_name.message}
              </p>
            )}
          </div>

          {/* Task name */}
          <div>
            <label
              htmlFor="title"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              {t('taskForm.taskName')} <span className="text-danger">*</span>
            </label>
            <input
              id="title"
              type="text"
              list="task-title-list"
              autoComplete="off"
              placeholder={t('taskForm.taskPlaceholder')}
              className={`
                w-full rounded-lg border px-3 py-2 text-[13px] text-text1
                bg-surface placeholder:text-text3
                focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
                ${errors.title ? 'border-danger' : 'border-wf-border'}
              `}
              {...register('title')}
            />
            <datalist id="task-title-list">
              {uniqueTaskTitles.map((title) => (
                <option key={title} value={title} />
              ))}
            </datalist>
            {errors.title && (
              <p className="mt-1 text-[11px] text-danger">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              {t('taskForm.description')}
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder={t('taskForm.descriptionPlaceholder')}
              className="
                w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text1
                bg-surface placeholder:text-text3 resize-y
                focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
              "
              {...register('description')}
            />
          </div>

          {/* Desired deadline */}
          <div>
            <label
              htmlFor="desired_deadline"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              {t('taskForm.desiredDeadline')}
            </label>
            <input
              id="desired_deadline"
              type="date"
              className="
                w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text1
                bg-surface
                focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
              "
              {...register('desired_deadline')}
            />
          </div>

          {/* Reference URL */}
          <div>
            <label
              htmlFor="reference_url"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              {t('taskForm.referenceUrl')}
            </label>
            <input
              id="reference_url"
              type="text"
              placeholder="https://..."
              className="
                w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text1
                bg-surface placeholder:text-text3
                focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
              "
              {...register('reference_url')}
            />
          </div>
        </div>
      </div>

      {/* Template fields */}
      {selectedTemplate && selectedTemplate.fields.length > 0 && (
        <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
          <div className="px-6 py-4 border-b border-wf-border">
            <h2 className="text-[15px] font-bold text-text1">
              📑 {selectedTemplate.name} — {t('taskForm.additionalInfo')}
            </h2>
          </div>
          <div className="px-6 py-5 space-y-5">
            {selectedTemplate.fields.map((field) => (
              <TemplateFieldRenderer
                key={field.key}
                field={field}
                value={templateData[field.key] ?? (field.type === 'multiselect' ? [] : '')}
                onChange={(v) => handleTemplateFieldChange(field.key, v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="
            px-5 py-2 rounded-lg text-[13px] font-semibold
            text-text2 bg-surf2 border border-wf-border
            hover:bg-wf-border transition-colors
          "
        >
          {t('taskForm.cancel')}
        </button>
        <button
          type="submit"
          className="
            px-5 py-2 rounded-lg text-[13px] font-semibold
            text-white bg-mint hover:bg-mint-d transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {t('taskForm.submit')}
        </button>
      </div>
    </form>
  )
}
