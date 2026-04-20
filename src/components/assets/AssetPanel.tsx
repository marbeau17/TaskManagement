'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  useAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
} from '@/hooks/useAssets'
import { useMembers } from '@/hooks/useMembers'
import { useI18n } from '@/hooks/useI18n'
import { formatDate } from '@/lib/utils'
import type { Asset, AssetCategory, AssetStatus } from '@/types/database'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: AssetCategory[] = [
  'pc',
  'monitor',
  'tablet',
  'peripheral',
  'furniture',
  'license',
  'other',
]

const STATUSES: AssetStatus[] = ['in_use', 'spare', 'disposed', 'loaned']

const CATEGORY_KEY: Record<AssetCategory, string> = {
  pc: 'asset.categoryPc',
  monitor: 'asset.categoryMonitor',
  tablet: 'asset.categoryTablet',
  peripheral: 'asset.categoryPeripheral',
  furniture: 'asset.categoryFurniture',
  license: 'asset.categoryLicense',
  other: 'asset.categoryOther',
}

const STATUS_STYLES: Record<AssetStatus, { bg: string; text: string; key: string }> = {
  in_use: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    key: 'asset.statusInUse',
  },
  spare: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-300',
    key: 'asset.statusSpare',
  },
  disposed: {
    bg: 'bg-gray-200 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    key: 'asset.statusDisposed',
  },
  loaned: {
    bg: 'bg-amber-100 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    key: 'asset.statusLoaned',
  },
}

// ---------------------------------------------------------------------------
// Item editor modal
// ---------------------------------------------------------------------------

interface EditorProps {
  item?: Asset | null
  onClose: () => void
}

