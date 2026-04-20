'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, ArrowUpRight } from 'lucide-react'
import {
  useBacklogItems,
  useCreateBacklogItem,
  useUpdateBacklogItem,
  useDeleteBacklogItem,
  usePromoteBacklogItem,
} from '@/hooks/useBacklog'
import { useProjects } from '@/hooks/useProjects'
import { useMembers } from '@/hooks/useMembers'
import { useClients } from '@/hooks/useClients'
import { useI18n } from '@/hooks/useI18n'
import { Avatar } from '@/components/shared'
import type { BacklogItem, BacklogStatus } from '@/types/database'

// ---------------------------------------------------------------------------
// Item editor modal
// ---------------------------------------------------------------------------

interface EditorProps {
  item?: BacklogItem | null
  lockedProjectId?: string
  onClose: () => void
}

function ItemEditor({ item, lockedProjectId, onClose }: EditorProps) {
  const { t } = useI18n()
  const { data: projects } = useProjects()
  const { data: members } = useMembers()
  const createMut = useCreateBacklogItem()
  const updateMut = useUpdateBacklogItem()

  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [projectId, setProjectId] = useState(item?.project_id ?? lockedProjectId ?? '')
  const [priority, setPriority] = useState(item?.priority ?? 3)
  const [hours, setHours] = useState(item?.estimated_hours?.toString() ?? '')
  const [assigneeId, setAssigneeId] = useState(item?.assignee_id ?? '')
  const [status, setStatus] = useState<BacklogStatus>(item?.status ?? 'new')

  const saving = createMut.isPending || updateMut.isPending

  const handleSave = async () => {
    if (!title.trim()) return
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      project_id: projectId || null,
      priority,
      estimated_hours: hours ? Number(hours) : null,
      assignee_id: assigneeId || null,
      status,
    }
    if (item) {
      await updateMut.mutateAsync({ id: item.id, patch: payload })
    } else {
      await createMut.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-full max-w-[520px]">
        <h2 className="text-[15px] font-bold text-text mb-[16px]">
          {item ? t('backlog.editItem') : t('backlog.addNew')}
        </h2>
        <div className="space-y-[12px]">
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('backlog.title')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            />
          </div>
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('backlog.descriptionField')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-[12px]">
            {!lockedProjectId && (
              <div>
                <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                  {t('backlog.project')}
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                >
                  <option value="">{t('backlog.noProject')}</option>
                  {(projects ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('backlog.priority')}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              >
                {[1, 2, 3, 4, 5].map((p) => (
                  <option key={p} value={p}>
                    P{p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('backlog.estimatedHours')}
              </label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                min={0}
                step={0.5}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              />
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('backlog.assignee')}
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              >
                <option value="">—</option>
                {(members ?? []).filter((m) => m.is_active).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('backlog.status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BacklogStatus)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              >
                <option value="new">{t('backlog.statusNew')}</option>
                <option value="ready">{t('backlog.statusReady')}</option>
                <option value="archived">{t('backlog.statusArchived')}</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-[8px] mt-[20px]">
          <button
            onClick={onClose}
            className="px-[14px] py-[7px] text-[12px] text-text2 hover:text-text transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-[14px] py-[7px] text-[12px] font-semibold bg-mint text-white rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Promote modal
// ---------------------------------------------------------------------------

function PromoteModal({ item, onClose }: { item: BacklogItem; onClose: () => void }) {
  const { t } = useI18n()
  const { data: clients } = useClients()
  const promoteMut = usePromoteBacklogItem()
  const [clientName, setClientName] = useState('')
  const [deadline, setDeadline] = useState('')

  const handlePromote = async () => {
    if (!clientName.trim()) return
    await promoteMut.mutateAsync({
      id: item.id,
      clientName: clientName.trim(),
      confirmedDeadline: deadline || null,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-full max-w-[400px]">
        <h2 className="text-[15px] font-bold text-text mb-[8px]">{t('backlog.promote')}</h2>
        <p className="text-[12px] text-text2 mb-[16px]">{item.title}</p>
        <div className="space-y-[12px]">
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('backlog.clientName')} *
            </label>
            <input
              type="text"
              list="backlog-client-list"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              autoFocus
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            />
            <datalist id="backlog-client-list">
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('backlog.confirmedDeadline')}
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            />
          </div>
        </div>
        <div className="flex justify-end gap-[8px] mt-[20px]">
          <button
            onClick={onClose}
            className="px-[14px] py-[7px] text-[12px] text-text2 hover:text-text transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handlePromote}
            disabled={promoteMut.isPending || !clientName.trim()}
            className="px-[14px] py-[7px] text-[12px] font-semibold bg-mint text-white rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {t('backlog.promote')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<BacklogStatus, { bg: string; text: string; key: string }> = {
  new: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', key: 'backlog.statusNew' },
  ready: { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', key: 'backlog.statusReady' },
  promoted: { bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', key: 'backlog.statusPromoted' },
  archived: { bg: 'bg-gray-200 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', key: 'backlog.statusArchived' },
}

interface BacklogPanelProps {
  projectId?: string
  showProjectColumn?: boolean
}

export function BacklogPanel({ projectId, showProjectColumn = true }: BacklogPanelProps) {
  const { t } = useI18n()
  const { data: items, isLoading } = useBacklogItems(projectId)
  const { data: members } = useMembers()
  const { data: projects } = useProjects()
  const deleteMut = useDeleteBacklogItem()

  const [editing, setEditing] = useState<BacklogItem | null | undefined>(undefined)
  const [promoting, setPromoting] = useState<BacklogItem | null>(null)
  const [statusFilter, setStatusFilter] = useState<BacklogStatus | ''>('')
  const [projectFilter, setProjectFilter] = useState<string>('')

  const filtered = useMemo(() => {
    let list = items ?? []
    if (statusFilter) list = list.filter((i) => i.status === statusFilter)
    if (projectFilter) list = list.filter((i) => i.project_id === projectFilter)
    return list
  }, [items, statusFilter, projectFilter])

  const memberMap = useMemo(() => {
    const map = new Map<string, { name: string; name_short: string; avatar_color: string; avatar_url: string | null }>()
    for (const m of members ?? []) {
      map.set(m.id, { name: m.name, name_short: m.name_short, avatar_color: m.avatar_color, avatar_url: m.avatar_url })
    }
    return map
  }, [members])

  const projectMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of projects ?? []) map.set(p.id, p.name)
    return map
  }, [projects])

  const handleDelete = (id: string) => {
    if (!window.confirm(t('backlog.deleteConfirm'))) return
    deleteMut.mutate(id)
  }

  return (
    <div className="p-[24px]">
      {/* Toolbar */}
      <div className="flex items-center gap-[12px] mb-[16px]">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as BacklogStatus | '')}
          className="text-[12px] text-text px-[8px] py-[5px] bg-surface border border-border2 rounded-[6px] outline-none"
        >
          <option value="">{t('backlog.filterAllStatuses')}</option>
          <option value="new">{t('backlog.statusNew')}</option>
          <option value="ready">{t('backlog.statusReady')}</option>
          <option value="promoted">{t('backlog.statusPromoted')}</option>
          <option value="archived">{t('backlog.statusArchived')}</option>
        </select>
        {!projectId && showProjectColumn && (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="text-[12px] text-text px-[8px] py-[5px] bg-surface border border-border2 rounded-[6px] outline-none"
          >
            <option value="">{t('backlog.filterAllProjects')}</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-semibold bg-mint text-white rounded-[6px] hover:bg-mint-d transition-colors"
        >
          <Plus className="w-[14px] h-[14px]" />
          {t('backlog.addNew')}
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-[13px] text-text3 py-[40px] text-center">{t('common.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-[13px] text-text3 py-[40px] text-center">{t('backlog.empty')}</div>
      ) : (
        <div className="border border-border2 rounded-[8px] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-surf2 text-text2">
              <tr>
                <th className="text-left font-semibold px-[12px] py-[8px] w-[60px]">{t('backlog.priority')}</th>
                <th className="text-left font-semibold px-[12px] py-[8px]">{t('backlog.title')}</th>
                {!projectId && showProjectColumn && (
                  <th className="text-left font-semibold px-[12px] py-[8px] w-[160px]">{t('backlog.project')}</th>
                )}
                <th className="text-left font-semibold px-[12px] py-[8px] w-[150px]">{t('backlog.assignee')}</th>
                <th className="text-right font-semibold px-[12px] py-[8px] w-[80px]">{t('backlog.estimatedHours')}</th>
                <th className="text-left font-semibold px-[12px] py-[8px] w-[110px]">{t('backlog.status')}</th>
                <th className="w-[120px]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const assignee = item.assignee_id ? memberMap.get(item.assignee_id) : null
                const statusStyle = STATUS_STYLES[item.status]
                return (
                  <tr key={item.id} className="border-t border-border2 hover:bg-surf2/50 transition-colors">
                    <td className="px-[12px] py-[8px] text-text2 font-semibold">P{item.priority}</td>
                    <td className="px-[12px] py-[8px] text-text">
                      <div className="font-medium">{item.title}</div>
                      {item.description && (
                        <div className="text-[11px] text-text3 mt-[2px] line-clamp-1">{item.description}</div>
                      )}
                    </td>
                    {!projectId && showProjectColumn && (
                      <td className="px-[12px] py-[8px] text-text2">
                        {item.project_id ? projectMap.get(item.project_id) ?? '—' : '—'}
                      </td>
                    )}
                    <td className="px-[12px] py-[8px]">
                      {assignee ? (
                        <div className="flex items-center gap-[6px]">
                          <Avatar
                            name_short={assignee.name_short}
                            color={assignee.avatar_color as any}
                            avatar_url={assignee.avatar_url}
                            size="sm"
                          />
                          <span className="text-text">{assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-text3">—</span>
                      )}
                    </td>
                    <td className="px-[12px] py-[8px] text-right text-text2">
                      {item.estimated_hours != null ? `${item.estimated_hours}h` : '—'}
                    </td>
                    <td className="px-[12px] py-[8px]">
                      <span className={`${statusStyle.bg} ${statusStyle.text} text-[10px] px-[8px] py-[2px] rounded-full font-semibold`}>
                        {t(statusStyle.key)}
                      </span>
                    </td>
                    <td className="px-[12px] py-[8px]">
                      <div className="flex items-center justify-end gap-[4px]">
                        {item.status !== 'promoted' && (
                          <button
                            onClick={() => setPromoting(item)}
                            title={t('backlog.promote')}
                            className="p-[5px] rounded-[4px] text-text2 hover:text-mint hover:bg-mint-ll transition-colors"
                          >
                            <ArrowUpRight className="w-[14px] h-[14px]" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditing(item)}
                          title={t('common.edit')}
                          className="p-[5px] rounded-[4px] text-text2 hover:text-text hover:bg-surf2 transition-colors"
                        >
                          <Pencil className="w-[14px] h-[14px]" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          title={t('common.delete')}
                          className="p-[5px] rounded-[4px] text-text2 hover:text-danger hover:bg-danger-bg transition-colors"
                        >
                          <Trash2 className="w-[14px] h-[14px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {editing !== undefined && (
        <ItemEditor item={editing} lockedProjectId={projectId} onClose={() => setEditing(undefined)} />
      )}
      {promoting && <PromoteModal item={promoting} onClose={() => setPromoting(null)} />}
    </div>
  )
}
