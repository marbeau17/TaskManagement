'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSubtasks, useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import { useMembers } from '@/hooks/useMembers'
import type { TaskWithRelations, Task } from '@/types/database'
import { Avatar, ProgressBar, StatusChip } from '@/components/shared'
import { useI18n } from '@/hooks/useI18n'
import { AlertTriangle, Clock, CheckCircle, ChevronDown, ChevronUp, Plus, Users } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubtaskListProps {
  parentTask: TaskWithRelations
}

interface WorkSplitStats {
  totalEstimated: number
  totalActual: number
  parentEstimated: number
  weightedProgress: number
  completedCount: number
  totalCount: number
  remainingHours: number
  assigneeBreakdown: { name: string; hours: number; percentage: number; color: string }[]
  alerts: { type: 'over' | 'unassigned' | 'deadline' | 'workload'; message: string }[]
}

// ---------------------------------------------------------------------------
// Work Split Summary Card
// ---------------------------------------------------------------------------

function WorkSplitSummary({ stats, t }: { stats: WorkSplitStats; t: (k: string) => string }) {
  const balanceOk = Math.abs(stats.totalEstimated - stats.parentEstimated) <= 1
  const overEstimate = stats.totalEstimated > stats.parentEstimated

  return (
    <div className="bg-surf2/50 rounded-[10px] border border-border2 p-[12px] mb-[12px]">
      {/* Header stats */}
      <div className="flex items-center gap-[16px] mb-[8px] flex-wrap">
        <div className="flex items-center gap-[4px]">
          <span className="text-[10px] text-text3">{t('subtask.totalEstimated')}:</span>
          <span className={`text-[12px] font-bold ${overEstimate ? 'text-danger' : 'text-text'}`}>
            {stats.totalEstimated}h / {stats.parentEstimated}h
          </span>
          {balanceOk && <CheckCircle className="w-[12px] h-[12px] text-emerald-500" />}
          {overEstimate && <AlertTriangle className="w-[12px] h-[12px] text-danger" />}
        </div>
        <div className="flex items-center gap-[4px]">
          <span className="text-[10px] text-text3">{t('subtask.progress')}:</span>
          <span className="text-[12px] font-bold text-text">{stats.weightedProgress}%</span>
        </div>
        <div className="flex items-center gap-[4px]">
          <span className="text-[10px] text-text3">{t('subtask.completed')}:</span>
          <span className="text-[12px] font-bold text-text">{stats.completedCount}/{stats.totalCount}</span>
        </div>
        <div className="flex items-center gap-[4px]">
          <Clock className="w-[10px] h-[10px] text-text3" />
          <span className="text-[10px] text-text3">{t('subtask.remaining')}:</span>
          <span className="text-[12px] font-bold text-text">{stats.remainingHours.toFixed(1)}h</span>
        </div>
      </div>

      {/* Hour distribution bar */}
      {stats.totalEstimated > 0 && (
        <div className="flex rounded-full h-[16px] overflow-hidden mb-[8px]">
          {stats.assigneeBreakdown.map((a, i) => (
            <div
              key={i}
              className={`${a.color} flex items-center justify-center`}
              style={{ width: `${Math.max(5, a.percentage)}%` }}
              title={`${a.name}: ${a.hours}h (${a.percentage}%)`}
            >
              {a.percentage >= 15 && (
                <span className="text-[8px] text-white font-bold truncate px-[2px]">{a.name}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assignee legend */}
      <div className="flex flex-wrap gap-[8px]">
        {stats.assigneeBreakdown.map((a, i) => (
          <div key={i} className="flex items-center gap-[4px]">
            <div className={`w-[8px] h-[8px] rounded-full ${a.color}`} />
            <span className="text-[10px] text-text2">{a.name}: {a.hours}h ({a.percentage}%)</span>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {stats.alerts.length > 0 && (
        <div className="mt-[8px] space-y-[4px]">
          {stats.alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-[6px] text-[10px] ${alert.type === 'over' ? 'text-danger' : 'text-warn'}`}>
              <AlertTriangle className="w-[10px] h-[10px] shrink-0" />
              {alert.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Subtask Form (expanded)
// ---------------------------------------------------------------------------

const ASSIGNEE_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500']

function AddSubtaskForm({
  parentTask,
  onClose,
}: {
  parentTask: TaskWithRelations
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [estimatedHours, setEstimatedHours] = useState<number | ''>('')
  const [deadline, setDeadline] = useState(parentTask.confirmed_deadline ?? parentTask.desired_deadline ?? '')
  const [priority, setPriority] = useState(parentTask.priority ?? 3)
  const [description, setDescription] = useState('')
  const [expanded, setExpanded] = useState(false)
  const createTask = useCreateTask()
  const { data: members } = useMembers()
  const { t } = useI18n()

  const activeMembers = (members ?? []).filter(m => m.is_active)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    await createTask.mutateAsync({
      step1: {
        client_name: parentTask.client?.name ?? '',
        title: title.trim(),
        parent_task_id: parentTask.id,
        wbs_code: '',
        description: description || undefined,
      },
      step2: assigneeId ? {
        assigned_to: assigneeId,
        confirmed_deadline: deadline || parentTask.confirmed_deadline || parentTask.desired_deadline || '',
        estimated_hours: typeof estimatedHours === 'number' ? estimatedHours : 0,
      } : undefined,
    })
    setTitle('')
    setAssigneeId('')
    setEstimatedHours('')
    setDescription('')
    onClose()
  }

  const inputClass = 'rounded-lg border border-wf-border px-3 py-1.5 text-[12px] text-text1 bg-surface placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint'

  return (
    <form onSubmit={handleSubmit} className="mt-[10px] bg-surf2/30 rounded-[10px] border border-border2 p-[12px] space-y-[8px]">
      {/* Row 1: Title + Assignee */}
      <div className="flex items-center gap-[8px]">
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('subtask.placeholder')} autoFocus className={`flex-1 ${inputClass}`} />
        <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className={`w-[140px] ${inputClass}`}>
          <option value="">{t('assign.selectPlaceholder')}</option>
          {activeMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* Row 2: Hours + Deadline */}
      <div className="flex items-center gap-[8px]">
        <div className="flex items-center gap-[4px]">
          <Clock className="w-[12px] h-[12px] text-text3" />
          <input type="number" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder={t('subtask.hours')} min="0.5" step="0.5" className={`w-[80px] ${inputClass}`} />
          <span className="text-[10px] text-text3">h</span>
        </div>
        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={`w-[140px] ${inputClass}`} />
        <select value={priority} onChange={e => setPriority(parseInt(e.target.value))} className={`w-[70px] ${inputClass}`}>
          {[1,2,3,4,5].map(p => <option key={p} value={p}>P{p}</option>)}
        </select>
        <button type="button" onClick={() => setExpanded(!expanded)} className="text-[10px] text-mint-dd hover:underline">
          {expanded ? <ChevronUp className="w-[14px] h-[14px]" /> : <ChevronDown className="w-[14px] h-[14px]" />}
        </button>
      </div>

      {/* Row 3: Description (expandable) */}
      {expanded && (
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t('subtask.description')} rows={2} className={`w-full ${inputClass} resize-y`} />
      )}

      {/* Actions */}
      <div className="flex items-center gap-[8px]">
        <button type="submit" disabled={!title.trim() || createTask.isPending} className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-mint hover:bg-mint-d transition-colors disabled:opacity-50">
          {createTask.isPending ? '...' : t('common.add')}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-text2 bg-surf2 border border-wf-border hover:bg-wf-border transition-colors">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// SubtaskList component
// ---------------------------------------------------------------------------

export function SubtaskList({ parentTask }: SubtaskListProps) {
  const router = useRouter()
  const { data: subtasks, isLoading } = useSubtasks(parentTask.id)
  const updateTask = useUpdateTask()
  const [showForm, setShowForm] = useState(false)
  const { t } = useI18n()

  // Calculate work split stats
  const stats = useMemo<WorkSplitStats>(() => {
    const tasks = subtasks ?? []
    const parentEst = parentTask.estimated_hours ?? 0
    const totalEst = tasks.reduce((s, t) => s + (t.estimated_hours ?? 0), 0)
    const totalAct = tasks.reduce((s, t) => s + (t.actual_hours ?? 0), 0)

    // Weighted progress
    let weightedProgress = 0
    if (totalEst > 0) {
      weightedProgress = Math.round(
        tasks.reduce((s, t) => s + (t.progress ?? 0) * (t.estimated_hours ?? 0), 0) / totalEst
      )
    } else if (tasks.length > 0) {
      weightedProgress = Math.round(tasks.reduce((s, t) => s + (t.progress ?? 0), 0) / tasks.length)
    }

    const completedCount = tasks.filter(t => t.status === 'done').length
    const remaining = totalEst - totalAct

    // Assignee breakdown
    const byAssignee: Record<string, { name: string; hours: number }> = {}
    tasks.forEach(t => {
      const name = (t as any).assigned_user?.name ?? t.assigned_to ?? 'Unassigned'
      if (!byAssignee[name]) byAssignee[name] = { name, hours: 0 }
      byAssignee[name].hours += (t.estimated_hours ?? 0)
    })
    const assigneeBreakdown = Object.values(byAssignee).map((a, i) => ({
      ...a,
      percentage: totalEst > 0 ? Math.round((a.hours / totalEst) * 100) : 0,
      color: ASSIGNEE_COLORS[i % ASSIGNEE_COLORS.length],
    }))

    // Alerts
    const alerts: WorkSplitStats['alerts'] = []
    if (parentEst > 0 && totalEst > parentEst) {
      alerts.push({ type: 'over', message: `見積超過: +${(totalEst - parentEst).toFixed(1)}h（親: ${parentEst}h, サブ合計: ${totalEst}h）` })
    }
    const unassigned = tasks.filter(t => !t.assigned_to)
    if (unassigned.length > 0) {
      alerts.push({ type: 'unassigned', message: `${unassigned.length}件の未アサインサブタスクがあります` })
    }
    const parentDeadline = parentTask.confirmed_deadline ?? parentTask.desired_deadline
    if (parentDeadline) {
      const overDeadline = tasks.filter(t => {
        const dl = t.confirmed_deadline ?? t.desired_deadline
        return dl && dl > parentDeadline
      })
      if (overDeadline.length > 0) {
        alerts.push({ type: 'deadline', message: `${overDeadline.length}件のサブタスクが親タスクの締切を超えています` })
      }
    }

    return {
      totalEstimated: totalEst,
      totalActual: totalAct,
      parentEstimated: parentEst,
      weightedProgress,
      completedCount,
      totalCount: tasks.length,
      remainingHours: Math.max(0, remaining),
      assigneeBreakdown,
      alerts,
    }
  }, [subtasks, parentTask])

  // Auto-update parent progress based on subtask weighted average
  useEffect(() => {
    if (!subtasks || subtasks.length === 0) return
    if (stats.weightedProgress !== parentTask.progress && stats.totalEstimated > 0) {
      // Only update if significantly different (avoid infinite loops)
      if (Math.abs(stats.weightedProgress - (parentTask.progress ?? 0)) >= 2) {
        updateTask.mutate({ taskId: parentTask.id, data: { progress: stats.weightedProgress } as any })
      }
    }
  }, [stats.weightedProgress]) // eslint-disable-line react-hooks/exhaustive-deps

  const priorityBadge = (p: number) => {
    const styles: Record<number, string> = {
      1: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
      2: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
      3: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
      4: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
      5: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    }
    return `text-[9px] font-bold px-[5px] py-[1px] rounded ${styles[p] ?? styles[3]}`
  }

  return (
    <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-wf-border flex items-center justify-between">
        <div className="flex items-center gap-[8px]">
          <h2 className="text-[14px] font-bold text-text1">
            {t('subtask.title')}
          </h2>
          {subtasks && subtasks.length > 0 && (
            <span className="text-[10px] bg-mint-dd/10 text-mint-dd px-[6px] py-[1px] rounded-full font-bold">
              {subtasks.length}
            </span>
          )}
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-[4px] text-[12px] font-semibold text-mint hover:text-mint-d transition-colors">
            <Plus className="w-[14px] h-[14px]" /> {t('subtask.add')}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {isLoading && (
          <div className="text-[12px] text-text3 py-[8px]">{t('common.loading')}</div>
        )}

        {/* Work Split Summary */}
        {subtasks && subtasks.length > 0 && (
          <WorkSplitSummary stats={stats} t={t} />
        )}

        {!isLoading && subtasks && subtasks.length === 0 && !showForm && (
          <div className="text-[12px] text-text3 py-[8px]">
            {t('subtask.empty')}
          </div>
        )}

        {/* Subtask list */}
        {subtasks && subtasks.length > 0 && (
          <div className="flex flex-col gap-[2px]">
            {subtasks.map((task) => {
              const dl = task.confirmed_deadline ?? task.desired_deadline
              return (
                <div
                  key={task.id}
                  onClick={() => router.push(`/tasks/${task.id}`)}
                  className="flex items-center gap-[10px] px-[12px] py-[8px] rounded-lg cursor-pointer hover:bg-surf2/50 transition-colors border border-transparent hover:border-wf-border"
                >
                  {/* Priority */}
                  <span className={priorityBadge(task.priority)}>P{task.priority}</span>

                  {/* Status */}
                  <div className="shrink-0">
                    <StatusChip status={task.status} size="sm" />
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[12.5px] font-semibold text-text truncate block">{task.title}</span>
                  </div>

                  {/* Hours */}
                  {(task.estimated_hours ?? 0) > 0 && (
                    <span className="text-[10px] text-text2 whitespace-nowrap">
                      {task.actual_hours ?? 0}/{task.estimated_hours}h
                    </span>
                  )}

                  {/* Progress */}
                  <div className="flex items-center gap-[4px] w-[70px] shrink-0">
                    <div className="flex-1">
                      <ProgressBar value={task.progress} height="sm" />
                    </div>
                    <span className="text-[10px] font-semibold text-text2 w-[28px] text-right">{task.progress}%</span>
                  </div>

                  {/* Deadline */}
                  {dl && (
                    <span className="text-[10px] text-text3 whitespace-nowrap">{dl.slice(5).replace('-', '/')}</span>
                  )}

                  {/* Assignee */}
                  <div className="shrink-0">
                    {(task as any).assigned_user ? (
                      <Avatar
                        name_short={(task as any).assigned_user.name_short}
                        color={(task as any).assigned_user.avatar_color}
                        avatar_url={(task as any).assigned_user?.avatar_url}
                        size="sm"
                      />
                    ) : (
                      <span className="text-[10px] italic text-text3">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add subtask form */}
        {showForm && (
          <AddSubtaskForm parentTask={parentTask} onClose={() => setShowForm(false)} />
        )}
      </div>
    </div>
  )
}