function ItemEditor({ item, onClose }: EditorProps) {
  const { t } = useI18n()
  const { data: members } = useMembers()
  const createMut = useCreateAsset()
  const updateMut = useUpdateAsset()

  const [name, setName] = useState(item?.name ?? '')
  const [managementId, setManagementId] = useState(item?.management_id ?? '')
  const [category, setCategory] = useState<AssetCategory>(item?.category ?? 'other')
  const [status, setStatus] = useState<AssetStatus>(item?.status ?? 'in_use')
  const [acquiredDate, setAcquiredDate] = useState(item?.acquired_date ?? '')
  const [acquiredPrice, setAcquiredPrice] = useState(
    item?.acquired_price != null ? String(item.acquired_price) : '',
  )
  const [ownerUserId, setOwnerUserId] = useState(item?.owner_user_id ?? '')
  const [ownerName, setOwnerName] = useState(item?.owner_name ?? '')
  const [serialNumber, setSerialNumber] = useState(item?.serial_number ?? '')
  const [location, setLocation] = useState(item?.location ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')

  const saving = createMut.isPending || updateMut.isPending

  const activeMembers = useMemo(
    () => (members ?? []).filter((m) => m.is_active),
    [members],
  )

  const handleOwnerUserChange = (id: string) => {
    setOwnerUserId(id)
    if (id) {
      const m = activeMembers.find((x) => x.id === id)
      if (m) setOwnerName(m.name)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      management_id: managementId.trim() || null,
      category,
      status,
      acquired_date: acquiredDate || null,
      acquired_price: acquiredPrice ? Number(acquiredPrice) : null,
      owner_user_id: ownerUserId || null,
      owner_name: ownerName.trim() || null,
      serial_number: serialNumber.trim() || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
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
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-full max-w-[560px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-[15px] font-bold text-text mb-[16px]">
          {item ? t('asset.editItem') : t('asset.addNew')}
        </h2>
        <div className="space-y-[12px]">
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('asset.name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            />
          </div>
          <div className="grid grid-cols-2 gap-[12px]">
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('asset.managementId')}
              </label>
              <input
                type="text"
                value={managementId}
                onChange={(e) => setManagementId(e.target.value)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              />
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('asset.serialNumber')}
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              />
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('asset.category')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(CATEGORY_KEY[c])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('asset.status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AssetStatus)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(STATUS_STYLES[s].key)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('asset.acquiredDate')}
              </label>
              <input
                type="date"
                value={acquiredDate}
                onChange={(e) => setAcquiredDate(e.target.value)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              />
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('asset.acquiredPrice')}
              </label>
              <input
                type="number"
                value={acquiredPrice}
                onChange={(e) => setAcquiredPrice(e.target.value)}
                min={0}
                step={1}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              />
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('asset.owner')}
              </label>
              <select
                value={ownerUserId}
                onChange={(e) => handleOwnerUserChange(e.target.value)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              >
                <option value="">—</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('asset.owner')} ({t('asset.name')})
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('asset.location')}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('asset.notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint resize-none"
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
            onClick={handleSave}
            disabled={saving || !name.trim()}
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
// Main panel
// ---------------------------------------------------------------------------

export function AssetPanel() {
  const { t } = useI18n()
  const { data: items, isLoading } = useAssets()
  const { data: members } = useMembers()
  const deleteMut = useDeleteAsset()

  const [editing, setEditing] = useState<Asset | null | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<AssetStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | ''>('')
  const [searchText, setSearchText] = useState('')

  const memberMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members ?? []) map.set(m.id, m.name)
    return map
  }, [members])

  const filtered = useMemo(() => {
    let list = items ?? []
    if (statusFilter) list = list.filter((i) => i.status === statusFilter)
    if (categoryFilter) list = list.filter((i) => i.category === categoryFilter)
    const q = searchText.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.management_id ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [items, statusFilter, categoryFilter, searchText])

  const handleDelete = (id: string) => {
    if (!window.confirm(t('asset.deleteConfirm'))) return
    deleteMut.mutate(id)
  }

  return (
    <div className="p-[24px]">
      {/* Toolbar */}
      <div className="flex items-center gap-[12px] mb-[16px] flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AssetStatus | '')}
          className="text-[12px] text-text px-[8px] py-[5px] bg-surface border border-border2 rounded-[6px] outline-none"
        >
          <option value="">{t('asset.filterAllStatuses')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(STATUS_STYLES[s].key)}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as AssetCategory | '')}
          className="text-[12px] text-text px-[8px] py-[5px] bg-surface border border-border2 rounded-[6px] outline-none"
        >
          <option value="">{t('asset.filterAllCategories')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(CATEGORY_KEY[c])}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={t('asset.searchPlaceholder')}
          className="text-[12px] text-text px-[10px] py-[5px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint w-[220px]"
        />
        <div className="flex-1" />
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-semibold bg-mint text-white rounded-[6px] hover:bg-mint-d transition-colors"
        >
          <Plus className="w-[14px] h-[14px]" />
          {t('asset.addNew')}
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-[13px] text-text3 py-[40px] text-center">
          {t('common.loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-[13px] text-text3 py-[40px] text-center">
          {t('asset.empty')}
        </div>
      ) : (
        <div className="border border-border2 rounded-[8px] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-surf2 text-text2">
              <tr>
                <th className="text-right font-semibold px-[12px] py-[8px] w-[60px]">
                  {t('asset.seqNo')}
                </th>
                <th className="text-left font-semibold px-[12px] py-[8px] w-[160px]">
                  {t('asset.managementId')}
                </th>
                <th className="text-left font-semibold px-[12px] py-[8px]">
                  {t('asset.name')}
                </th>
                <th className="text-left font-semibold px-[12px] py-[8px] w-[110px]">
                  {t('asset.category')}
                </th>
                <th className="text-left font-semibold px-[12px] py-[8px] w-[140px]">
                  {t('asset.owner')}
                </th>
                <th className="text-left font-semibold px-[12px] py-[8px] w-[110px]">
                  {t('asset.acquiredDate')}
                </th>
                <th className="text-right font-semibold px-[12px] py-[8px] w-[120px]">
                  {t('asset.acquiredPrice')}
                </th>
                <th className="text-left font-semibold px-[12px] py-[8px] w-[100px]">
                  {t('asset.status')}
                </th>
                <th className="w-[90px]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const statusStyle = STATUS_STYLES[item.status]
                const ownerDisplay = item.owner_user_id
                  ? memberMap.get(item.owner_user_id) ?? item.owner_name ?? '—'
                  : item.owner_name ?? '—'
                return (
                  <tr
                    key={item.id}
                    className="border-t border-border2 hover:bg-surf2/50 transition-colors group"
                  >
                    <td className="px-[12px] py-[8px] text-right text-text2 font-semibold">
                      {item.seq_no ?? '—'}
                    </td>
                    <td className="px-[12px] py-[8px] text-text2">
                      {item.management_id ?? '—'}
                    </td>
                    <td className="px-[12px] py-[8px] text-text">
                      <div className="font-semibold">{item.name}</div>
                      {item.serial_number && (
                        <div className="text-[11px] text-text3 mt-[2px] line-clamp-1">
                          {item.serial_number}
                        </div>
                      )}
                    </td>
                    <td className="px-[12px] py-[8px]">
                      <span className="bg-surf2 text-text2 text-[10px] px-[8px] py-[2px] rounded-full font-semibold">
                        {t(CATEGORY_KEY[item.category])}
                      </span>
                    </td>
                    <td className="px-[12px] py-[8px] text-text2">
                      {ownerDisplay}
                    </td>
                    <td className="px-[12px] py-[8px] text-text2">
                      {item.acquired_date ? formatDate(item.acquired_date) : '—'}
                    </td>
                    <td className="px-[12px] py-[8px] text-right text-text2">
                      {item.acquired_price != null
                        ? `¥${item.acquired_price.toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="px-[12px] py-[8px]">
                      <span
                        className={`${statusStyle.bg} ${statusStyle.text} text-[10px] px-[8px] py-[2px] rounded-full font-semibold`}
                      >
                        {t(statusStyle.key)}
                      </span>
                    </td>
                    <td className="px-[12px] py-[8px]">
                      <div className="flex items-center justify-end gap-[4px] opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Modal */}
      {editing !== undefined && (
        <ItemEditor item={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  )
}
