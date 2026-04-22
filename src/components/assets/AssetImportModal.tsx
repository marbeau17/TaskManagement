'use client'

import { useMemo, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useMembers } from '@/hooks/useMembers'
import { useAssets, useBulkUpsertAssets } from '@/hooks/useAssets'
import {
  parseCsv,
  indexHeaders,
  pickColumn,
  cell,
  parseDateCell,
  parseNumberCell,
} from '@/lib/csv-import'
import type { CreateAssetInput } from '@/lib/data/assets'
import type { AssetCategory, AssetStatus } from '@/types/database'
import { toast } from '@/stores/toastStore'

interface Props {
  onClose: () => void
}

interface PreviewRow {
  input: CreateAssetInput
  action: 'insert' | 'update'
  rawOwner: string
}

interface PreviewError {
  line: number
  message: string
}

// Accepted header names (Japanese + English, case-insensitive — normalized
// in csv-import). The first match wins per row.
const HEADERS = {
  seqNo: ['No', 'no', 'seq_no', 'No.'],
  name: ['資産名', 'name', 'asset name', 'asset_name'],
  acquiredDate: ['取得年月日', 'acquired_date', 'acquired', 'date'],
  acquiredPrice: ['取得価格', 'acquired_price', 'price'],
  managementId: ['ラベル名', 'management_id', 'meets id', 'label'],
  owner: ['所有者', 'owner', 'owner_name'],
  category: ['カテゴリ', 'category', '分類'],
  status: ['ステータス', 'status', '状態'],
  serialNumber: ['シリアル番号', 'serial_number', 'serial'],
  location: ['設置場所', 'location'],
  notes: ['備考', 'notes', 'remarks'],
}

// Japanese + English category/status labels → DB enum value
const CATEGORY_LOOKUP: Record<string, AssetCategory> = {
  pc: 'pc',
  monitor: 'monitor',
  モニター: 'monitor',
  tablet: 'tablet',
  タブレット: 'tablet',
  peripheral: 'peripheral',
  周辺機器: 'peripheral',
  furniture: 'furniture',
  什器: 'furniture',
  license: 'license',
  ライセンス: 'license',
  other: 'other',
  その他: 'other',
}

const STATUS_LOOKUP: Record<string, AssetStatus> = {
  in_use: 'in_use',
  '使用中': 'in_use',
  spare: 'spare',
  '予備': 'spare',
  disposed: 'disposed',
  '廃棄': 'disposed',
  loaned: 'loaned',
  '貸出中': 'loaned',
}

function matchCategory(raw: string): AssetCategory | null {
  const v = raw.trim().toLowerCase()
  if (!v) return null
  return CATEGORY_LOOKUP[v] ?? CATEGORY_LOOKUP[raw.trim()] ?? null
}

function matchStatus(raw: string): AssetStatus | null {
  const v = raw.trim().toLowerCase()
  if (!v) return null
  return STATUS_LOOKUP[v] ?? STATUS_LOOKUP[raw.trim()] ?? null
}

