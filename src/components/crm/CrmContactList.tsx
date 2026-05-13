'use client'

import { useState, useMemo, useRef } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Upload, Pencil } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useCrmContacts, useCreateCrmContact, useUpdateCrmContact, useDeleteCrmContact } from '@/hooks/useCrm'
import { Pagination } from '@/components/shared'
import { toast } from '@/stores/toastStore'
import { SourceChannelFilter, SourceChannelBadge } from './SourceChannelFilter'
import { type SourceChannel } from '@/lib/crm/source-resolver'
import type { CrmContactFilters, CrmContact, LifecycleStage } from '@/types/crm'

const LIFECYCLE_BADGE: Record<LifecycleStage, string> = {
  subscriber: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300',
  lead: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  mql: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  sql: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  opportunity: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  customer: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  evangelist: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
}

const LIFECYCLE_OPTIONS: LifecycleStage[] = ['subscriber', 'lead', 'mql', 'sql', 'opportunity', 'customer', 'evangelist', 'other']

type SortKey = 'name' | 'email' | 'company' | 'lifecycle_stage' | 'lead_score' | 'created_at' | 'last_activity_date'

export function CrmContactList() {
  const { t, locale } = useI18n()
  const [filters, setFilters] = useState<CrmContactFilters>({ page: 1, pageSize: 20 })
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [importing, setImporting] = useState(false)
  const [filterStage, setFilterStage] = useState<string>('')
  const [filterDecisionMaker, setFilterDecisionMaker] = useState<string>('')
  const [filterChannel, setFilterChannel] = useState<'all' | SourceChannel>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const emptyForm = {
    first_name: '', last_name: '', email: '', phone: '', mobile_phone: '',
    company_id: '', lifecycle_stage: 'lead' as LifecycleStage,
    address: '', preferred_language: 'ja', decision_maker: false,
  }
  const [formData, setFormData] = useState(emptyForm)

  const { data, isLoading } = useCrmContacts({ ...filters, q: search || undefined })
  const createMutation = useCreateCrmContact()
  const updateMutation = useUpdateCrmContact()
  const deleteMutation = useDeleteCrmContact()

  const contacts = data?.data ?? []
  const total = data?.total ?? 0

  // Client-side filtering + sorting
  const filtered = useMemo(() => {
    let result = [...contacts]
    if (filterStage) result = result.filter(c => c.lifecycle_stage === filterStage)
    if (filterDecisionMaker === 'yes') result = result.filter(c => c.decision_maker)
    if (filterDecisionMaker === 'no') result = result.filter(c => !c.decision_maker)
    if (filterChannel !== 'all') result = result.filter(c => c.source_channel === filterChannel)
    return result
  }, [contacts, filterStage, filterDecisionMaker, filterChannel])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let va: any, vb: any
      switch (sortKey) {
        case 'name': va = `${a.last_name}${a.first_name}`; vb = `${b.last_name}${b.first_name}`; break
        case 'email': va = a.email; vb = b.email; break
        case 'company': va = a.company?.name ?? ''; vb = b.company?.name ?? ''; break
        case 'lifecycle_stage': va = a.lifecycle_stage; vb = b.lifecycle_stage; break
        case 'lead_score': va = a.lead_score; vb = b.lead_score; break
        case 'last_activity_date': va = a.last_activity_date ?? ''; vb = b.last_activity_date ?? ''; break
        default: va = a.created_at; vb = b.created_at
      }
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'ja')
      return sortAsc ? cmp : -cmp
    })
    return copy
  }, [filtered, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-[10px] h-[10px] text-text3 inline ml-[2px]" />
    return sortAsc
      ? <ArrowUp className="w-[10px] h-[10px] text-mint-dd inline ml-[2px]" />
      : <ArrowDown className="w-[10px] h-[10px] text-mint-dd inline ml-[2px]" />
  }

  // CSV Export
  const handleExport = () => {
    const headers = [
      t('crm.contact.lastName'), t('crm.contact.firstName'), t('crm.contact.email'),
      t('crm.contact.phone'), t('crm.contact.mobilePhone'), t('crm.contact.company'),
      t('crm.contact.lifecycleStage'), t('crm.contact.leadScore'), t('crm.contact.owner'),
      t('crm.contact.address'), t('crm.contact.preferredLanguage'), t('crm.contact.lastActivityDate'),
    ]
    const rows = sorted.map(c => [
      c.last_name, c.first_name, c.email, c.phone, c.mobile_phone ?? '',
      c.company?.name ?? '', c.lifecycle_stage, String(c.lead_score),
      c.owner?.name ?? '', c.address ?? '', c.preferred_language ?? '',
      c.last_activity_date ? c.last_activity_date.slice(0, 10) : '',
    ])
    const esc = (s: string) => s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    const csv = [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `crm_contacts_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(t('crm.contact.exportSuccess'))
  }

  // CSV Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) { toast.error(t('crm.contact.importEmpty')); return }

      const parseCSV = (line: string) => {
        const result: string[] = []
        let current = '', inQuotes = false
        for (const ch of line) {
          if (ch === '"') { inQuotes = !inQuotes; continue }
          if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
          current += ch
        }
        result.push(current.trim())
        return result
      }

      const headers = parseCSV(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
      let imported = 0, errors = 0

      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSV(lines[i])
        if (vals.length < 2) continue
        const record: Record<string, any> = {}
        headers.forEach((h, idx) => {
          const v = vals[idx] ?? ''
          if (!v) return
          // Auto-map common header names
          const map: Record<string, string> = {
            'last_name': 'last_name', '姓': 'last_name', 'lastname': 'last_name',
            'first_name': 'first_name', '名': 'first_name', 'firstname': 'first_name',
            'email': 'email', 'メール': 'email',
            'phone': 'phone', '電話番号': 'phone', '電話': 'phone',
            'mobile_phone': 'mobile_phone', '携帯': 'mobile_phone',
            'company': '_company_name', '企業': '_company_name', '企業名': '_company_name',
            'lifecycle_stage': 'lifecycle_stage', 'ステージ': 'lifecycle_stage',
            'lead_score': 'lead_score', 'スコア': 'lead_score',
            'address': 'address', '住所': 'address',
            'preferred_language': 'preferred_language',
            'title': 'title', '役職': 'title',
            'department': 'department', '部署': 'department',
          }
          const field = map[h] ?? map[h.replace(/_/g, '')] ?? null
          if (field) record[field] = field === 'lead_score' ? parseInt(v) || 0 : v
        })
        if (!record.last_name && !record.first_name && !record.email) continue
        // Remove _company_name (not a real field)
        delete record._company_name
        try {
          const res = await fetch('/api/crm/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record),
          })
          if (res.ok) imported++; else errors++
        } catch { errors++ }
      }
      toast.success(`${t('crm.contact.importDone')}: ${imported} ${t('crm.import.imported')}, ${errors} ${t('crm.import.errors')}`)
    } catch {
      toast.error(t('crm.contact.importFailed'))
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!formData.first_name.trim() && !formData.last_name.trim()) return
    const payload = { ...formData, company_id: formData.company_id || null }
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, data: payload })
      toast.success(t('common.save') + 'しました')
    } else {
      await createMutation.mutateAsync(payload)
    }
    setFormData(emptyForm)
    setShowForm(false)
    setEditingId(null)
  }

  const startEdit = (c: CrmContact) => {
    setFormData({
      first_name: c.first_name ?? '',
      last_name: c.last_name ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      mobile_phone: c.mobile_phone ?? '',
      company_id: c.company_id ?? '',
      lifecycle_stage: c.lifecycle_stage,
      address: c.address ?? '',
      preferred_language: c.preferred_language ?? 'ja',
      decision_maker: !!c.decision_maker,
    })
    setEditingId(c.id)
    setShowForm(true)
    // フォームへスクロール
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  const cancelForm = () => {
    setFormData(emptyForm)
    setShowForm(false)
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-[12px]">
      {/* Header */}
      <div className="flex items-center gap-[8px] flex-wrap">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search') + '...'}
          className="flex-1 min-w-[200px] max-w-[300px] text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
        <button
          onClick={() => {
            if (showForm && !editingId) {
              cancelForm()
            } else {
              setEditingId(null)
              setFormData(emptyForm)
              setShowForm(true)
            }
          }}
          className="px-[14px] py-[6px] text-[12px] font-bold bg-mint-dd text-white rounded-[6px] hover:bg-mint-d"
        >
          + {t('crm.contacts')}
        </button>
        <button onClick={handleExport} disabled={contacts.length === 0} className="flex items-center gap-[4px] px-[10px] py-[6px] text-[11px] font-semibold text-text2 bg-surf2 border border-border2 rounded-[6px] hover:bg-border2 disabled:opacity-50">
          <Download className="w-[12px] h-[12px]" /> CSV
        </button>
        <label className={`flex items-center gap-[4px] px-[10px] py-[6px] text-[11px] font-semibold text-text2 bg-surf2 border border-border2 rounded-[6px] hover:bg-border2 cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload className="w-[12px] h-[12px]" /> {importing ? '...' : t('crm.contact.import')}
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
        </label>
        {/* Filters */}
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="text-[11px] px-[8px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint">
          <option value="">{t('crm.contact.lifecycleStage')}: {t('common.all') || 'All'}</option>
          {LIFECYCLE_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
        <select value={filterDecisionMaker} onChange={e => setFilterDecisionMaker(e.target.value)} className="text-[11px] px-[8px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint">
          <option value="">{t('crm.contact.decisionMaker')}: {t('common.all') || 'All'}</option>
          <option value="yes">✓ {t('crm.contact.decisionMaker')}</option>
          <option value="no">✗ {t('crm.contact.notDecisionMaker')}</option>
        </select>
      </div>

      {/* 流入経路フィルタ */}
      <SourceChannelFilter availableSources={contacts} value={filterChannel} onChange={setFilterChannel} />

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow space-y-[8px]">
          <h4 className="text-[13px] font-bold text-text">
            {editingId ? `${t('common.edit')}: コンタクト` : `+ ${t('crm.contacts')}`}
          </h4>
          <div className="flex gap-[8px]">
            <input type="text" value={formData.last_name} onChange={e => setFormData(p => ({...p, last_name: e.target.value}))} placeholder={t('crm.contact.lastName')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
            <input type="text" value={formData.first_name} onChange={e => setFormData(p => ({...p, first_name: e.target.value}))} placeholder={t('crm.contact.firstName')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
          </div>
          <div className="flex gap-[8px]">
            <input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} placeholder={t('crm.contact.email')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
            <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder={t('crm.contact.phone')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
          </div>
          <div className="flex gap-[8px]">
            <input type="tel" value={formData.mobile_phone} onChange={e => setFormData(p => ({...p, mobile_phone: e.target.value}))} placeholder={t('crm.contact.mobilePhone')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
            <input type="text" value={formData.address} onChange={e => setFormData(p => ({...p, address: e.target.value}))} placeholder={t('crm.contact.address')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
          </div>
          <div className="flex gap-[8px]">
            <select value={formData.lifecycle_stage} onChange={e => setFormData(p => ({...p, lifecycle_stage: e.target.value as LifecycleStage}))} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint">
              {LIFECYCLE_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
            <select value={formData.preferred_language} onChange={e => setFormData(p => ({...p, preferred_language: e.target.value}))} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint">
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>
          <label className="flex items-center gap-[6px] text-[12px] text-text px-[10px] py-[6px]">
            <input type="checkbox" checked={formData.decision_maker} onChange={e => setFormData(p => ({...p, decision_maker: e.target.checked}))} className="rounded" />
            {t('crm.contact.decisionMaker')}
          </label>
          <div className="flex gap-[8px] justify-end">
            <button onClick={cancelForm} className="px-[12px] py-[6px] text-[12px] text-text2 bg-surf2 rounded-[6px]">{t('common.cancel')}</button>
            <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="px-[12px] py-[6px] text-[12px] font-bold text-white bg-mint-dd rounded-[6px] disabled:opacity-50">{t('common.save')}</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-surf2 border-b border-border2">
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold cursor-pointer select-none" onClick={() => toggleSort('name')}>{t('crm.contact.name')} <SortIcon col="name" /></th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort('email')}>{t('crm.contact.email')} <SortIcon col="email" /></th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort('company')}>{t('crm.contact.company')} <SortIcon col="company" /></th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('lifecycle_stage')}>{t('crm.contact.lifecycleStage')} <SortIcon col="lifecycle_stage" /></th>
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('lead_score')}>{t('crm.contact.leadScore')} <SortIcon col="lead_score" /></th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden xl:table-cell">{t('crm.contact.mobilePhone')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden xl:table-cell">{t('crm.source.title')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden xl:table-cell">{t('crm.contact.owner')}</th>
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="px-[12px] py-[8px]"><div className="h-[16px] bg-surf2 rounded animate-pulse" /></td></tr>
                ))
              ) : sorted.length === 0 ? (
                <tr><td colSpan={9} className="px-[12px] py-[20px] text-center text-text3">{t('common.noData')}</td></tr>
              ) : (
                sorted.map(c => (
                  <tr key={c.id} className="border-b border-border2 hover:bg-surf2 transition-colors">
                    <td className="px-[12px] py-[8px] font-medium text-text">
                      {c.last_name} {c.first_name}
                      {c.decision_maker && <span className="ml-[4px] text-[8px] bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 px-[4px] py-[1px] rounded font-bold">DM</span>}
                    </td>
                    <td className="px-[12px] py-[8px] text-text2 hidden md:table-cell">{c.email}</td>
                    <td className="px-[12px] py-[8px] text-text2 hidden md:table-cell">{c.company?.name ?? '—'}</td>
                    <td className="px-[12px] py-[8px] hidden lg:table-cell">
                      <span className={`inline-block px-[6px] py-[2px] rounded-full text-[10px] font-semibold ${LIFECYCLE_BADGE[c.lifecycle_stage] ?? LIFECYCLE_BADGE.other}`}>
                        {c.lifecycle_stage.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-[12px] py-[8px] text-text2 text-right hidden lg:table-cell">{c.lead_score}</td>
                    <td className="px-[12px] py-[8px] text-text2 hidden xl:table-cell">{c.mobile_phone || '—'}</td>
                    <td className="px-[12px] py-[8px] hidden xl:table-cell">
                      <SourceChannelBadge channel={c.source_channel} detail={c.source_detail} />
                    </td>
                    <td className="px-[12px] py-[8px] text-text2 hidden xl:table-cell">{c.owner?.name ?? '—'}</td>
                    <td className="px-[12px] py-[8px] text-right">
                      <div className="flex items-center justify-end gap-[6px]">
                        <button
                          onClick={() => startEdit(c)}
                          className="flex items-center gap-[3px] text-[11px] text-mint-dd hover:underline"
                          title={t('common.edit')}
                        >
                          <Pencil className="w-[10px] h-[10px]" /> {t('common.edit')}
                        </button>
                        <button onClick={() => { if(confirm(t('common.deleteConfirm'))) deleteMutation.mutate(c.id) }} className="text-[11px] text-danger hover:underline">{t('common.delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > (filters.pageSize ?? 20) && (
          <div className="px-[12px] py-[8px] border-t border-border2">
            <Pagination page={filters.page ?? 1} totalCount={total} pageSize={filters.pageSize ?? 20} onPageChange={p => setFilters(f => ({...f, page: p}))} onPageSizeChange={() => {}} />
          </div>
        )}
      </div>
    </div>
  )
}
