'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Topbar } from '@/components/layout'
import { useI18n } from '@/hooks/useI18n'
import { useMembers } from '@/hooks/useMembers'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/stores/toastStore'

/** Pipeline access: admin role OR specific privileged users */
const PIPELINE_ALLOWED_NAMES = ['安田', '伊藤', '瀧宮', '渡邊', '渡辺']
function canAccessPipeline(user: { role: string; name: string } | null): boolean {
  if (!user) return false
  if (user.role === 'admin' || user.role === 'director') return true
  return PIPELINE_ALLOWED_NAMES.some((n) => user.name.includes(n))
}

interface PipelineOpportunity {
  id: string
  seq_id: number
  is_new: boolean
  client_type: string
  client_name: string
  referral_source: string
  opportunity_name: string
  sub_opportunity: string
  status: string
  probability: number
  cm_percent: number
  pm_user_id: string | null
  consultant1_user_id: string | null
  consultant2_user_id: string | null
  updated_at?: string
  created_at?: string
  monthly?: Array<{ month: string; revenue: number }>
}

const MONTHS = [
  '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03',
  '2026-04', '2026-05', '2026-06',
  '2026-07', '2026-08', '2026-09',
]

const MONTH_LABELS = [
  'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar',
  'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
]

const STATUS_OPTIONS = ['Firm', 'Likely', 'Win', 'Lost', '']
const STATUS_COLORS: Record<string, string> = {
  Firm: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Likely: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Win: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// Column definitions for selection & copy/paste
const FIELD_COLUMNS = [
  'seq_id', 'is_new', 'client_type', 'client_name', 'referral_source',
  'opportunity_name', 'sub_opportunity', 'status', 'probability', 'cm_percent',
  'pm_user_id', 'consultant1_user_id', 'consultant2_user_id',
] as const
const ALL_COLUMNS = [...FIELD_COLUMNS, ...MONTHS.map(m => `month_${m}`), 'total'] as const
type ColKey = typeof ALL_COLUMNS[number]

function isRecentlyUpdated(opp: PipelineOpportunity, days: number = 7): boolean {
  const ts = opp.updated_at || opp.created_at
  if (!ts) return false
  const updated = new Date(ts)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return updated >= cutoff
}

type TabId = 'list' | 'summary'

export default function PipelinePage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { data: members } = useMembers()
  const [opportunities, setOpportunities] = useState<PipelineOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('list')
  const [sortKey, setSortKey] = useState<string>('seq_id')
  const [sortAsc, setSortAsc] = useState(true)
  const [filterClient, setFilterClient] = useState('')
  const [filterReferral, setFilterReferral] = useState('')
  const [filterOpportunity, setFilterOpportunity] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Selection state
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [selectionAnchor, setSelectionAnchor] = useState<{ rowIdx: number; colIdx: number } | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [selectedCols, setSelectedCols] = useState<Set<number>>(new Set())
  const tableRef = useRef<HTMLTableElement>(null)

  // Unique referral sources for dropdown
  const uniqueReferrals = useMemo(() => {
    const set = new Set(opportunities.map(o => o.referral_source).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [opportunities])

  // Filtered opportunities (applied before sort)
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(o => {
      if (filterClient && !o.client_name.toLowerCase().includes(filterClient.toLowerCase())) return false
      if (filterReferral && o.referral_source !== filterReferral) return false
      if (filterOpportunity && !o.opportunity_name.toLowerCase().includes(filterOpportunity.toLowerCase())) return false
      if (filterStatus && o.status !== filterStatus) return false
      return true
    })
  }, [opportunities, filterClient, filterReferral, filterOpportunity, filterStatus])

  const hasActiveFilter = filterClient || filterReferral || filterOpportunity || filterStatus

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const sortedOpportunities = useMemo(() => {
    const sorted = [...filteredOpportunities].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey] ?? ''
      const bv = (b as unknown as Record<string, unknown>)[sortKey] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') return av - bv
      return String(av).localeCompare(String(bv), 'ja')
    })
    return sortAsc ? sorted : sorted.reverse()
  }, [filteredOpportunities, sortKey, sortAsc])

  // Access control
  if (user && !canAccessPipeline(user)) {
    return (
      <>
        <Topbar title={'💰 ' + t('pipeline.title')} />
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="text-[40px] mb-[12px]">🔒</div>
            <h2 className="text-[16px] font-bold text-text mb-[8px]">アクセス権限がありません</h2>
            <p className="text-[12px] text-text2">パイプライン管理は管理者および特権ユーザーのみ利用可能です。</p>
          </div>
        </div>
      </>
    )
  }

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline')
      if (res.ok) setOpportunities(await res.json())
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const updateField = async (id: string, field: string, value: string | number | boolean | null) => {
    const res = await fetch(`/api/pipeline/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    }).catch(() => null)
    if (res?.ok) {
      setOpportunities((p) => p.map((o) => o.id === id ? { ...o, [field]: value, updated_at: new Date().toISOString() } : o))
    } else { toast.error('Update failed') }
  }

  const updateMonthlyRevenue = async (oppId: string, month: string, revenue: number) => {
    await fetch('/api/pipeline/monthly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunity_id: oppId, month, revenue }),
    }).catch(() => null)
    setOpportunities((p) => p.map((o) => {
      if (o.id !== oppId) return o
      const monthly = [...(o.monthly ?? [])]
      const idx = monthly.findIndex((m) => m.month === month)
      if (idx >= 0) monthly[idx] = { ...monthly[idx], revenue }
      else monthly.push({ month, revenue })
      return { ...o, monthly, updated_at: new Date().toISOString() }
    }))
  }

  const addNew = async () => {
    const maxSeq = opportunities.reduce((max, o) => Math.max(max, o.seq_id), 0)
    const res = await fetch('/api/pipeline', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seq_id: maxSeq + 1, is_new: true, client_type: 'Customer', client_name: '', opportunity_name: '', status: 'Likely', probability: 0, cm_percent: 0 }),
    }).catch(() => null)
    if (res?.ok) { await fetchData(); toast.success('追加しました') }
    else toast.error('追加に失敗しました')
  }

  const deleteOpp = async (id: string, name: string) => {
    if (!window.confirm(`「${name}」を削除しますか？`)) return
    const res = await fetch(`/api/pipeline/${id}`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) { setOpportunities((p) => p.filter((o) => o.id !== id)); toast.success('削除しました') }
    else toast.error('削除に失敗しました')
  }

  const duplicateOpp = async (source: PipelineOpportunity) => {
    const maxSeq = opportunities.reduce((max, o) => Math.max(max, o.seq_id), 0)
    const res = await fetch('/api/pipeline', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seq_id: maxSeq + 1, is_new: source.is_new, client_type: source.client_type ?? 'Customer',
        client_name: source.client_name, referral_source: source.referral_source,
        opportunity_name: source.opportunity_name, sub_opportunity: source.sub_opportunity,
        status: source.status, probability: source.probability, cm_percent: source.cm_percent,
        pm_user_id: source.pm_user_id, consultant1_user_id: source.consultant1_user_id, consultant2_user_id: source.consultant2_user_id,
      }),
    }).catch(() => null)
    if (!res?.ok) { toast.error('複製に失敗しました'); return }
    const newOpp = await res.json()
    const monthlyRows = (source.monthly ?? []).filter((m) => m.revenue > 0).map((m) => ({
      opportunity_id: newOpp.id, month: m.month, revenue: m.revenue,
    }))
    if (monthlyRows.length > 0) {
      await fetch('/api/pipeline/monthly', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(monthlyRows),
      }).catch(() => null)
    }
    await fetchData()
    toast.success('複製しました')
  }

  const getMonthRevenue = (opp: PipelineOpportunity, month: string) => opp.monthly?.find((m) => m.month === month)?.revenue ?? 0
  const getTotal = (opp: PipelineOpportunity) => (opp.monthly ?? []).reduce((s, m) => s + (m.revenue ?? 0), 0)
  const activeMembers = members?.filter((m) => m.is_active) ?? []

  // ===== Cell value helpers for copy/paste =====
  const getCellValue = useCallback((opp: PipelineOpportunity, colKey: ColKey): string => {
    if (colKey.startsWith('month_')) {
      const month = colKey.replace('month_', '')
      return String(getMonthRevenue(opp, month) || 0)
    }
    if (colKey === 'total') return String(getTotal(opp))
    if (colKey === 'is_new') return opp.is_new ? '新' : '既'
    if (colKey === 'pm_user_id' || colKey === 'consultant1_user_id' || colKey === 'consultant2_user_id') {
      const uid = opp[colKey]
      if (!uid) return ''
      return members?.find(m => m.id === uid)?.name ?? uid
    }
    return String((opp as unknown as Record<string, unknown>)[colKey] ?? '')
  }, [members])

  // ===== Selection helpers =====
  const cellKey = (rowId: string, colKey: ColKey) => `${rowId}:${colKey}`

  const isCellSelected = useCallback((rowId: string, colIdx: number): boolean => {
    if (selectedRows.has(rowId)) return true
    if (selectedCols.has(colIdx)) return true
    return selectedCells.has(cellKey(rowId, ALL_COLUMNS[colIdx]))
  }, [selectedCells, selectedRows, selectedCols])

  const handleCellClick = useCallback((rowIdx: number, colIdx: number, e: React.MouseEvent) => {
    const opp = sortedOpportunities[rowIdx]
    if (!opp) return
    const key = cellKey(opp.id, ALL_COLUMNS[colIdx])

    if (e.shiftKey && selectionAnchor) {
      // Range selection
      const minRow = Math.min(selectionAnchor.rowIdx, rowIdx)
      const maxRow = Math.max(selectionAnchor.rowIdx, rowIdx)
      const minCol = Math.min(selectionAnchor.colIdx, colIdx)
      const maxCol = Math.max(selectionAnchor.colIdx, colIdx)
      const newSelection = new Set<string>(e.metaKey || e.ctrlKey ? selectedCells : [])
      for (let r = minRow; r <= maxRow; r++) {
        const o = sortedOpportunities[r]
        if (!o) continue
        for (let c = minCol; c <= maxCol; c++) {
          newSelection.add(cellKey(o.id, ALL_COLUMNS[c]))
        }
      }
      setSelectedCells(newSelection)
      setSelectedRows(new Set())
      setSelectedCols(new Set())
    } else if (e.metaKey || e.ctrlKey) {
      // Toggle single cell
      const newSelection = new Set(selectedCells)
      if (newSelection.has(key)) newSelection.delete(key)
      else newSelection.add(key)
      setSelectedCells(newSelection)
      setSelectedRows(new Set())
      setSelectedCols(new Set())
      setSelectionAnchor({ rowIdx, colIdx })
    } else {
      // Single cell select
      setSelectedCells(new Set([key]))
      setSelectedRows(new Set())
      setSelectedCols(new Set())
      setSelectionAnchor({ rowIdx, colIdx })
    }
  }, [sortedOpportunities, selectionAnchor, selectedCells])

  const handleRowSelect = useCallback((rowId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (e.metaKey || e.ctrlKey) {
      const newRows = new Set(selectedRows)
      if (newRows.has(rowId)) newRows.delete(rowId)
      else newRows.add(rowId)
      setSelectedRows(newRows)
    } else if (e.shiftKey && selectedRows.size > 0) {
      const rowIds = sortedOpportunities.map(o => o.id)
      const lastSelected = [...selectedRows].pop()!
      const lastIdx = rowIds.indexOf(lastSelected)
      const curIdx = rowIds.indexOf(rowId)
      const minIdx = Math.min(lastIdx, curIdx)
      const maxIdx = Math.max(lastIdx, curIdx)
      const newRows = new Set(selectedRows)
      for (let i = minIdx; i <= maxIdx; i++) newRows.add(rowIds[i])
      setSelectedRows(newRows)
    } else {
      setSelectedRows(new Set([rowId]))
    }
    setSelectedCells(new Set())
    setSelectedCols(new Set())
  }, [selectedRows, sortedOpportunities])

  const handleColSelect = useCallback((colIdx: number, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      const newCols = new Set(selectedCols)
      if (newCols.has(colIdx)) newCols.delete(colIdx)
      else newCols.add(colIdx)
      setSelectedCols(newCols)
    } else {
      setSelectedCols(new Set([colIdx]))
    }
    setSelectedCells(new Set())
    setSelectedRows(new Set())
  }, [selectedCols])

  const clearSelection = useCallback(() => {
    setSelectedCells(new Set())
    setSelectedRows(new Set())
    setSelectedCols(new Set())
    setSelectionAnchor(null)
  }, [])

  // ===== Copy/Paste keyboard handler =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'list') return
      // Don't intercept if editing an input
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // Ctrl+C / Cmd+C = Copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault()
        copySelectedCells()
      }
      // Ctrl+V / Cmd+V = Paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault()
        pasteFromClipboard()
      }
      // Ctrl+A / Cmd+A = Select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        const allCells = new Set<string>()
        sortedOpportunities.forEach(o => {
          ALL_COLUMNS.forEach(col => allCells.add(cellKey(o.id, col)))
        })
        setSelectedCells(allCells)
        setSelectedRows(new Set())
        setSelectedCols(new Set())
      }
      // Escape = clear selection
      if (e.key === 'Escape') {
        clearSelection()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  const copySelectedCells = useCallback(() => {
    // Build a grid of selected cells
    const rowOrder = sortedOpportunities.map(o => o.id)
    const selectedRowIds = new Set<string>()
    const selectedColIdxs = new Set<number>()

    // Collect from all selection sources
    selectedRows.forEach(r => selectedRowIds.add(r))
    selectedCols.forEach(c => selectedColIdxs.add(c))
    selectedCells.forEach(key => {
      const [rowId, colKey] = key.split(':') as [string, ColKey]
      selectedRowIds.add(rowId)
      selectedColIdxs.add(ALL_COLUMNS.indexOf(colKey))
    })

    if (selectedRowIds.size === 0) return

    // If full rows selected, include all columns
    if (selectedRows.size > 0 && selectedCols.size === 0 && selectedCells.size === 0) {
      ALL_COLUMNS.forEach((_, i) => selectedColIdxs.add(i))
    }
    // If full columns selected, include all rows
    if (selectedCols.size > 0 && selectedRows.size === 0 && selectedCells.size === 0) {
      rowOrder.forEach(r => selectedRowIds.add(r))
    }

    const orderedRows = rowOrder.filter(r => selectedRowIds.has(r))
    const orderedCols = [...selectedColIdxs].sort((a, b) => a - b)

    const oppMap = new Map(sortedOpportunities.map(o => [o.id, o]))
    const tsv = orderedRows.map(rowId => {
      const opp = oppMap.get(rowId)!
      return orderedCols.map(ci => getCellValue(opp, ALL_COLUMNS[ci])).join('\t')
    }).join('\n')

    navigator.clipboard.writeText(tsv).then(() => {
      toast.success(`${orderedRows.length}行 × ${orderedCols.length}列 コピーしました`)
    }).catch(() => toast.error('コピーに失敗しました'))
  }, [sortedOpportunities, selectedCells, selectedRows, selectedCols, getCellValue])

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) return

      const rows = text.split('\n').map(r => r.split('\t'))

      // Find the top-left anchor of current selection
      let startRowIdx = Infinity
      let startColIdx = Infinity

      selectedCells.forEach(key => {
        const [rowId, colKey] = key.split(':') as [string, ColKey]
        const ri = sortedOpportunities.findIndex(o => o.id === rowId)
        const ci = ALL_COLUMNS.indexOf(colKey)
        if (ri < startRowIdx) startRowIdx = ri
        if (ci < startColIdx) startColIdx = ci
      })
      selectedRows.forEach(rowId => {
        const ri = sortedOpportunities.findIndex(o => o.id === rowId)
        if (ri < startRowIdx) startRowIdx = ri
        if (startColIdx === Infinity) startColIdx = 0
      })

      if (startRowIdx === Infinity) startRowIdx = 0
      if (startColIdx === Infinity) startColIdx = 0

      const updates: Array<{ id: string; field: string; value: string | number | boolean }> = []

      for (let r = 0; r < rows.length; r++) {
        const rowIdx = startRowIdx + r
        if (rowIdx >= sortedOpportunities.length) break
        const opp = sortedOpportunities[rowIdx]
        for (let c = 0; c < rows[r].length; c++) {
          const colIdx = startColIdx + c
          if (colIdx >= ALL_COLUMNS.length) break
          const colKey = ALL_COLUMNS[colIdx]
          const val = rows[r][c]

          // Skip read-only columns
          if (colKey === 'seq_id' || colKey === 'total') continue

          if (colKey.startsWith('month_')) {
            const month = colKey.replace('month_', '')
            const num = Number(val) || 0
            updateMonthlyRevenue(opp.id, month, num)
          } else if (colKey === 'is_new') {
            updateField(opp.id, 'is_new', val === '新' || val === 'true' || val === '1')
          } else if (colKey === 'probability' || colKey === 'cm_percent') {
            updateField(opp.id, colKey, Number(val) || 0)
          } else {
            updates.push({ id: opp.id, field: colKey, value: val })
            updateField(opp.id, colKey, val)
          }
        }
      }

      toast.success(`${rows.length}行 ペーストしました`)
    } catch {
      toast.error('ペーストに失敗しました')
    }
  }, [sortedOpportunities, selectedCells, selectedRows])

  // ===== Summary calculations =====
  const summary = useMemo(() => {
    const monthlyRevenue = MONTHS.map((m) => filteredOpportunities.reduce((s, o) => s + getMonthRevenue(o, m), 0))
    const monthlyWeighted = MONTHS.map((m) => filteredOpportunities.reduce((s, o) => s + getMonthRevenue(o, m) * (o.probability / 100), 0))
    const monthlyCM = MONTHS.map((m) => filteredOpportunities.reduce((s, o) => s + getMonthRevenue(o, m) * (o.cm_percent / 100), 0))
    const monthlyWeightedCM = MONTHS.map((m) => filteredOpportunities.reduce((s, o) => s + getMonthRevenue(o, m) * (o.probability / 100) * (o.cm_percent / 100), 0))

    // By status
    const byStatus = STATUS_OPTIONS.filter(Boolean).map((status) => {
      const filtered = filteredOpportunities.filter((o) => o.status === status)
      const rev = filtered.reduce((s, o) => s + getTotal(o), 0)
      const weighted = filtered.reduce((s, o) => s + getTotal(o) * (o.probability / 100), 0)
      const cm = filtered.reduce((s, o) => s + getTotal(o) * (o.cm_percent / 100), 0)
      return { status, count: filtered.length, revenue: rev, weighted, cm }
    })

    // By PM
    const pmIds = [...new Set(filteredOpportunities.map((o) => o.pm_user_id).filter(Boolean))] as string[]
    const byPM = pmIds.map((pmId) => {
      const filtered = filteredOpportunities.filter((o) => o.pm_user_id === pmId)
      const name = members?.find((m) => m.id === pmId)?.name ?? pmId
      const rev = filtered.reduce((s, o) => s + getTotal(o), 0)
      const weighted = filtered.reduce((s, o) => s + getTotal(o) * (o.probability / 100), 0)
      const cm = filtered.reduce((s, o) => s + getTotal(o) * (o.cm_percent / 100), 0)
      return { name, count: filtered.length, revenue: rev, weighted, cm }
    }).sort((a, b) => b.revenue - a.revenue)

    // Top 10 by client (aggregate across all opportunities for same client)
    const clientMap = new Map<string, { revenue: number; weighted: number; cm: number; count: number }>()
    filteredOpportunities.forEach((o) => {
      const name = o.client_name || '(未設定)'
      const existing = clientMap.get(name) ?? { revenue: 0, weighted: 0, cm: 0, count: 0 }
      const total = getTotal(o)
      existing.revenue += total
      existing.weighted += total * (o.probability / 100)
      existing.cm += total * (o.cm_percent / 100)
      existing.count += 1
      clientMap.set(name, existing)
    })
    const byClient = [...clientMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return { monthlyRevenue, monthlyWeighted, monthlyCM, monthlyWeightedCM, byStatus, byPM, byClient }
  }, [filteredOpportunities, members])

  const totalRevenue = filteredOpportunities.reduce((s, o) => s + getTotal(o), 0)
  const totalWeighted = filteredOpportunities.reduce((s, o) => s + getTotal(o) * (o.probability / 100), 0)
  const totalCM = filteredOpportunities.reduce((s, o) => s + getTotal(o) * (o.cm_percent / 100), 0)
  const totalWeightedCM = filteredOpportunities.reduce((s, o) => s + getTotal(o) * (o.probability / 100) * (o.cm_percent / 100), 0)

  const fmtK = (v: number) => Math.round(v).toLocaleString()

  const tabs = [
    { id: 'list' as TabId, label: '📋 案件一覧' },
    { id: 'summary' as TabId, label: '📊 売上サマリー' },
  ]

  // Selection count display
  const selectionCount = selectedCells.size + (selectedRows.size > 0 ? selectedRows.size * ALL_COLUMNS.length : 0) + (selectedCols.size > 0 ? selectedCols.size * sortedOpportunities.length : 0)

  return (
    <>
      <Topbar title={'💰 ' + t('pipeline.title')}>
        {selectionCount > 0 && activeTab === 'list' && (
          <span className="text-[11px] text-mint font-medium mr-[8px]">
            {selectedRows.size > 0 ? `${selectedRows.size}行` : selectedCols.size > 0 ? `${selectedCols.size}列` : `${selectedCells.size}セル`} 選択中
            <button onClick={clearSelection} className="ml-[6px] text-text3 hover:text-danger text-[10px]">✕</button>
          </span>
        )}
        <button onClick={() => {
          const memberName = (uid: string | null) => { if (!uid || !members) return ''; return members.find((m) => m.id === uid)?.name ?? '' }
          const header = ['ID','新/既','区分','クライアント','紹介先','案件名','サブ案件','状況','勝率%','CM%','PM','コンサル1','コンサル2',...MONTH_LABELS,'合計','加重合計','粗利'].join(',')
          const rows = filteredOpportunities.map((o) => {
            const total = getTotal(o)
            return [o.seq_id, o.is_new ? '新' : '既', o.client_type ?? 'Customer', `"${o.client_name}"`, `"${o.referral_source}"`, `"${o.opportunity_name}"`, `"${o.sub_opportunity}"`, o.status, o.probability, o.cm_percent, `"${memberName(o.pm_user_id)}"`, `"${memberName(o.consultant1_user_id)}"`, `"${memberName(o.consultant2_user_id)}"`, ...MONTHS.map((m) => getMonthRevenue(o, m)), total, Math.round(total * o.probability / 100), Math.round(total * o.cm_percent / 100)].join(',')
          })
          const csv = '\uFEFF' + header + '\n' + rows.join('\n')
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = `pipeline_${new Date().toISOString().slice(0,10)}.csv`; a.click()
          URL.revokeObjectURL(url)
          toast.success('CSVエクスポート完了')
        }} className="h-[30px] px-[12px] rounded-[6px] text-[12px] font-semibold border border-wf-border text-text2 hover:bg-surf2 transition-colors">
          CSV出力
        </button>
        {activeTab === 'list' && (
          <button onClick={addNew} className="h-[30px] px-[12px] rounded-[6px] text-[12px] font-bold bg-mint text-white hover:bg-mint-d transition-colors">
            {t('pipeline.addNew')}
          </button>
        )}
      </Topbar>

      <div className="p-[12px] md:p-[20px]">
        {/* Tabs */}
        <div className="flex gap-[4px] mb-[12px] border-b border-border2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-[16px] py-[8px] text-[12px] font-medium transition-colors border-b-2 -mb-[1px] ${
                activeTab === tab.id ? 'border-mint text-mint' : 'border-transparent text-text3 hover:text-text2'
              }`}
            >{tab.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-[40px] text-[13px] text-text3">Loading...</div>
        ) : activeTab === 'list' ? (
          /* ===== LIST TAB ===== */
          <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}
            onClick={(e) => { if ((e.target as HTMLElement).closest('table') === null) clearSelection() }}
          >
            {/* Selection hints bar */}
            <div className="px-[12px] py-[4px] bg-surf2/50 border-b border-border2 text-[10px] text-text3 flex gap-[12px]">
              <span>Click: セル選択</span>
              <span>Shift+Click: 範囲選択</span>
              <span>⌘/Ctrl+Click: 複数選択</span>
              <span>⌘/Ctrl+C: コピー</span>
              <span>⌘/Ctrl+V: ペースト</span>
              <span>⌘/Ctrl+A: 全選択</span>
            </div>
            <table ref={tableRef} className="text-left text-[11px]" style={{ tableLayout: 'auto', minWidth: '1900px' }}>
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-border2 bg-surf2">
                  <th className="px-[4px] py-[8px] font-semibold text-text3 sticky left-0 bg-surf2 z-30 w-[24px]">
                    <input type="checkbox"
                      checked={selectedRows.size === sortedOpportunities.length && sortedOpportunities.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedRows(new Set(sortedOpportunities.map(o => o.id)))
                        else setSelectedRows(new Set())
                        setSelectedCells(new Set())
                        setSelectedCols(new Set())
                      }}
                      className="accent-mint w-[12px] h-[12px]"
                    />
                  </th>
                  {/* Column headers with column-select on right-click / ctrl+click */}
                  <th className="px-[4px] py-[8px] font-semibold text-text2 sticky left-[24px] bg-surf2 z-30 w-[30px] cursor-pointer hover:text-mint select-none"
                    onClick={(e) => { if (e.ctrlKey || e.metaKey) { handleColSelect(0, e) } else { handleSort('seq_id') } }}>
                    ID{sortKey === 'seq_id' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 cursor-pointer hover:text-mint select-none" onClick={(e) => { if (e.ctrlKey || e.metaKey) handleColSelect(1, e); else handleSort('is_new') }}>新{sortKey === 'is_new' ? (sortAsc ? ' ▲' : ' ▼') : ''}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 cursor-pointer hover:text-mint select-none" onClick={(e) => { if (e.ctrlKey || e.metaKey) handleColSelect(2, e); else handleSort('client_type') }}>区分{sortKey === 'client_type' ? (sortAsc ? ' ▲' : ' ▼') : ''}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 min-w-[120px] cursor-pointer hover:text-mint select-none" onClick={(e) => { if (e.ctrlKey || e.metaKey) handleColSelect(3, e); else handleSort('client_name') }}>{t('pipeline.client')}{sortKey === 'client_name' ? (sortAsc ? ' ▲' : ' ▼') : ''}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 cursor-pointer hover:text-mint select-none" onClick={(e) => { if (e.ctrlKey || e.metaKey) handleColSelect(4, e); else handleSort('referral_source') }}>{t('pipeline.referral')}{sortKey === 'referral_source' ? (sortAsc ? ' ▲' : ' ▼') : ''}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 min-w-[120px] cursor-pointer hover:text-mint select-none" onClick={(e) => { if (e.ctrlKey || e.metaKey) handleColSelect(5, e); else handleSort('opportunity_name') }}>{t('pipeline.opportunity')}{sortKey === 'opportunity_name' ? (sortAsc ? ' ▲' : ' ▼') : ''}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 cursor-pointer hover:text-mint select-none" onClick={(e) => { if (e.ctrlKey || e.metaKey) handleColSelect(6, e); else handleSort('sub_opportunity') }}>{t('pipeline.subOpp')}{sortKey === 'sub_opportunity' ? (sortAsc ? ' ▲' : ' ▼') : ''}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 cursor-pointer hover:text-mint select-none" onClick={(e) => { if (e.ctrlKey || e.metaKey) handleColSelect(7, e); else handleSort('status') }}>{t('pipeline.status')}{sortKey === 'status' ? (sortAsc ? ' ▲' : ' ▼') : ''}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 cursor-pointer hover:text-mint select-none" onClick={(e) => { if (e.ctrlKey || e.metaKey) handleColSelect(8, e); else handleSort('probability') }}>勝率{sortKey === 'probability' ? (sortAsc ? ' ▲' : ' ▼') : ''}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 cursor-pointer hover:text-mint select-none" onClick={(e) => { if (e.ctrlKey || e.metaKey) handleColSelect(9, e); else handleSort('cm_percent') }}>CM%{sortKey === 'cm_percent' ? (sortAsc ? ' ▲' : ' ▼') : ''}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2">PM</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2">C1</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2">C2</th>
                  {MONTH_LABELS.map((l, i) => (
                    <th key={MONTHS[i]} className="px-[4px] py-[8px] font-semibold text-text2 text-center min-w-[55px] cursor-pointer hover:text-mint select-none"
                      onClick={(e) => { if (e.ctrlKey || e.metaKey) handleColSelect(FIELD_COLUMNS.length + i, e) }}
                    >{l}</th>
                  ))}
                  <th className="px-[6px] py-[8px] font-semibold text-mint text-right">{t('pipeline.total')}</th>
                </tr>
                {/* Filter row */}
                <tr className="border-b border-border2 bg-surf2/50">
                  <th className="sticky left-0 bg-surf2/50 z-30"></th>
                  <th className="sticky left-[24px] bg-surf2/50 z-30"></th>
                  <th></th>
                  <th></th>
                  <th className="px-[4px] py-[4px]">
                    <input type="text" value={filterClient} onChange={(e) => setFilterClient(e.target.value)} placeholder="絞り込み..." className="w-full text-[10px] text-text bg-surface border border-wf-border rounded px-1.5 py-1 focus:outline-none focus:border-mint" />
                  </th>
                  <th className="px-[4px] py-[4px]">
                    <select value={filterReferral} onChange={(e) => setFilterReferral(e.target.value)} className="w-full text-[10px] text-text bg-surface border border-wf-border rounded px-1 py-1 focus:outline-none focus:border-mint">
                      <option value="">すべて</option>
                      {uniqueReferrals.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </th>
                  <th className="px-[4px] py-[4px]">
                    <input type="text" value={filterOpportunity} onChange={(e) => setFilterOpportunity(e.target.value)} placeholder="絞り込み..." className="w-full text-[10px] text-text bg-surface border border-wf-border rounded px-1.5 py-1 focus:outline-none focus:border-mint" />
                  </th>
                  <th></th>
                  <th className="px-[4px] py-[4px]">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full text-[10px] text-text bg-surface border border-wf-border rounded px-1 py-1 focus:outline-none focus:border-mint">
                      <option value="">すべて</option>
                      <option value="Firm">Firm</option>
                      <option value="Likely">Likely</option>
                      <option value="Win">Win</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </th>
                  <th colSpan={5}></th>
                  <th colSpan={13} className="px-[4px] py-[4px] text-right">
                    {hasActiveFilter && (
                      <button onClick={() => { setFilterClient(''); setFilterReferral(''); setFilterOpportunity(''); setFilterStatus('') }} className="text-[10px] text-mint hover:text-mint-d font-semibold">クリア</button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedOpportunities.length === 0 ? (
                  <tr><td colSpan={27} className="text-center py-[20px] text-text3">{t('pipeline.noData')}</td></tr>
                ) : sortedOpportunities.map((opp, rowIdx) => {
                  const isRecent = isRecentlyUpdated(opp)
                  const isRowSelected = selectedRows.has(opp.id)
                  return (
                  <tr key={opp.id}
                    className={`border-b border-border2 transition-colors ${
                      isRowSelected ? 'bg-mint/10 dark:bg-mint/5' :
                      isRecent ? 'bg-yellow-50/70 dark:bg-yellow-900/10' :
                      'hover:bg-surf2/30'
                    }`}
                  >
                    <td className="px-[1px] py-[3px] sticky left-0 bg-surface z-10 text-center">
                      <div className="flex items-center gap-[2px]">
                        <input type="checkbox" checked={isRowSelected}
                          onChange={() => {}}
                          onClick={(e) => handleRowSelect(opp.id, e as unknown as React.MouseEvent)}
                          className="accent-mint w-[12px] h-[12px]"
                        />
                        <button onClick={() => duplicateOpp(opp)} className="text-[10px] text-text3 hover:text-mint transition-colors" title="複製">⧉</button>
                        <button onClick={() => deleteOpp(opp.id, opp.client_name + ' ' + opp.opportunity_name)} className="text-[10px] text-text3 hover:text-danger transition-colors" title="削除">✕</button>
                      </div>
                    </td>
                    <td className={`px-[4px] py-[3px] text-text3 sticky left-[24px] z-10 ${isRowSelected ? 'bg-mint/10' : 'bg-surface'}`}
                      onClick={(e) => handleCellClick(rowIdx, 0, e)}
                    >
                      <div className="flex items-center gap-[3px]">
                        {opp.seq_id}
                        {isRecent && <span className="inline-flex items-center px-[3px] py-[0.5px] rounded text-[8px] font-bold bg-yellow-400 text-yellow-900 animate-pulse">NEW</span>}
                      </div>
                    </td>
                    <td className={`px-[6px] py-[3px] ${isCellSelected(opp.id, 1) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                      onClick={(e) => handleCellClick(rowIdx, 1, e)}
                    ><input type="checkbox" checked={opp.is_new} onChange={(e) => updateField(opp.id, 'is_new', e.target.checked)} className="accent-mint w-[12px] h-[12px]" /></td>
                    <td className={`px-[4px] py-[3px] ${isCellSelected(opp.id, 2) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                      onClick={(e) => handleCellClick(rowIdx, 2, e)}
                    >
                      <select value={opp.client_type ?? 'Customer'} onChange={(e) => updateField(opp.id, 'client_type', e.target.value)} className="text-[10px] text-text bg-transparent outline-none cursor-pointer">
                        <option value="Customer">Customer</option>
                        <option value="Prospect">Prospect</option>
                      </select>
                    </td>
                    <td className={`px-[4px] py-[3px] ${isCellSelected(opp.id, 3) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                      onClick={(e) => handleCellClick(rowIdx, 3, e)}
                    ><input type="text" value={opp.client_name} onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, client_name: e.target.value } : o))} onBlur={(e) => updateField(opp.id, 'client_name', e.target.value)} className="w-full text-[11px] text-text bg-transparent border-b border-transparent focus:border-mint outline-none" /></td>
                    <td className={`px-[4px] py-[3px] ${isCellSelected(opp.id, 4) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                      onClick={(e) => handleCellClick(rowIdx, 4, e)}
                    ><input type="text" value={opp.referral_source} onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, referral_source: e.target.value } : o))} onBlur={(e) => updateField(opp.id, 'referral_source', e.target.value)} className="w-full text-[11px] text-text bg-transparent border-b border-transparent focus:border-mint outline-none" /></td>
                    <td className={`px-[4px] py-[3px] ${isCellSelected(opp.id, 5) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                      onClick={(e) => handleCellClick(rowIdx, 5, e)}
                    ><input type="text" value={opp.opportunity_name} onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, opportunity_name: e.target.value } : o))} onBlur={(e) => updateField(opp.id, 'opportunity_name', e.target.value)} className="w-full text-[11px] text-text bg-transparent border-b border-transparent focus:border-mint outline-none" /></td>
                    <td className={`px-[4px] py-[3px] ${isCellSelected(opp.id, 6) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                      onClick={(e) => handleCellClick(rowIdx, 6, e)}
                    ><input type="text" value={opp.sub_opportunity} onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, sub_opportunity: e.target.value } : o))} onBlur={(e) => updateField(opp.id, 'sub_opportunity', e.target.value)} className="w-full text-[11px] text-text bg-transparent border-b border-transparent focus:border-mint outline-none" /></td>
                    <td className={`px-[4px] py-[3px] ${isCellSelected(opp.id, 7) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                      onClick={(e) => handleCellClick(rowIdx, 7, e)}
                    >
                      <select value={opp.status} onChange={(e) => updateField(opp.id, 'status', e.target.value)} className={`text-[10px] rounded-full px-[5px] py-[1px] font-semibold border cursor-pointer ${STATUS_COLORS[opp.status] ?? 'bg-surf2 text-text2'}`}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || '-'}</option>)}
                      </select>
                    </td>
                    <td className={`px-[4px] py-[3px] ${isCellSelected(opp.id, 8) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                      onClick={(e) => handleCellClick(rowIdx, 8, e)}
                    ><input type="number" min={0} max={100} value={opp.probability} onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, probability: Number(e.target.value) } : o))} onBlur={(e) => updateField(opp.id, 'probability', Number(e.target.value))} className="w-[35px] text-[11px] text-text text-center bg-transparent border-b border-transparent focus:border-mint outline-none" />%</td>
                    <td className={`px-[4px] py-[3px] ${isCellSelected(opp.id, 9) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                      onClick={(e) => handleCellClick(rowIdx, 9, e)}
                    ><input type="number" min={0} max={100} value={opp.cm_percent} onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, cm_percent: Number(e.target.value) } : o))} onBlur={(e) => updateField(opp.id, 'cm_percent', Number(e.target.value))} className="w-[35px] text-[11px] text-text text-center bg-transparent border-b border-transparent focus:border-mint outline-none" />%</td>
                    <td className={`px-[4px] py-[3px] ${isCellSelected(opp.id, 10) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                      onClick={(e) => handleCellClick(rowIdx, 10, e)}
                    ><select value={opp.pm_user_id ?? ''} onChange={(e) => updateField(opp.id, 'pm_user_id', e.target.value || null)} className="text-[10px] text-text bg-transparent outline-none cursor-pointer max-w-[70px]"><option value="">-</option>{activeMembers.map((m) => <option key={m.id} value={m.id}>{m.name_short ?? m.name}</option>)}</select></td>
                    <td className={`px-[4px] py-[3px] ${isCellSelected(opp.id, 11) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                      onClick={(e) => handleCellClick(rowIdx, 11, e)}
                    ><select value={opp.consultant1_user_id ?? ''} onChange={(e) => updateField(opp.id, 'consultant1_user_id', e.target.value || null)} className="text-[10px] text-text bg-transparent outline-none cursor-pointer max-w-[70px]"><option value="">-</option>{activeMembers.map((m) => <option key={m.id} value={m.id}>{m.name_short ?? m.name}</option>)}</select></td>
                    <td className={`px-[4px] py-[3px] ${isCellSelected(opp.id, 12) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                      onClick={(e) => handleCellClick(rowIdx, 12, e)}
                    ><select value={opp.consultant2_user_id ?? ''} onChange={(e) => updateField(opp.id, 'consultant2_user_id', e.target.value || null)} className="text-[10px] text-text bg-transparent outline-none cursor-pointer max-w-[70px]"><option value="">-</option>{activeMembers.map((m) => <option key={m.id} value={m.id}>{m.name_short ?? m.name}</option>)}</select></td>
                    {MONTHS.map((month, mi) => {
                      const colIdx = FIELD_COLUMNS.length + mi
                      return (
                      <td key={month} className={`px-[2px] py-[3px] ${isCellSelected(opp.id, colIdx) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                        onClick={(e) => handleCellClick(rowIdx, colIdx, e)}
                      >
                        <input type="number" min={0} step={1} value={getMonthRevenue(opp, month) || ''} placeholder="0"
                          onChange={(e) => { const v = Number(e.target.value); setOpportunities((p) => p.map((o) => { if (o.id !== opp.id) return o; const monthly = [...(o.monthly ?? [])]; const idx = monthly.findIndex((m) => m.month === month); if (idx >= 0) monthly[idx] = { ...monthly[idx], revenue: v }; else monthly.push({ month, revenue: v }); return { ...o, monthly } })) }}
                          onBlur={(e) => updateMonthlyRevenue(opp.id, month, Number(e.target.value))}
                          className="w-[50px] text-[10px] text-text text-right bg-transparent border-b border-transparent focus:border-mint outline-none"
                        />
                      </td>
                    )})}
                    <td className={`px-[6px] py-[3px] text-right font-bold text-mint text-[11px] ${isCellSelected(opp.id, ALL_COLUMNS.length - 1) ? 'bg-mint/15 ring-1 ring-mint/40' : ''}`}
                      onClick={(e) => handleCellClick(rowIdx, ALL_COLUMNS.length - 1, e)}
                    >{fmtK(getTotal(opp))}</td>
                  </tr>
                )})}
                {/* Totals */}
                {filteredOpportunities.length > 0 && (
                  <tr className="border-t-2 border-mint bg-surf2/50 font-bold">
                    <td colSpan={14} className="px-[6px] py-[6px] text-[11px] text-text sticky left-0 bg-surf2/50 z-10">{t('pipeline.total')}{hasActiveFilter && <span className="ml-[4px] text-[9px] text-warn font-normal">(フィルター適用中)</span>}</td>
                    {MONTHS.map((m) => <td key={m} className="px-[2px] py-[6px] text-[10px] text-mint text-right">{fmtK(filteredOpportunities.reduce((s, o) => s + getMonthRevenue(o, m), 0))}</td>)}
                    <td className="px-[6px] py-[6px] text-right text-[12px] text-mint">{fmtK(totalRevenue)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ===== SUMMARY TAB ===== */
          <div className="space-y-[16px]">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
              <div className="bg-surface border border-border2 rounded-[10px] p-[14px] shadow">
                <div className="text-[10px] text-text2 mb-[4px]">売上高 (ウェイトなし)</div>
                <div className="text-[20px] font-bold text-text">{fmtK(totalRevenue)}<span className="text-[11px] text-text3 ml-[2px]">千円</span></div>
              </div>
              <div className="bg-surface border border-border2 rounded-[10px] p-[14px] shadow">
                <div className="text-[10px] text-text2 mb-[4px]">売上高 (加重平均)</div>
                <div className="text-[20px] font-bold text-mint">{fmtK(totalWeighted)}<span className="text-[11px] text-text3 ml-[2px]">千円</span></div>
              </div>
              <div className="bg-surface border border-border2 rounded-[10px] p-[14px] shadow">
                <div className="text-[10px] text-text2 mb-[4px]">粗利 (ウェイトなし)</div>
                <div className="text-[20px] font-bold text-text">{fmtK(totalCM)}<span className="text-[11px] text-text3 ml-[2px]">千円</span></div>
              </div>
              <div className="bg-surface border border-border2 rounded-[10px] p-[14px] shadow">
                <div className="text-[10px] text-text2 mb-[4px]">粗利 (加重平均)</div>
                <div className="text-[20px] font-bold text-mint">{fmtK(totalWeightedCM)}<span className="text-[11px] text-text3 ml-[2px]">千円</span></div>
              </div>
            </div>

            {/* Top 10 Clients Ranking */}
            <div className="bg-surface border border-border2 rounded-[10px] shadow">
              <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
                <h3 className="text-[13px] font-bold text-text">🏆 クライアント別 売上 Top 10（千円）</h3>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border2 bg-surf2/50">
                    <th className="px-[10px] py-[6px] text-center text-text2 font-semibold w-[40px]">順位</th>
                    <th className="px-[10px] py-[6px] text-left text-text2 font-semibold">クライアント</th>
                    <th className="px-[10px] py-[6px] text-center text-text2 font-semibold">案件数</th>
                    <th className="px-[10px] py-[6px] text-right text-text2 font-semibold">売上高</th>
                    <th className="px-[10px] py-[6px] text-right text-text2 font-semibold">加重売上</th>
                    <th className="px-[10px] py-[6px] text-right text-text2 font-semibold">粗利</th>
                    <th className="px-[10px] py-[6px] text-right text-text2 font-semibold">構成比</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byClient.map((client, idx) => {
                    const pct = totalRevenue > 0 ? (client.revenue / totalRevenue * 100) : 0
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''
                    return (
                      <tr key={client.name} className="border-b border-border2 hover:bg-surf2/30">
                        <td className="px-[10px] py-[6px] text-center font-bold text-text">
                          {medal || (idx + 1)}
                        </td>
                        <td className="px-[10px] py-[6px] font-medium text-text">{client.name}</td>
                        <td className="px-[10px] py-[6px] text-center text-text2">{client.count}</td>
                        <td className="px-[10px] py-[6px] text-right font-medium text-text">{fmtK(client.revenue)}</td>
                        <td className="px-[10px] py-[6px] text-right font-medium text-mint">{fmtK(client.weighted)}</td>
                        <td className="px-[10px] py-[6px] text-right font-medium text-text">{fmtK(client.cm)}</td>
                        <td className="px-[10px] py-[6px] text-right">
                          <div className="flex items-center justify-end gap-[6px]">
                            <div className="w-[60px] h-[6px] bg-border2 rounded-full overflow-hidden">
                              <div className="h-full bg-mint rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="text-[10px] text-text2 w-[36px] text-right">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {summary.byClient.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-[12px] text-text3">データなし</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Monthly breakdown table */}
            <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-x-auto">
              <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
                <h3 className="text-[13px] font-bold text-text">月別売上・粗利サマリー（千円）</h3>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border2 bg-surf2/50">
                    <th className="px-[10px] py-[6px] text-left text-text2 font-semibold w-[180px]">指標</th>
                    {MONTH_LABELS.map((l, i) => <th key={MONTHS[i]} className="px-[4px] py-[6px] text-center text-text2 font-semibold">{l}</th>)}
                    <th className="px-[10px] py-[6px] text-right text-mint font-bold">合計</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border2">
                    <td className="px-[10px] py-[6px] font-medium text-text">売上高（ウェイトなし）</td>
                    {summary.monthlyRevenue.map((v, i) => <td key={i} className="px-[4px] py-[6px] text-center text-text">{fmtK(v)}</td>)}
                    <td className="px-[10px] py-[6px] text-right font-bold text-text">{fmtK(totalRevenue)}</td>
                  </tr>
                  <tr className="border-b border-border2 bg-mint-ll/20 dark:bg-mint-dd/10">
                    <td className="px-[10px] py-[6px] font-medium text-mint">売上高（加重: 売上×勝率）</td>
                    {summary.monthlyWeighted.map((v, i) => <td key={i} className="px-[4px] py-[6px] text-center text-mint font-semibold">{fmtK(v)}</td>)}
                    <td className="px-[10px] py-[6px] text-right font-bold text-mint">{fmtK(totalWeighted)}</td>
                  </tr>
                  <tr className="border-b border-border2">
                    <td className="px-[10px] py-[6px] font-medium text-text">粗利（ウェイトなし: 売上×CM%）</td>
                    {summary.monthlyCM.map((v, i) => <td key={i} className="px-[4px] py-[6px] text-center text-text">{fmtK(v)}</td>)}
                    <td className="px-[10px] py-[6px] text-right font-bold text-text">{fmtK(totalCM)}</td>
                  </tr>
                  <tr className="bg-mint-ll/20 dark:bg-mint-dd/10">
                    <td className="px-[10px] py-[6px] font-medium text-mint">粗利（加重: 売上×勝率×CM%）</td>
                    {summary.monthlyWeightedCM.map((v, i) => <td key={i} className="px-[4px] py-[6px] text-center text-mint font-semibold">{fmtK(v)}</td>)}
                    <td className="px-[10px] py-[6px] text-right font-bold text-mint">{fmtK(totalWeightedCM)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* By Status */}
            <div className="bg-surface border border-border2 rounded-[10px] shadow">
              <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
                <h3 className="text-[13px] font-bold text-text">ステータス別サマリー（千円）</h3>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border2 bg-surf2/50">
                    <th className="px-[10px] py-[6px] text-left text-text2">ステータス</th>
                    <th className="px-[10px] py-[6px] text-center text-text2">件数</th>
                    <th className="px-[10px] py-[6px] text-right text-text2">売上高</th>
                    <th className="px-[10px] py-[6px] text-right text-text2">加重売上</th>
                    <th className="px-[10px] py-[6px] text-right text-text2">粗利</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byStatus.map((s) => (
                    <tr key={s.status} className="border-b border-border2 hover:bg-surf2/30">
                      <td className="px-[10px] py-[6px]"><span className={`text-[10px] rounded-full px-[6px] py-[1px] font-semibold border ${STATUS_COLORS[s.status] ?? ''}`}>{s.status}</span></td>
                      <td className="px-[10px] py-[6px] text-center">{s.count}</td>
                      <td className="px-[10px] py-[6px] text-right font-medium">{fmtK(s.revenue)}</td>
                      <td className="px-[10px] py-[6px] text-right font-medium text-mint">{fmtK(s.weighted)}</td>
                      <td className="px-[10px] py-[6px] text-right font-medium">{fmtK(s.cm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By PM */}
            <div className="bg-surface border border-border2 rounded-[10px] shadow">
              <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
                <h3 className="text-[13px] font-bold text-text">PM別サマリー（千円）</h3>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border2 bg-surf2/50">
                    <th className="px-[10px] py-[6px] text-left text-text2">PM</th>
                    <th className="px-[10px] py-[6px] text-center text-text2">件数</th>
                    <th className="px-[10px] py-[6px] text-right text-text2">売上高</th>
                    <th className="px-[10px] py-[6px] text-right text-text2">加重売上</th>
                    <th className="px-[10px] py-[6px] text-right text-text2">粗利</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byPM.map((pm) => (
                    <tr key={pm.name} className="border-b border-border2 hover:bg-surf2/30">
                      <td className="px-[10px] py-[6px] font-medium">{pm.name}</td>
                      <td className="px-[10px] py-[6px] text-center">{pm.count}</td>
                      <td className="px-[10px] py-[6px] text-right font-medium">{fmtK(pm.revenue)}</td>
                      <td className="px-[10px] py-[6px] text-right font-medium text-mint">{fmtK(pm.weighted)}</td>
                      <td className="px-[10px] py-[6px] text-right font-medium">{fmtK(pm.cm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
