'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTaskDependencies, useAddTaskDependency, useRemoveTaskDependency } from '@/hooks/useRelations'
import { useTasks } from '@/hooks/useTasks'
import { StatusChip } from '@/components/shared'
import type { RelationType, TaskDependency } from '@/types/relation'
import { useI18n } from '@/hooks/useI18n'

// ---------------------------------------------------------------------------
// Relation type config
// ---------------------------------------------------------------------------

const RELATION_TYPE_ICONS: Record<RelationType, string> = {
  blocks: '\u26D4',
  is_blocked_by: '\u23F3',
  relates_to: '\uD83D\uDD17',
  duplicates: '\uD83D\uDCC4',
}

const RELATION_TYPE_KEYS: Record<RelationType, string> = {
  blocks: 'dependency.blocks',
  is_blocked_by: 'dependency.isBlockedBy',
  relates_to: 'dependency.relatesTo',
  duplicates: 'dependency.duplicates',
}

const RELATION_TYPES: RelationType[] = ['blocks', 'is_blocked_by', 'relates_to', 'duplicates']

// ---------------------------------------------------------------------------
// TaskDependencies component
// ---------------------------------------------------------------------------

interface TaskDependenciesProps {
  taskId: string
}

export function TaskDependencies({ taskId }: TaskDependenciesProps) {
  const { t } = useI18n()
  const { data: dependencies, isLoading } = useTaskDependencies(taskId)
  const addDependency = useAddTaskDependency()
  const removeDependency = useRemoveTaskDependency()

  const [showForm, setShowForm] = useState(false)
  const [relationType, setRelationType] = useState<RelationType>('relates_to')
  const [searchText, setSearchText] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch all tasks for autocomplete
  const { data: allTasks } = useTasks()

  // Filter suggestions
  const suggestions = (allTasks ?? []).filter((task) => {
    if (task.id === taskId) return false
    if (!searchText) return false
    const q = searchText.toLowerCase()
    return task.title.toLowerCase().includes(q)
  }).slice(0, 8)

  const handleAdd = () => {
    if (!selectedTaskId) return
    addDependency.mutate(
      { sourceId: taskId, targetId: selectedTaskId, type: relationType },
      {
        onSuccess: () => {
          setSearchText('')
          setSelectedTaskId(null)
          setShowForm(false)
        },
      }
    )
  }

  const handleRemove = (dependencyId: string) => {
    removeDependency.mutate({ id: dependencyId, taskId })
  }

  // Determine which task to show for each dependency row
  const getLinkedTask = (dep: TaskDependency) => {
    if (dep.source_task_id === taskId) {
      return {
        task: dep.target_task,
        type: dep.relation_type,
      }
    }
    const invertedType: RelationType =
      dep.relation_type === 'blocks'
        ? 'is_blocked_by'
        : dep.relation_type === 'is_blocked_by'
          ? 'blocks'
          : dep.relation_type
    return {
      task: dep.source_task,
      type: invertedType,
    }
  }

  // Close suggestions on click outside
  const wrapperRef = useRef<HTMLDivElement>(null)
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
      setShowSuggestions(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-text">{t('dependency.title')}</h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="text-[12px] font-bold text-mint hover:text-mint-d transition-colors"
        >
          {showForm ? t('common.cancel') : t('dependency.addRelation')}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 p-3 bg-surf2 rounded-md border border-border2 space-y-2">
          {/* Relation type select */}
          <select
            value={relationType}
            onChange={(e) => setRelationType(e.target.value as RelationType)}
            className="w-full border border-wf-border rounded-md px-2 py-1.5 text-[12px] text-text bg-surface focus:outline-none focus:border-mint"
          >
            {RELATION_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {RELATION_TYPE_ICONS[rt]} {t(RELATION_TYPE_KEYS[rt])}
              </option>
            ))}
          </select>

          {/* Task search */}
          <div className="relative" ref={wrapperRef}>
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value)
                setSelectedTaskId(null)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={t('dependency.searchPlaceholder')}
              className="w-full border border-wf-border rounded-md px-2 py-1.5 text-[12px] text-text bg-surface focus:outline-none focus:border-mint"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border2 rounded-md shadow-lg z-20 max-h-[180px] overflow-y-auto">
                {suggestions.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      setSelectedTaskId(task.id)
                      setSearchText(task.title)
                      setShowSuggestions(false)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-surf2 transition-colors flex items-center gap-2"
                  >
                    <span className="text-[11px] text-text truncate flex-1">{task.title}</span>
                    <StatusChip status={task.status} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add button */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedTaskId || addDependency.isPending}
            className="w-full py-1.5 rounded-md text-[12px] font-bold bg-mint text-white hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {addDependency.isPending ? t('dependency.adding') : t('common.add')}
          </button>
        </div>
      )}

      {/* Dependencies list */}
      {isLoading && <p className="text-[12px] text-text3">{t('common.loading')}</p>}

      {dependencies && dependencies.length === 0 && !showForm && (
        <p className="text-[12px] text-text3">{t('dependency.empty')}</p>
      )}

      {dependencies && dependencies.length > 0 && (
        <div className="space-y-1.5">
          {dependencies.map((dep) => {
            const { task, type } = getLinkedTask(dep)
            if (!task) return null
            const icon = RELATION_TYPE_ICONS[type]
            const label = t(RELATION_TYPE_KEYS[type])
            return (
              <div
                key={dep.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surf2 transition-colors group"
              >
                <span className="text-[12px] shrink-0" title={label}>
                  {icon}
                </span>
                <span className="text-[11px] text-text truncate flex-1">
                  {task.title}
                </span>
                <StatusChip status={task.status as any} size="sm" />
                <button
                  type="button"
                  onClick={() => handleRemove(dep.id)}
                  disabled={removeDependency.isPending}
                  className="text-[14px] text-text3 hover:text-danger transition-colors opacity-0 group-hover:opacity-100 leading-none px-1"
                  title={t('common.delete')}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
