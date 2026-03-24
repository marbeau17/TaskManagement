'use client'

import type { TaskStatus, TaskWithRelations } from '@/types/database'
import { useFilterStore } from '@/stores/filterStore'

interface TabDef {
  key: TaskStatus | 'all'
  label: string
}

const TABS: TabDef[] = [
  { key: 'all', label: 'すべて' },
  { key: 'waiting', label: '⏳ アサイン待ち' },
  { key: 'todo', label: '📋 未着手' },
  { key: 'in_progress', label: '▶ 進行中' },
  { key: 'done', label: '✓ 完了' },
]

interface TaskStatusTabsProps {
  tasks: TaskWithRelations[]
}

export function TaskStatusTabs({ tasks }: TaskStatusTabsProps) {
  const { status, setStatus } = useFilterStore()

  const counts: Record<string, number> = {
    all: tasks.length,
    waiting: tasks.filter((t) => t.status === 'waiting').length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  }

  return (
    <div className="flex items-center gap-0 border-b border-wf-border overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = (status ?? 'all') === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`
              relative px-[16px] py-[10px] text-[12.5px] whitespace-nowrap
              transition-colors
              ${
                isActive
                  ? 'text-mint-d font-bold'
                  : 'text-text2 hover:text-text'
              }
            `}
          >
            {tab.label}
            <span
              className={`
                ml-[6px] inline-flex items-center justify-center
                min-w-[20px] h-[18px] px-[5px] rounded-full
                text-[10px] font-semibold
                ${isActive ? 'bg-mint/15 text-mint-d' : 'bg-surf2 text-text3'}
              `}
            >
              {counts[tab.key]}
            </span>
            {/* Active bottom border */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-mint rounded-t" />
            )}
          </button>
        )
      })}
    </div>
  )
}
