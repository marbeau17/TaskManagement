'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTask, useUpdateTaskProgress } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { StatusChip } from '@/components/shared'
import { TaskDetailInfo } from '@/components/tasks/TaskDetailInfo'
import { ProgressInput } from '@/components/tasks/ProgressInput'
import { CommentSection } from '@/components/tasks/CommentSection'
import { AssignInfo } from '@/components/tasks/AssignInfo'
import { ActivityLog } from '@/components/tasks/ActivityLog'
import { AttachmentList } from '@/components/tasks/AttachmentList'
import { TaskDependencies } from '@/components/tasks/TaskDependencies'
import { SubtaskList } from '@/components/tasks/SubtaskList'
import { WatcherButton } from '@/components/tasks/WatcherButton'

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { data: task, isLoading } = useTask(params.id)
  const updateProgress = useUpdateTaskProgress()

  const handleReject = () => {
    if (!task) return
    updateProgress.mutate({
      taskId: task.id,
      update: {
        progress: task.progress,
        status: 'rejected',
        actual_hours: task.actual_hours,
      },
    })
  }

  const handleComplete = () => {
    if (!task) return
    updateProgress.mutate({
      taskId: task.id,
      update: {
        progress: 100,
        status: 'done',
        actual_hours: task.actual_hours,
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[13px] text-text3">読み込み中...</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[13px] text-text3">タスクが見つかりません</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-6 py-3 border-b border-wf-border bg-surface">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[12px] text-text2 hover:text-mint transition-colors"
        >
          ← 一覧に戻る
        </button>

        {task.parent_task_id && (
          <Link
            href={`/tasks/${task.parent_task_id}`}
            className="text-[11px] text-mint hover:text-mint-d transition-colors font-semibold"
          >
            ← 親タスク
          </Link>
        )}

        {task.wbs_code && (
          <span className="text-[10.5px] font-mono text-text3 bg-surf2 px-[6px] py-[2px] rounded">
            {task.wbs_code}
          </span>
        )}

        <h1 className="text-[15px] font-bold text-text truncate max-w-[400px]">
          {task.title}
        </h1>

        <StatusChip status={task.status} />
        <WatcherButton taskId={task.id} />

        {/* Spacer */}
        <div className="flex-1" />

        {task.assigned_user && (
          <span className="text-[9.5px] px-[7px] py-[1px] rounded-full font-bold border inline-block bg-ok-bg text-ok border-ok-b">
            {task.assigned_user.name}
          </span>
        )}

        <button
          type="button"
          onClick={handleReject}
          disabled={updateProgress.isPending}
          className="px-3 py-1.5 rounded-md text-[12px] font-bold border border-danger-b text-danger bg-danger-bg hover:bg-danger hover:text-white transition-colors disabled:opacity-50"
        >
          差し戻し
        </button>

        <button
          type="button"
          onClick={handleComplete}
          disabled={updateProgress.isPending}
          className="px-3 py-1.5 rounded-md text-[12px] font-bold bg-mint text-white hover:bg-mint-d transition-colors disabled:opacity-50"
        >
          ✓ 完了にする
        </button>
      </div>

      {/* 2-column layout */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 lg:gap-6 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <TaskDetailInfo task={task} />
          <ProgressInput task={task} />
          <SubtaskList parentTask={task} />
          <CommentSection taskId={task.id} currentUserId={user?.id ?? ''} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <AssignInfo task={task} />
          <TaskDependencies taskId={task.id} />
          <ActivityLog taskId={task.id} />
          <AttachmentList taskId={task.id} />
        </div>
      </div>
    </div>
  )
}
