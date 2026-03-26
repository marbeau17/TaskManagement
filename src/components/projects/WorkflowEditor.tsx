'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  useWorkflowSettings,
  useUpdateWorkflowSettings,
  getDefaultStatuses,
} from '@/hooks/useWorkflowSettings'
import { useI18n } from '@/hooks/useI18n'
import type { WorkflowStatusDef } from '@/types/project'

// ---------------------------------------------------------------------------
// Preset colors for the color picker
// ---------------------------------------------------------------------------

const PRESET_COLORS = [
  '#94a3b8', '#64748b', '#6b7280', '#78716c',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#34d399', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#60a5fa',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e',
]

// ---------------------------------------------------------------------------
// Inline color picker
// ---------------------------------------------------------------------------

function ColorPicker({
  color,
  onChange,
}: {
  color: string
  onChange: (c: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-[24px] h-[24px] rounded-[4px] border border-border2 shrink-0 cursor-pointer"
        style={{ backgroundColor: color }}
        aria-label="色を選択"
      />
      {open && (
        <div className="absolute z-20 top-[30px] left-0 bg-surface border border-border2 rounded-[8px] shadow-lg p-[8px] grid grid-cols-6 gap-[4px] w-[176px]">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c)
                setOpen(false)
              }}
              className={`w-[24px] h-[24px] rounded-[4px] border-2 transition-transform hover:scale-110 ${
                c === color ? 'border-text ring-1 ring-mint' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatusRow
// ---------------------------------------------------------------------------

function StatusRow({
  status,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragging,
  t,
}: {
  status: WorkflowStatusDef
  index: number
  total: number
  onUpdate: (field: keyof WorkflowStatusDef, value: string) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
  isDragging: boolean
  t: (key: string) => string
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`flex items-center gap-[8px] px-[12px] py-[8px] border border-border2 rounded-[8px] bg-surface transition-opacity ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      {/* Drag handle */}
      <span className="cursor-grab text-text3 text-[14px] select-none" title={t('workflow.dragToReorder')}>
        &#x2630;
      </span>

      {/* Color */}
      <ColorPicker
        color={status.color}
        onChange={(c) => onUpdate('color', c)}
      />

      {/* Key (read-only for built-in, editable for custom) */}
      <input
        type="text"
        value={status.key}
        onChange={(e) => onUpdate('key', e.target.value.replace(/[^a-z0-9_]/g, ''))}
        className="w-[120px] text-[12px] text-text font-mono px-[8px] py-[5px] bg-surf2 border border-border2 rounded-[5px] outline-none focus:border-mint"
        placeholder="status_key"
      />

      {/* Label */}
      <input
        type="text"
        value={status.label}
        onChange={(e) => onUpdate('label', e.target.value)}
        className="flex-1 text-[12px] text-text px-[8px] py-[5px] bg-surf2 border border-border2 rounded-[5px] outline-none focus:border-mint"
        placeholder={t('workflow.labelPlaceholder')}
      />

      {/* Move up / down */}
      <button
        type="button"
        onClick={onMoveUp}
        disabled={index === 0}
        className="text-[14px] text-text3 hover:text-mint disabled:opacity-30 transition-colors"
        title={t('workflow.moveUp')}
      >
        &#x25B2;
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={index === total - 1}
        className="text-[14px] text-text3 hover:text-mint disabled:opacity-30 transition-colors"
        title={t('workflow.moveDown')}
      >
        &#x25BC;
      </button>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        disabled={total <= 1}
        className="text-[13px] text-danger hover:opacity-80 disabled:opacity-30 transition-colors font-medium"
        title={t('common.delete')}
      >
        &times;
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// WorkflowEditor
// ---------------------------------------------------------------------------

export function WorkflowEditor({ projectId }: { projectId: string }) {
  const { t } = useI18n()
  const { data: settings, isLoading } = useWorkflowSettings(projectId)
  const mutation = useUpdateWorkflowSettings()

  const [statuses, setStatuses] = useState<WorkflowStatusDef[]>([])
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  // Initialize statuses from DB or defaults
  useEffect(() => {
    if (settings) {
      // settings.statuses is stored as jsonb — may be the old string[] format or new object[]
      const raw = settings.statuses
      if (Array.isArray(raw) && raw.length > 0) {
        if (typeof raw[0] === 'string') {
          // Legacy: plain string array — convert to WorkflowStatusDef[]
          const defaults = getDefaultStatuses()
          const mapped: WorkflowStatusDef[] = (raw as unknown as string[]).map((key) => {
            const found = defaults.find((d) => d.key === key)
            return found ?? { key, label: key, color: '#94a3b8' }
          })
          setStatuses(mapped)
        } else {
          setStatuses(raw as WorkflowStatusDef[])
        }
      } else {
        setStatuses(getDefaultStatuses())
      }
    } else if (!isLoading) {
      setStatuses(getDefaultStatuses())
    }
  }, [settings, isLoading])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const updateStatus = useCallback(
    (index: number, field: keyof WorkflowStatusDef, value: string) => {
      setStatuses((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], [field]: value }
        return next
      })
      setDirty(true)
      setSaved(false)
    },
    []
  )

  const removeStatus = useCallback((index: number) => {
    setStatuses((prev) => prev.filter((_, i) => i !== index))
    setDirty(true)
    setSaved(false)
  }, [])

  const moveStatus = useCallback((from: number, to: number) => {
    setStatuses((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
    setDirty(true)
    setSaved(false)
  }, [])

  const addStatus = useCallback(() => {
    const newKey = `custom_${Date.now()}`
    setStatuses((prev) => [
      ...prev,
      { key: newKey, label: '', color: '#94a3b8' },
    ])
    setDirty(true)
    setSaved(false)
  }, [])

  const resetToDefaults = useCallback(() => {
    setStatuses(getDefaultStatuses())
    setDirty(true)
    setSaved(false)
  }, [])

  const handleSave = async () => {
    // Validate: all keys must be non-empty and unique
    const keys = statuses.map((s) => s.key)
    const uniqueKeys = new Set(keys)
    if (keys.some((k) => !k)) {
      alert(t('workflow.errorEmptyKey'))
      return
    }
    if (uniqueKeys.size !== keys.length) {
      alert(t('workflow.errorDuplicateKey'))
      return
    }

    await mutation.mutateAsync({ projectId, statuses })
    setDirty(false)
    setSaved(true)
  }

  // Drag-and-drop handlers
  const handleDragStart = (index: number) => {
    dragIdx.current = index
  }
  const handleDragEnter = (index: number) => {
    dragOverIdx.current = index
  }
  const handleDragEnd = () => {
    if (dragIdx.current !== null && dragOverIdx.current !== null && dragIdx.current !== dragOverIdx.current) {
      moveStatus(dragIdx.current, dragOverIdx.current)
    }
    dragIdx.current = null
    dragOverIdx.current = null
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-[40px]">
        <span className="text-[13px] text-text3">{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-[16px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-text">{t('workflow.title')}</h3>
          <p className="text-[11px] text-text3 mt-[2px]">{t('workflow.description')}</p>
        </div>
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={resetToDefaults}
            className="px-[12px] py-[6px] text-[11px] text-text2 bg-surf2 border border-border2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            {t('workflow.resetDefaults')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || mutation.isPending}
            className="px-[16px] py-[6px] text-[12px] font-semibold text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>

      {/* Saved indicator */}
      {saved && (
        <div className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium">
          {t('workflow.saved')}
        </div>
      )}

      {/* Error */}
      {mutation.isError && (
        <div className="text-[12px] text-danger font-medium">
          {t('workflow.errorSave')}
        </div>
      )}

      {/* Status list */}
      <div className="bg-surface border border-border2 rounded-[10px] shadow p-[16px] space-y-[8px]">
        <div className="flex items-center gap-[8px] px-[12px] pb-[4px] text-[10px] font-bold text-text3 uppercase tracking-wider">
          <span className="w-[24px]" />
          <span className="w-[24px]">{t('workflow.color')}</span>
          <span className="w-[120px] ml-[8px]">{t('workflow.key')}</span>
          <span className="flex-1">{t('workflow.label')}</span>
          <span className="w-[80px] text-center">{t('workflow.order')}</span>
          <span className="w-[20px]" />
        </div>

        {statuses.map((status, index) => (
          <StatusRow
            key={`${status.key}-${index}`}
            status={status}
            index={index}
            total={statuses.length}
            onUpdate={(field, value) => updateStatus(index, field, value)}
            onRemove={() => removeStatus(index)}
            onMoveUp={() => moveStatus(index, index - 1)}
            onMoveDown={() => moveStatus(index, index + 1)}
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            isDragging={false}
            t={t}
          />
        ))}

        {/* Add button */}
        <button
          type="button"
          onClick={addStatus}
          className="w-full py-[8px] text-[12px] text-mint font-semibold border border-dashed border-mint/40 rounded-[8px] hover:bg-mint-ll/30 dark:hover:bg-mint-dd/20 transition-colors"
        >
          + {t('workflow.addStatus')}
        </button>
      </div>
    </div>
  )
}
