'use client'

import type { TaskWithRelations } from '@/types/database'

interface TaskDetailInfoProps {
  task: TaskWithRelations
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
  const deadline = task.confirmed_deadline ?? task.desired_deadline
  const overdue = task.status !== 'done' && isOverdue(deadline)

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
    </div>
  )
}
