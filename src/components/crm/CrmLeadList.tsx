'use client'

import { useState, useMemo } from 'react'
import { Pencil } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useCrmLeads, useCreateCrmLead, useConvertLead, useUpdateCrmLead, useDeleteCrmLead } from '@/hooks/useCrm'
import { Pagination } from '@/components/shared'
import { scoreLead, QUAL_THRESHOLD_PASSING, QUAL_THRESHOLD_HARD_WARN } from '@/lib/crm/qualification'
import { SourceChannelFilter, SourceChannelBadge } from './SourceChannelFilter'
import { type SourceChannel } from '@/lib/crm/source-resolver'
import type { CrmLeadFilters, LeadStatus, CrmLead } from '@/types/crm'

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-purple-100 text-purple-700',
  qualified: 'bg-green-100 text-green-700',
  unqualified: 'bg-gray-100 text-gray-500',
  converted: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
}

const SOURCES = ['website', 'referral', 'cold_call', 'email', 'social', 'event', 'other'] as const

export function CrmLeadList() {
  const { t } = useI18n()
  const [filters, setFilters] = useState<CrmLeadFilters>({ page: 1, pageSize: 20 })
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterChannel, setFilterChannel] = useState<'all' | SourceChannel>('all')
  const emptyForm = { title: '', source: 'website', estimated_value: 0, sales_contribution: 0, description: '', status: 'new' as LeadStatus }
  const [formData, setFormData] = useState(emptyForm)

  const { data, isLoading } = useCrmLeads({ ...filters, q: search || undefined })
  const createMutation = useCreateCrmLead()
  const convertMutation = useConvertLead()
  const updateMutation = useUpdateCrmLead()
  const deleteMutation = useDeleteCrmLead()
  const [editingSalesContrib, setEditingSalesContrib] = useState<string | null>(null)
  const [editSalesContribValue, setEditSalesContribValue] = useState(0)

  const leads = data?.data ?? []
  const total = data?.total ?? 0

  const filteredLeads = useMemo(() => {
    if (filterChannel === 'all') return leads
    return leads.filter(l => l.source_channel === filterChannel)
  }, [leads, filterChannel])

  const handleSubmit = async () => {
    if (!formData.title.trim()) return
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, data: formData })
    } else {
      await createMutation.mutateAsync(formData)
    }
    setFormData(emptyForm)
    setShowForm(false)
    setEditingId(null)
  }

  const startEdit = (l: CrmLead) => {
    setFormData({
      title: l.title ?? '',
      source: l.source ?? 'website',
      estimated_value: l.estimated_value ?? 0,
      sales_contribution: l.sales_contribution ?? 0,
      description: l.description ?? '',
      status: l.status,
    })
    setEditingId(l.id)
    setShowForm(true)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  const cancelForm = () => {
    setFormData(emptyForm)
    setShowForm(false)
    setEditingId(null)
  }

  const handleConvert = (lead: { id: string; title: string; decision_maker_role: string | null; pain_point: string | null; expected_start_period: string; budget_range: string; next_action_date: string | null; last_contact_date: string | null }) => {
    const result = scoreLead(lead as any)
    let promotion_blocked_reason: string | undefined

    if (result.score >= QUAL_THRESHOLD_PASSING) {
      if (!confirm(t('crm.lead.convertConfirm'))) return
    } else if (result.score >= QUAL_THRESHOLD_HARD_WARN) {
      // 2..3: soft warn
      const msg = t('crm.lead.convertWarn').replace('{score}', String(result.score))
      if (!confirm(msg)) return
    } else {
      // 0..1: hard warn — require reason
      const promptMsg = t('crm.lead.convertHardWarn').replace('{score}', String(result.score))
      const reason = window.prompt(promptMsg)
      if (!reason || !reason.trim()) return
      promotion_blocked_reason = reason.trim()
    }

    convertMutation.mutate({
      id: lead.id,
      data: {
        dealTitle: lead.title,
        ...(promotion_blocked_reason ? { promotion_blocked_reason } : {}),
      } as any,
    })
  }

  const formatCurrency = (v: number) => {
    if (v >= 1000000) return `\u00a5${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `\u00a5${(v / 1000).toFixed(0)}K`
    return `\u00a5${v}`
  }

  return (
    <div className="flex flex-col gap-[12px]">
      {/* Header */}
      <div className="flex items-center gap-[8px]">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('common.search') + '...'}
          className="flex-1 max-w-[300px] text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
        />
        <button
          onClick={() => {
            if (showForm && !editingId) cancelForm()
            else { setEditingId(null); setFormData(emptyForm); setShowForm(true) }
          }}
          className="px-[14px] py-[6px] text-[12px] font-bold bg-mint-dd text-white rounded-[6px] hover:bg-mint-d transition-colors"
        >
          + {t('crm.leads')}
        </button>
      </div>

      {/* 流入経路フィルタ */}
      <SourceChannelFilter availableSources={leads} value={filterChannel} onChange={setFilterChannel} />

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow space-y-[8px]">
          <h4 className="text-[13px] font-bold text-text">
            {editingId ? `${t('common.edit')}: リード` : `+ ${t('crm.leads')}`}
          </h4>
          <input type="text" value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))} placeholder={t('crm.lead.title')} className="w-full text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
          <div className="flex gap-[8px]">
            <select value={formData.source} onChange={e => setFormData(p => ({...p, source: e.target.value}))} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint">
              {SOURCES.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <input type="number" value={formData.estimated_value || ''} onChange={e => setFormData(p => ({...p, estimated_value: Number(e.target.value) || 0}))} placeholder={t('crm.lead.estimatedValue')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
          </div>
          <div className="flex gap-[8px] items-center">
            <label className="text-[12px] text-text2 whitespace-nowrap">営業貢献度 (%)</label>
            <input type="number" min={0} max={100} value={formData.sales_contribution} onChange={e => setFormData(p => ({...p, sales_contribution: Math.min(100, Math.max(0, Number(e.target.value) || 0))}))} className="w-[100px] text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
          </div>
          <textarea value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} placeholder={t('crm.lead.description')} rows={2} className="w-full text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint resize-none" />
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
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold">{t('crm.lead.title')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden md:table-cell">{t('crm.lead.contact')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden md:table-cell">{t('crm.lead.company')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold">{t('crm.lead.status')}</th>
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.lead.estimatedValue')}</th>
                <th className="text-center px-[12px] py-[8px] text-text2 font-semibold hidden md:table-cell w-[60px]">{t('crm.lead.qual.title')}</th>
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.lead.salesContribution')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">流入経路</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.lead.owner')}</th>
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold w-[140px]"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={10} className="px-[12px] py-[8px]"><div className="h-[16px] bg-surf2 rounded animate-pulse" /></td></tr>
                ))
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan={10} className="px-[12px] py-[20px] text-center text-text3">{t('common.noData')}</td></tr>
              ) : (
                filteredLeads.map(l => {
                  const qual = scoreLead(l as any)
                  return (
                  <tr key={l.id} className="border-b border-border2 hover:bg-surf2 transition-colors">
                    <td className="px-[12px] py-[8px] font-medium text-text">{l.title}</td>
                    <td className="px-[12px] py-[8px] text-text2 hidden md:table-cell">
                      {l.contact ? `${l.contact.first_name} ${l.contact.last_name}` : '—'}
                    </td>
                    <td className="px-[12px] py-[8px] text-text2 hidden md:table-cell">{l.company?.name ?? '—'}</td>
                    <td className="px-[12px] py-[8px]">
                      <span className={`inline-block px-[6px] py-[2px] rounded-full text-[10px] font-semibold ${STATUS_COLORS[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-[12px] py-[8px] text-text2 text-right hidden lg:table-cell">{formatCurrency(l.tcv ?? l.estimated_value ?? 0)}</td>
                    <td className="px-[12px] py-[8px] text-center hidden md:table-cell">
                      <span
                        title={t('crm.lead.qual.thresholdHint').replace('{n}', String(QUAL_THRESHOLD_PASSING))}
                        className={`inline-block text-[11px] font-bold px-[6px] py-[1px] rounded-full ${
                          qual.score >= QUAL_THRESHOLD_PASSING
                            ? 'bg-emerald-100 text-emerald-700'
                            : qual.score >= QUAL_THRESHOLD_HARD_WARN
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {qual.score}/6
                      </span>
                    </td>
                    <td
                      className="px-[12px] py-[8px] text-text2 text-right hidden lg:table-cell cursor-pointer hover:bg-mint/10"
                      onClick={() => { setEditingSalesContrib(l.id); setEditSalesContribValue(l.sales_contribution ?? 0) }}
                    >
                      {editingSalesContrib === l.id ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          autoFocus
                          value={editSalesContribValue}
                          onChange={e => setEditSalesContribValue(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                          onBlur={() => { updateMutation.mutate({ id: l.id, data: { sales_contribution: editSalesContribValue } }); setEditingSalesContrib(null) }}
                          onKeyDown={e => { if (e.key === 'Enter') { updateMutation.mutate({ id: l.id, data: { sales_contribution: editSalesContribValue } }); setEditingSalesContrib(null) } if (e.key === 'Escape') setEditingSalesContrib(null) }}
                          onClick={e => e.stopPropagation()}
                          className="w-[60px] text-[12px] px-[4px] py-[2px] bg-surface border border-mint rounded-[4px] outline-none text-right"
                        />
                      ) : (
                        <span>{l.sales_contribution ?? 0}%</span>
                      )}
                    </td>
                    <td className="px-[12px] py-[8px] hidden lg:table-cell">
                      <SourceChannelBadge channel={l.source_channel} detail={l.source_detail} />
                    </td>
                    <td className="px-[12px] py-[8px] text-text2 hidden lg:table-cell">{l.owner?.name ?? '—'}</td>
                    <td className="px-[12px] py-[8px] text-right">
                      <div className="flex items-center justify-end gap-[6px]">
                        {l.status === 'qualified' && (
                          <button
                            onClick={() => handleConvert(l)}
                            disabled={convertMutation.isPending}
                            className={`text-[11px] font-semibold hover:underline disabled:opacity-50 ${
                              qual.score >= QUAL_THRESHOLD_PASSING
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            }`}
                            title={
                              qual.score >= QUAL_THRESHOLD_PASSING
                                ? undefined
                                : t('crm.lead.convertWarn').replace('{score}', String(qual.score))
                            }
                          >
                            {t('crm.lead.convert')}
                          </button>
                        )}
                        <button onClick={() => startEdit(l)} className="flex items-center gap-[3px] text-[11px] text-mint-dd hover:underline" title={t('common.edit')}>
                          <Pencil className="w-[10px] h-[10px]" /> {t('common.edit')}
                        </button>
                        <button onClick={() => { if(confirm(t('common.deleteConfirm'))) deleteMutation.mutate(l.id) }} className="text-[11px] text-danger hover:underline">{t('common.delete')}</button>
                      </div>
                    </td>
                  </tr>
                  )
                })
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
