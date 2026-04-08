'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useCrmLeads, useCreateCrmLead, useConvertLead, useUpdateCrmLead } from '@/hooks/useCrm'
import { Pagination } from '@/components/shared'
import type { CrmLeadFilters, LeadStatus } from '@/types/crm'

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
  const [formData, setFormData] = useState({ title: '', source: 'website', estimated_value: 0, sales_contribution: 0, description: '' })

  const { data, isLoading } = useCrmLeads({ ...filters, q: search || undefined })
  const createMutation = useCreateCrmLead()
  const convertMutation = useConvertLead()
  const updateMutation = useUpdateCrmLead()
  const [editingSalesContrib, setEditingSalesContrib] = useState<string | null>(null)
  const [editSalesContribValue, setEditSalesContribValue] = useState(0)

  const leads = data?.data ?? []
  const total = data?.total ?? 0

  const handleCreate = async () => {
    if (!formData.title.trim()) return
    await createMutation.mutateAsync(formData)
    setFormData({ title: '', source: 'website', estimated_value: 0, sales_contribution: 0, description: '' })
    setShowForm(false)
  }

  const handleConvert = (id: string, title: string) => {
    if (!confirm(t('crm.lead.convertConfirm'))) return
    convertMutation.mutate({ id, data: { dealTitle: title } })
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
          onClick={() => setShowForm(!showForm)}
          className="px-[14px] py-[6px] text-[12px] font-bold bg-mint-dd text-white rounded-[6px] hover:bg-mint-d transition-colors"
        >
          + {t('crm.leads')}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow space-y-[8px]">
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
            <button onClick={() => setShowForm(false)} className="px-[12px] py-[6px] text-[12px] text-text2 bg-surf2 rounded-[6px]">{t('common.cancel')}</button>
            <button onClick={handleCreate} disabled={createMutation.isPending} className="px-[12px] py-[6px] text-[12px] font-bold text-white bg-mint-dd rounded-[6px] disabled:opacity-50">{t('common.save')}</button>
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
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.lead.salesContribution')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.lead.owner')}</th>
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold w-[80px]"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-[12px] py-[8px]"><div className="h-[16px] bg-surf2 rounded animate-pulse" /></td></tr>
                ))
              ) : leads.length === 0 ? (
                <tr><td colSpan={8} className="px-[12px] py-[20px] text-center text-text3">{t('common.noData')}</td></tr>
              ) : (
                leads.map(l => (
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
                    <td className="px-[12px] py-[8px] text-text2 text-right hidden lg:table-cell">{formatCurrency(l.estimated_value)}</td>
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
                    <td className="px-[12px] py-[8px] text-text2 hidden lg:table-cell">{l.owner?.name ?? '—'}</td>
                    <td className="px-[12px] py-[8px] text-right">
                      {l.status === 'qualified' && (
                        <button
                          onClick={() => handleConvert(l.id, l.title)}
                          disabled={convertMutation.isPending}
                          className="text-[11px] font-semibold text-emerald-600 hover:underline disabled:opacity-50"
                        >
                          {t('crm.lead.convert')}
                        </button>
                      )}
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