export function AssetImportModal({ onClose }: Props) {
  const { t } = useI18n()
  const { data: members } = useMembers()
  const { data: existingAssets } = useAssets()
  const upsertMut = useBulkUpsertAssets()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState<string>('')
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [errors, setErrors] = useState<PreviewError[]>([])
  const [parsing, setParsing] = useState(false)

  const memberByName = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members ?? []) {
      if (m.is_active) map.set(m.name.trim(), m.id)
    }
    return map
  }, [members])

  const existingMgmtIds = useMemo(() => {
    const set = new Set<string>()
    for (const a of existingAssets ?? []) {
      if (a.management_id) set.add(a.management_id)
    }
    return set
  }, [existingAssets])

  const insertCount = preview.filter((p) => p.action === 'insert').length
  const updateCount = preview.filter((p) => p.action === 'update').length

  const handleFile = async (file: File) => {
    setParsing(true)
    setFileName(file.name)
    setPreview([])
    setErrors([])
    try {
      const text = await file.text()
      const { headers, rows } = parseCsv(text)
      if (headers.length === 0) {
        setErrors([{ line: 0, message: t('asset.importErrorEmpty') }])
        return
      }
      const headerIndex = indexHeaders(headers)
      const col = {
        seqNo: pickColumn(headerIndex, HEADERS.seqNo),
        name: pickColumn(headerIndex, HEADERS.name),
        acquiredDate: pickColumn(headerIndex, HEADERS.acquiredDate),
        acquiredPrice: pickColumn(headerIndex, HEADERS.acquiredPrice),
        managementId: pickColumn(headerIndex, HEADERS.managementId),
        owner: pickColumn(headerIndex, HEADERS.owner),
        category: pickColumn(headerIndex, HEADERS.category),
        status: pickColumn(headerIndex, HEADERS.status),
        serialNumber: pickColumn(headerIndex, HEADERS.serialNumber),
        location: pickColumn(headerIndex, HEADERS.location),
        notes: pickColumn(headerIndex, HEADERS.notes),
      }
      if (col.name < 0) {
        setErrors([{ line: 0, message: t('asset.importErrorNoNameColumn') }])
        return
      }

      const nextPreview: PreviewRow[] = []
      const nextErrors: PreviewError[] = []

      rows.forEach((row, i) => {
        const lineNo = i + 2 // 1-based + header row
        const name = cell(row, col.name)
        if (!name) {
          nextErrors.push({ line: lineNo, message: t('asset.importErrorNoName') })
          return
        }

        const rawOwner = cell(row, col.owner)
        const ownerUserId = rawOwner ? memberByName.get(rawOwner.trim()) ?? null : null

        const seqNo = parseNumberCell(cell(row, col.seqNo))
        const price = parseNumberCell(cell(row, col.acquiredPrice))
        const date = parseDateCell(cell(row, col.acquiredDate))
        const managementId = cell(row, col.managementId) || null

        const rawCategory = cell(row, col.category)
        const category = matchCategory(rawCategory) ?? undefined
        const rawStatus = cell(row, col.status)
        const status = matchStatus(rawStatus) ?? undefined

        const input: CreateAssetInput = {
          name,
          seq_no: seqNo != null ? Math.trunc(seqNo) : null,
          acquired_date: date,
          acquired_price: price,
          management_id: managementId,
          owner_name: rawOwner || null,
          owner_user_id: ownerUserId,
          category,
          status,
          serial_number: cell(row, col.serialNumber) || null,
          location: cell(row, col.location) || null,
          notes: cell(row, col.notes) || null,
        }

        const action: PreviewRow['action'] =
          managementId && existingMgmtIds.has(managementId) ? 'update' : 'insert'
        nextPreview.push({ input, action, rawOwner })
      })

      setPreview(nextPreview)
      setErrors(nextErrors)
    } catch (e: any) {
      setErrors([{ line: 0, message: e?.message ?? 'Parse error' }])
    } finally {
      setParsing(false)
    }
  }

  const handleCommit = async () => {
    if (preview.length === 0) return
    try {
      const result = await upsertMut.mutateAsync(preview.map((p) => p.input))
      toast.success(
        t('asset.importSuccess')
          .replace('{created}', String(result.created))
          .replace('{updated}', String(result.updated)),
      )
      onClose()
    } catch {
      // error toast surfaced by the hook
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 w-full max-w-[820px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-[24px] py-[16px] border-b border-border2">
          <h2 className="text-[15px] font-bold text-text">{t('asset.importTitle')}</h2>
          <button
            onClick={onClose}
            className="p-[4px] rounded-[4px] text-text2 hover:text-text hover:bg-surf2 transition-colors"
          >
            <X className="w-[16px] h-[16px]" />
          </button>
        </div>

        <div className="px-[24px] py-[16px] overflow-y-auto flex-1">
          <div className="flex items-center gap-[12px] mb-[16px]">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-semibold bg-surface border border-border2 rounded-[6px] text-text hover:bg-surf2 transition-colors"
            >
              <Upload className="w-[14px] h-[14px]" />
              {t('asset.importSelectFile')}
            </button>
            {fileName && (
              <span className="text-[12px] text-text2 truncate">{fileName}</span>
            )}
          </div>

          {parsing && (
            <div className="text-[13px] text-text3 py-[20px] text-center">
              {t('common.loading')}
            </div>
          )}

          {!parsing && (preview.length > 0 || errors.length > 0) && (
            <>
              <div className="flex items-center gap-[16px] mb-[12px] text-[12px]">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  {t('asset.importNewRows').replace('{n}', String(insertCount))}
                </span>
                <span className="text-blue-700 dark:text-blue-400 font-semibold">
                  {t('asset.importUpdatedRows').replace('{n}', String(updateCount))}
                </span>
                {errors.length > 0 && (
                  <span className="text-danger font-semibold">
                    {t('asset.importErrorRows').replace('{n}', String(errors.length))}
                  </span>
                )}
              </div>

              {errors.length > 0 && (
                <div className="mb-[12px] border border-danger/30 bg-danger/5 rounded-[6px] p-[10px]">
                  <div className="text-[11px] font-semibold text-danger mb-[4px]">
                    {t('asset.importErrorTitle')}
                  </div>
                  <ul className="text-[11px] text-danger space-y-[2px] max-h-[80px] overflow-y-auto">
                    {errors.map((err, i) => (
                      <li key={i}>
                        {t('asset.importErrorLine').replace('{n}', String(err.line))}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.length > 0 && (
                <div className="border border-border2 rounded-[6px] overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead className="bg-surf2 text-text2">
                      <tr>
                        <th className="text-left font-semibold px-[8px] py-[5px] w-[70px]">
                          {t('asset.importAction')}
                        </th>
                        <th className="text-right font-semibold px-[8px] py-[5px] w-[50px]">
                          {t('asset.seqNo')}
                        </th>
                        <th className="text-left font-semibold px-[8px] py-[5px] w-[120px]">
                          {t('asset.managementId')}
                        </th>
                        <th className="text-left font-semibold px-[8px] py-[5px]">
                          {t('asset.name')}
                        </th>
                        <th className="text-left font-semibold px-[8px] py-[5px] w-[110px]">
                          {t('asset.owner')}
                        </th>
                        <th className="text-left font-semibold px-[8px] py-[5px] w-[100px]">
                          {t('asset.acquiredDate')}
                        </th>
                        <th className="text-right font-semibold px-[8px] py-[5px] w-[90px]">
                          {t('asset.acquiredPrice')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((p, i) => (
                        <tr key={i} className="border-t border-border2">
                          <td className="px-[8px] py-[5px]">
                            <span
                              className={`text-[10px] px-[6px] py-[1px] rounded-full font-semibold ${
                                p.action === 'insert'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                              }`}
                            >
                              {p.action === 'insert'
                                ? t('asset.importActionInsert')
                                : t('asset.importActionUpdate')}
                            </span>
                          </td>
                          <td className="px-[8px] py-[5px] text-right text-text2">
                            {p.input.seq_no ?? ''}
                          </td>
                          <td className="px-[8px] py-[5px] text-text2">
                            {p.input.management_id ?? ''}
                          </td>
                          <td className="px-[8px] py-[5px] text-text font-semibold truncate max-w-[200px]">
                            {p.input.name}
                          </td>
                          <td className="px-[8px] py-[5px] text-text2">
                            {p.rawOwner || ''}
                            {p.input.owner_user_id && (
                              <span className="ml-[4px] text-[9px] text-emerald-700 dark:text-emerald-400">
                                ●
                              </span>
                            )}
                          </td>
                          <td className="px-[8px] py-[5px] text-text2">
                            {p.input.acquired_date ?? ''}
                          </td>
                          <td className="px-[8px] py-[5px] text-right text-text2">
                            {p.input.acquired_price != null
                              ? `¥${p.input.acquired_price.toLocaleString()}`
                              : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {!parsing && preview.length === 0 && errors.length === 0 && (
            <div className="text-[12px] text-text3 py-[20px] text-center">
              {t('asset.importHint')}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-[8px] px-[24px] py-[16px] border-t border-border2">
          <button
            onClick={onClose}
            className="px-[14px] py-[7px] text-[12px] text-text2 hover:text-text transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCommit}
            disabled={preview.length === 0 || upsertMut.isPending}
            className="px-[14px] py-[7px] text-[12px] font-semibold bg-mint text-white rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {upsertMut.isPending
              ? t('common.loading')
              : t('asset.importCommit').replace('{n}', String(preview.length))}
          </button>
        </div>
      </div>
    </div>
  )
}
