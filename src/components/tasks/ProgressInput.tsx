'use client'

import { useState } from 'react'
import type { TaskWithRelations, TaskStatus } from '@/types/database'
import { useUpdateTaskProgress } from '@/hooks/useTasks'
import { StatusChip } from '@/components/shared'

interface ProgressInputProps {
  task: TaskWithRelations
}

const QUICK_PERCENTS = [25, 50, 75, 100] as const
const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'done', label: '完了' },
]

export function ProgressInput({ task }: ProgressInputProps) {
  const [progress, setProgress] = useState(task.progress)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [actualHours, setActualHours] = useState(task.actual_hours)
  const mutation = useUpdateTaskProgress()

  const handleSubmit = () => {
    mutation.mutate({
      taskId: task.id,
      update: { progress, status, actual_hours: actualHours },
    })
  }

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-[13px] font-bold text-text">
          {'📈 進捗・工数入力'}
        </h3>
        <span className="text-[9.5px] px-[7px] py-[1px] rounded-full font-bold border inline-block bg-ok-bg text-ok border-ok-b">
          クリエイター編集可
        </span>
      </div>

      {/* Progress display */}
      <div className="mb-3">
        <div className="flex items-end gap-2 mb-2">
          <span
            className="font-bold text-mint"
            style={{ fontSize: 28, lineHeight: 1 }}
          >
            {progress}
          </span>
          <span className="text-[13px] text-text2 pb-[2px]">%</span>
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="w-full bg-surf2 rounded-full overflow-hidden" style={{ height: 10 }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                backgroundColor: progress >= 100 ? 'var(--color-ok)' : 'var(--color-mint)',
              }}
            />
          </div>
          {/* Tick marks */}
          <div className="flex justify-between mt-1">
            {[0, 25, 50, 75, 100].map((v) => (
              <span key={v} className="text-[9px] text-text3">
                {v}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Quick buttons */}
      <div className="flex gap-2 mb-4">
        {QUICK_PERCENTS.map((pct) => {
          const isActive = progress === pct
          const is100 = pct === 100
          return (
            <button
              key={pct}
              type="button"
              onClick={() => setProgress(pct)}
              className={`
                flex-1 py-[5px] rounded-md text-[12px] font-semibold border transition-colors
                ${
                  is100 && isActive
                    ? 'bg-mint text-white border-mint'
                    : isActive
                      ? 'bg-surface text-mint border-mint-l font-bold border-2'
                      : 'bg-surface text-text2 border-wf-border hover:border-mint-l'
                }
              `}
            >
              {pct}%
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <hr className="border-border2 mb-4" />

      {/* Status radio */}
      <div className="mb-4">
        <span className="text-[12px] text-text2 block mb-2">ステータス</span>
        <div className="flex gap-3">
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <input
                type="radio"
                name="task-status"
                value={opt.value}
                checked={status === opt.value}
                onChange={() => setStatus(opt.value)}
                className="accent-mint w-3.5 h-3.5"
              />
              <StatusChip status={opt.value} size="sm" />
            </label>
          ))}
        </div>
      </div>

      {/* Divider */}
      <hr className="border-border2 mb-4" />

      {/* Actual hours */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[12px] text-text2">実績工数</span>
          {actualHours > 0 && (
            <span className="text-[9px] px-[6px] py-[1px] rounded-full font-bold bg-gold-bg text-gold border border-gold-b">
              手入力済み
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={0.5}
            value={actualHours}
            onChange={(e) => setActualHours(Number(e.target.value))}
            className="w-20 border border-wf-border rounded-md px-2 py-1 text-[13px] text-text bg-surface focus:outline-none focus:border-mint"
          />
          <span className="text-[12px] text-text2">h</span>
        </div>

        {/* Comparison bar */}
        {task.estimated_hours != null && task.estimated_hours > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-text3 mb-1">
              <span>実績 {actualHours}h</span>
              <span>見積 {task.estimated_hours}h</span>
            </div>
            <div className="relative w-full bg-surf2 rounded-full" style={{ height: 8 }}>
              {/* Estimated (background) */}
              <div
                className="absolute h-full rounded-full bg-mint-l opacity-50"
                style={{
                  width: `${Math.min(100, (task.estimated_hours / Math.max(task.estimated_hours, actualHours)) * 100)}%`,
                }}
              />
              {/* Actual (foreground) */}
              <div
                className="absolute h-full rounded-full"
                style={{
                  width: `${Math.min(100, (actualHours / Math.max(task.estimated_hours, actualHours, 1)) * 100)}%`,
                  backgroundColor:
                    actualHours > task.estimated_hours
                      ? 'var(--color-danger)'
                      : 'var(--color-mint)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={mutation.isPending}
        className="w-full py-2 rounded-md text-[13px] font-bold bg-mint text-white hover:bg-mint-d transition-colors disabled:opacity-50"
      >
        {mutation.isPending ? '更新中...' : '更新する'}
      </button>
    </div>
  )
}
