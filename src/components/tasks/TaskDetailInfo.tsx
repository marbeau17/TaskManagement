'use client'

import { useState } from 'react'
import type { TaskWithRelations } from '@/types/database'
import { useTemplates } from '@/hooks/useTemplates'
import { useI18n } from '@/hooks/useI18n'
import { useUpdateTask } from '@/hooks/useTasks'
import { useClients } from '@/hooks/useClients'
import { useProjects } from '@/hooks/useProjects'
import { DateInput } from '@/components/shared'

interface TaskDetailInfoProps {
  task: TaskWithRelations & {
    template_id?: string | null
    template_data?: Record<string, any> | null
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function toInputDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

/** Inline editable text field */
function EditableText({
  value,
  onSave,
  multiline,
  className,
}: {
  value: string
  onSave: (val: string) => void
  multiline?: boolean
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const handleStart = () => {
    setDraft(value)
    setEditing(true)
  }

  const handleSave = () => {
    setEditing(false)
    if (draft.trim() !== value) {
      onSave(draft.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      handleSave()
    }
    if (e.key === 'Escape') {
      setDraft(value)
      setEditing(false)
    }
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          rows={4}
          className="w-full text-[12.5px] text-text bg-surface border border-mint rounded-md px-3 py-2 resize-y focus:outline-none"
          style={{ lineHeight: 1.8 }}
        />
      )
    }
    return (
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className={`text-text bg-surface border border-mint rounded-md px-2 py-1 focus:outline-none ${className ?? 'text-[13px] font-bold w-full'}`}
      />
    )
  }

  return (
    <span
      onClick={handleStart}
      className={`cursor-pointer hover:bg-surf2 rounded px-1 -mx-1 transition-colors ${className ?? ''}`}
      title="Click to edit"
    >
      {value || '-'}
    </span>
  )
}

export function TaskDetailInfo({ task }: TaskDetailInfoProps) {
  const { t } = useI18n()
  const { data: templates } = useTemplates()
  const { data: clients } = useClients()
  const { data: projects } = useProjects()
  const updateTask = useUpdateTask()
  const deadline = task.confirmed_deadline ?? task.desired_deadline
  const overdue = task.status !== 'done' && isOverdue(deadline)

  const [editingClient, setEditingClient] = useState(false)
  const [editingProject, setEditingProject] = useState(false)
  const [localProjectId, setLocalProjectId] = useState<string | null>(task.project_id ?? null)

  const template = task.template_id && templates
    ? templates.find((t) => t.id === task.template_id) ?? null
    : null

  const handleSave = (field: string, value: any) => {
    updateTask.mutate({ taskId: task.id, data: { [field]: value || null } })
  }

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      <h3 className="text-[13px] font-bold text-text mb-4">
        {t('taskDetailInfo.title')}
      </h3>

      {/* Client name */}
      <div className="mb-3">
        <span className="text-[12px] text-text2 block mb-1">{t('taskDetailInfo.client')}</span>
        {editingClient ? (
          <select
            value={task.client_id}
            onChange={(e) => {
              handleSave('client_id', e.target.value)
              setEditingClient(false)
            }}
            onBlur={() => setEditingClient(false)}
            autoFocus
            className="text-[13px] text-text bg-surface border border-mint rounded-md px-2 py-1 focus:outline-none w-full"
          >
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        ) : (
          <span
            onClick={() => setEditingClient(true)}
            className="text-[13px] font-bold text-text cursor-pointer hover:bg-surf2 rounded px-1 -mx-1 transition-colors inline-block"
            title="Click to edit"
          >
            {'🏢 '}{task.client.name}
          </span>
        )}
      </div>

      {/* Project name */}
      <div className="mb-3">
        <span className="text-[12px] text-text2 block mb-1">{t('taskDetailInfo.project')}</span>
        {editingProject ? (
          <select
            value={localProjectId ?? ''}
            onChange={(e) => {
              const newId = e.target.value || null
              setLocalProjectId(newId)
              handleSave('project_id', newId)
              setEditingProject(false)
            }}
            onBlur={() => setEditingProject(false)}
            autoFocus
            className="text-[13px] text-text bg-surface border border-mint rounded-md px-2 py-1 focus:outline-none w-full"
          >
            <option value="">{t('common.none')}</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : (
          <span
            onClick={() => setEditingProject(true)}
            className="text-[13px] font-bold text-text cursor-pointer hover:bg-surf2 rounded px-1 -mx-1 transition-colors inline-block"
            title="Click to edit"
          >
            {'📁 '}{(localProjectId ? projects?.find(p => p.id === localProjectId)?.name : null) ?? t('common.none')}
          </span>
        )}
      </div>

      {/* Task name */}
      <div className="mb-3">
        <span className="text-[12px] text-text2 block mb-1">{t('taskDetailInfo.taskName')}</span>
        <EditableText
          value={task.title}
          onSave={(val) => handleSave('title', val)}
          className="text-[13px] font-bold"
        />
      </div>

      {/* Description */}
      <div className="mb-4">
        <span className="text-[12px] text-text2 block mb-1">{t('taskDetailInfo.description')}</span>
        <EditableText
          value={task.description ?? ''}
          onSave={(val) => handleSave('description', val)}
          multiline
          className="text-[12.5px]"
        />
      </div>

      {/* Start date + Deadlines */}
      <div className="flex gap-6 flex-wrap">
        <div>
          <span className="text-[12px] text-text2 block mb-1">{t('taskDetailInfo.startDate')}</span>
          <DateInput
            value={toInputDate(task.start_date)}
            onChange={(e) => handleSave('start_date', e.target.value || null)}
            className={`text-[13px] text-text bg-surface border rounded-md px-2 py-1 focus:outline-none focus:border-mint cursor-pointer ${!task.start_date ? 'border-danger bg-danger/5' : 'border-wf-border'}`}
          />
          {!task.start_date && (
            <span className="text-[11px] text-danger block mt-1">⚠ {t('taskDetailInfo.startDateRequired')}</span>
          )}
        </div>
        <div>
          <span className="text-[12px] text-text2 block mb-1">{t('taskDetailInfo.desiredDeadline')}</span>
          <DateInput
            value={toInputDate(task.desired_deadline)}
            onChange={(e) => handleSave('desired_deadline', e.target.value || null)}
            className="text-[13px] text-text bg-surface border border-wf-border rounded-md px-2 py-1 focus:outline-none focus:border-mint cursor-pointer"
          />
        </div>
        <div>
          <span className="text-[12px] text-text2 block mb-1">{t('taskDetailInfo.confirmedDeadline')}</span>
          <div className="flex items-center gap-1">
            {overdue && <span>🚨</span>}
            <DateInput
              value={toInputDate(task.confirmed_deadline)}
              onChange={(e) => handleSave('confirmed_deadline', e.target.value || null)}
              className={`text-[13px] font-semibold bg-surface border border-wf-border rounded-md px-2 py-1 focus:outline-none focus:border-mint cursor-pointer ${overdue ? 'text-danger' : 'text-text'}`}
            />
          </div>
        </div>
      </div>

      {/* Priority and Weekly Hours */}
      <div className="flex gap-6 mt-4">
        <div>
          <span className="text-[12px] text-text2 block mb-1">{t('taskDetailInfo.priority')}</span>
          <select
            value={task.priority ?? 3}
            onChange={(e) => handleSave('priority', Number(e.target.value))}
            className="text-[13px] text-text bg-surface border border-wf-border rounded-md px-2 py-1 focus:outline-none focus:border-mint cursor-pointer"
          >
            <option value={1}>1 - {t('taskDetailInfo.priorityHigh')}</option>
            <option value={2}>2</option>
            <option value={3}>3 - {t('taskDetailInfo.priorityMedium')}</option>
            <option value={4}>4</option>
            <option value={5}>5 - {t('taskDetailInfo.priorityLow')}</option>
          </select>
        </div>
        <div>
          <span className="text-[12px] text-text2 block mb-1">{t('taskDetailInfo.plannedHoursPerWeek')}</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={40}
              step={0.5}
              defaultValue={task.planned_hours_per_week ?? 0}
              key={`phw-${task.id}-${task.planned_hours_per_week}`}
              onBlur={(e) => {
                const val = Number(e.target.value)
                if (val !== (task.planned_hours_per_week ?? 0)) {
                  handleSave('planned_hours_per_week', val)
                }
              }}
              className="w-20 text-[13px] text-text bg-surface border border-wf-border rounded-md px-2 py-1 focus:outline-none focus:border-mint"
            />
            <span className="text-[12px] text-text2">{t('taskDetailInfo.hoursPerWeek')}</span>
          </div>
        </div>
      </div>

      {/* Template data */}
      {template && task.template_data && Object.keys(task.template_data).length > 0 && (
        <div className="mt-4 pt-4 border-t border-wf-border">
          <h4 className="text-[12px] font-bold text-text2 mb-3">
            📑 {template.name} — {t('taskDetailInfo.additionalInfo')}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {template.fields.map((field) => {
              const val = task.template_data?.[field.key]
              if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) return null
              return (
                <div key={field.key} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                  <span className="text-[11px] text-text3 block mb-0.5">{field.label}</span>
                  {field.type === 'textarea' ? (
                    <div className="bg-surf2 rounded-md p-2 text-[12px] text-text whitespace-pre-wrap">
                      {String(val)}
                    </div>
                  ) : field.type === 'multiselect' && Array.isArray(val) ? (
                    <div className="flex flex-wrap gap-1">
                      {val.map((v: string) => (
                        <span
                          key={v}
                          className="inline-block px-2 py-0.5 rounded bg-mint/10 text-mint text-[11px] font-medium"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[12.5px] text-text font-medium">
                      {String(val)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
