'use client'

import { useRouter } from 'next/navigation'
import type { TaskWithRelations } from '@/types/database'
import { Avatar, ProgressBar, StatusChip } from '@/components/shared'
import { formatDate, formatHours } from '@/lib/utils'
import { isOverdue } from '@/lib/date-utils'
import { isToday } from 'date-fns'

interface TaskTableProps {
  tasks: TaskWithRelations[]
}

const COLUMNS = [
  'クライアント',
  'タスク名',
  '担当クリエイター',
  '進捗',
  '確定納期',
  '見積',
  '実績',
  'ステータス',
] as const

export function TaskTable({ tasks }: TaskTableProps) {
  const router = useRouter()

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-wf-border">
            {COLUMNS.map((col) => (
              <th
                key={col}
                className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 && (
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="px-[12px] py-[32px] text-center text-text3 text-[13px]"
              >
                タスクが見つかりませんでした
              </td>
            </tr>
          )}
          {tasks.map((task) => {
            const deadline = task.confirmed_deadline ?? task.desired_deadline
            const taskOverdue =
              deadline && task.status !== 'done' && isOverdue(deadline)
            const taskDueToday =
              deadline &&
              task.status !== 'done' &&
              isToday(new Date(deadline))

            return (
              <tr
                key={task.id}
                onClick={() => router.push(`/tasks/${task.id}`)}
                className={`
                  border-b border-wf-border cursor-pointer
                  hover:bg-surf2/50 transition-colors
                  ${taskOverdue ? 'bg-warn-bg' : ''}
                `}
              >
                {/* Client */}
                <td className="px-[12px] py-[10px]">
                  <span className="text-[11.5px] font-bold text-text whitespace-nowrap">
                    {task.client.name}
                  </span>
                </td>

                {/* Task name */}
                <td className="px-[12px] py-[10px] min-w-[180px]">
                  <div className="text-[12.5px] font-bold text-text leading-tight">
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-[11px] text-text3 mt-[2px] line-clamp-1">
                      {task.description}
                    </div>
                  )}
                </td>

                {/* Assignee(s) */}
                <td className="px-[12px] py-[10px]">
                  {task.assignees && task.assignees.length > 0 ? (
                    <div className="flex items-center gap-[6px]">
                      <div className="flex items-center -space-x-2">
                        {task.assignees.slice(0, 3).map((a) =>
                          a.user ? (
                            <Avatar
                              key={a.id}
                              name_short={a.user.name_short}
                              color={a.user.avatar_color}
                              size="sm"
                            />
                          ) : null
                        )}
                      </div>
                      {task.assignees.length <= 2 ? (
                        <span className="text-[11.5px] text-text whitespace-nowrap">
                          {task.assignees
                            .map((a) => a.user?.name)
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-text whitespace-nowrap">
                          {task.assignees[0]?.user?.name} 他{task.assignees.length - 1}名
                        </span>
                      )}
                    </div>
                  ) : task.assigned_user ? (
                    <div className="flex items-center gap-[6px]">
                      <Avatar
                        name_short={task.assigned_user.name_short}
                        color={task.assigned_user.avatar_color}
                        size="sm"
                      />
                      <span className="text-[11.5px] text-text whitespace-nowrap">
                        {task.assigned_user.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11.5px] italic text-warn">
                      未アサイン
                    </span>
                  )}
                </td>

                {/* Progress */}
                <td className="px-[12px] py-[10px] min-w-[100px]">
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[11px] font-semibold text-text2 w-[32px] text-right">
                      {task.progress}%
                    </span>
                    <div className="flex-1 min-w-[50px]">
                      <ProgressBar value={task.progress} height="sm" />
                    </div>
                  </div>
                </td>

                {/* Deadline */}
                <td className="px-[12px] py-[10px]">
                  {deadline ? (
                    <span
                      className={`text-[11.5px] whitespace-nowrap ${
                        taskOverdue
                          ? 'text-danger font-semibold'
                          : taskDueToday
                            ? 'text-warn font-semibold'
                            : 'text-text'
                      }`}
                    >
                      {taskOverdue && '🚨 '}
                      {taskDueToday && !taskOverdue && '⚠ '}
                      {formatDate(deadline)}
                    </span>
                  ) : (
                    <span className="text-[11.5px] text-text3">-</span>
                  )}
                </td>

                {/* Estimate */}
                <td className="px-[12px] py-[10px]">
                  <span className="text-[11.5px] text-text whitespace-nowrap">
                    {task.estimated_hours != null
                      ? formatHours(task.estimated_hours)
                      : '-'}
                  </span>
                </td>

                {/* Actual */}
                <td className="px-[12px] py-[10px]">
                  <div className="flex items-center gap-[4px]">
                    <span className="text-[11.5px] text-text whitespace-nowrap">
                      {formatHours(task.actual_hours)}
                    </span>
                    {task.actual_hours > 0 && (
                      <span className="text-[9px] px-[5px] py-[1px] rounded-full bg-[#FFF8E0] text-[#C8A030] font-semibold border border-[#F0E0A0] whitespace-nowrap">
                        手入力済み
                      </span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-[12px] py-[10px]">
                  <StatusChip status={task.status} size="sm" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
