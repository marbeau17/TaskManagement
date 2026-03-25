'use client'

import type { TaskWithRelations } from '@/types/database'
import { useTemplates } from '@/hooks/useTemplates'

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

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

export function TaskDetailInfo({ task }: TaskDetailInfoProps) {
  const { data: templates } = useTemplates()
  const deadline = task.confirmed_deadline ?? task.desired_deadline
  const overdue = task.status !== 'done' && isOverdue(deadline)

  // Resolve template for display
  const template = task.template_id && templates
    ? templates.find((t) => t.id === task.template_id) ?? null
    : null

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      <h3 className="text-[13px] font-bold text-text mb-4">
        {'📋 依頼情報'}
      </h3>

      {/* Client name */}
      <div className="mb-3">
        <span className="text-[12px] text-text2 block mb-1">クライアント</span>
        <span className="text-[13px] font-bold text-text">
          {'🏢 '}{task.client.name}
        </span>
      </div>

      {/* Task name */}
      <div className="mb-3">
        <span className="text-[12px] text-text2 block mb-1">タスク名</span>
        <span className="text-[13px] font-bold text-text">{task.title}</span>
      </div>

      {/* Description */}
      {task.description && (
        <div className="mb-4">
          <span className="text-[12px] text-text2 block mb-1">説明</span>
          <div
            className="bg-surf2 rounded-md p-3 text-[12.5px] text-text whitespace-pre-wrap"
            style={{ lineHeight: 1.8 }}
          >
            {task.description}
          </div>
        </div>
      )}

      {/* Deadlines */}
      <div className="flex gap-6">
        <div>
          <span className="text-[12px] text-text2 block mb-1">希望納期</span>
          <span className="text-[13px] text-text">
            {formatDate(task.desired_deadline)}
          </span>
        </div>
        <div>
          <span className="text-[12px] text-text2 block mb-1">確定納期</span>
          <span
            className={`text-[13px] font-semibold ${overdue ? 'text-danger' : 'text-text'}`}
          >
            {overdue && '🚨 '}
            {formatDate(task.confirmed_deadline)}
          </span>
        </div>
      </div>

      {/* Template data */}
      {template && task.template_data && Object.keys(task.template_data).length > 0 && (
        <div className="mt-4 pt-4 border-t border-wf-border">
          <h4 className="text-[12px] font-bold text-text2 mb-3">
            📑 {template.name} — 追加情報
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
