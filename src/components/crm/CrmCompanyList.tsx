'use client'

import { useState, useMemo } from 'react'
import { Pencil } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useCrmCompanies, useCreateCrmCompany, useUpdateCrmCompany, useDeleteCrmCompany } from '@/hooks/useCrm'
import { Pagination } from '@/components/shared'
import { SourceChannelFilter, SourceChannelBadge } from './SourceChannelFilter'
import { type SourceChannel } from '@/lib/crm/source-resolver'
import type { CrmCompanyFilters, CrmCompany } from '@/types/crm'

const TYPE_BADGE: Record<string, string> = {
  prospect: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  customer: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  partner: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  vendor: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  competitor: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
}

const TIER_BADGE: Record<string, string> = {
  enterprise: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  mid_market: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  smb: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  startup: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
}

export function CrmCompanyList() {
  const { t } = useI18n()
  const [filters, setFilters] = useState<CrmCompanyFilters>({ page: 1, pageSize: 20 })
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterChannel, setFilterChannel] = useState<'all' | SourceChannel>('all')
  const emptyForm = { name: '', domain: '', industry: '', phone: '', website: '', company_type: '', tier: '' }
  const [formData, setFormData] = useState(emptyForm)

  const { data, isLoading } = useCrmCompanies({ ...filters, q: search || undefined })
  const createMutation = useCreateCrmCompany()
  const updateMutation = useUpdateCrmCompany()
  const deleteMutation = useDeleteCrmCompany()

  const companies = data?.data ?? []
  const total = data?.total ?? 0

  const filteredCompanies = useMemo(() => {
    if (filterChannel === 'all') return companies
    return companies.filter(c => c.source_channel === filterChannel)
  }, [companies, filterChannel])

  const handleSubmit = async () => {
    if (!formData.name.trim()) return
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, data: formData })
    } else {
      await createMutation.mutateAsync(formData)
    }
    setFormData(emptyForm)
    setShowForm(false)
    setEditingId(null)
  }

  const startEdit = (c: CrmCompany) => {
    setFormData({
      name: c.name ?? '',
      domain: c.domain ?? '',
      industry: c.industry ?? '',
      phone: c.phone ?? '',
      website: c.website ?? '',
      company_type: c.company_type ?? '',
      tier: c.tier ?? '',
    })
    setEditingId(c.id)
    setShowForm(true)
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
          + {t('crm.companies')}
        </button>
      </div>

      {/* 流入経路フィルタ */}
      <SourceChannelFilter availableSources={companies} value={filterChannel} onChange={setFilterChannel} />

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow space-y-[8px]">
          <h4 className="text-[13px] font-bold text-text">
            {editingId ? `${t('common.edit')}: 企業` : `+ ${t('crm.companies')}`}
          </h4>
          <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder={t('crm.company.name')} className="w-full text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
          <div className="flex gap-[8px]">
            <input type="text" value={formData.domain} onChange={e => setFormData(p => ({...p, domain: e.target.value}))} placeholder={t('crm.company.domain')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
            <input type="text" value={formData.industry} onChange={e => setFormData(p => ({...p, industry: e.target.value}))} placeholder={t('crm.company.industry')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
          </div>
          <div className="flex gap-[8px]">
            <select value={formData.company_type ?? ''} onChange={e => setFormData(p => ({...p, company_type: e.target.value}))} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint">
              <option value="">{t('crm.company.companyType')}</option>
              <option value="prospect">Prospect</option>
              <option value="customer">Customer</option>
              <option value="partner">Partner</option>
              <option value="vendor">Vendor</option>
              <option value="competitor">Competitor</option>
            </select>
            <select value={formData.tier ?? ''} onChange={e => setFormData(p => ({...p, tier: e.target.value}))} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint">
              <option value="">{t('crm.company.tier')}</option>
              <option value="enterprise">Enterprise</option>
              <option value="mid_market">Mid Market</option>
              <option value="smb">SMB</option>
              <option value="startup">Startup</option>
            </select>
          </div>
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
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold">{t('crm.company.name')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden md:table-cell">{t('crm.company.domain')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden md:table-cell">{t('crm.company.industry')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.company.companyType')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.company.tier')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">流入経路</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.company.owner')}</th>
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold w-[120px]"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-[12px] py-[8px]"><div className="h-[16px] bg-surf2 rounded animate-pulse" /></td></tr>
                ))
              ) : filteredCompanies.length === 0 ? (
                <tr><td colSpan={8} className="px-[12px] py-[20px] text-center text-text3">{t('common.noData')}</td></tr>
              ) : (
                filteredCompanies.map(c => (
                  <tr key={c.id} className="border-b border-border2 hover:bg-surf2 transition-colors">
                    <td className="px-[12px] py-[8px] font-medium text-text">{c.name}</td>
                    <td className="px-[12px] py-[8px] text-text2 hidden md:table-cell">{c.domain}</td>
                    <td className="px-[12px] py-[8px] text-text2 hidden md:table-cell">{c.industry}</td>
                    <td className="px-[12px] py-[8px] hidden lg:table-cell">
                      {c.company_type && (
                        <span className={`inline-block px-[6px] py-[2px] rounded-full text-[10px] font-semibold ${TYPE_BADGE[c.company_type] ?? TYPE_BADGE.other}`}>
                          {c.company_type.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="px-[12px] py-[8px] hidden lg:table-cell">
                      {c.tier && (
                        <span className={`inline-block px-[6px] py-[2px] rounded-full text-[10px] font-semibold ${TIER_BADGE[c.tier] ?? ''}`}>
                          {c.tier.replace('_', ' ').toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="px-[12px] py-[8px] hidden lg:table-cell">
                      <SourceChannelBadge channel={c.source_channel} detail={c.source_detail} />
                    </td>
                    <td className="px-[12px] py-[8px] text-text2 hidden lg:table-cell">{c.owner?.name ?? '—'}</td>
                    <td className="px-[12px] py-[8px] text-right">
                      <div className="flex items-center justify-end gap-[6px]">
                        <button onClick={() => startEdit(c)} className="flex items-center gap-[3px] text-[11px] text-mint-dd hover:underline" title={t('common.edit')}>
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
