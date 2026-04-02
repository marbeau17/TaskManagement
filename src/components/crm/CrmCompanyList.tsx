'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useCrmCompanies, useCreateCrmCompany, useDeleteCrmCompany } from '@/hooks/useCrm'
import { Pagination } from '@/components/shared'
import type { CrmCompanyFilters } from '@/types/crm'

export function CrmCompanyList() {
  const { t } = useI18n()
  const [filters, setFilters] = useState<CrmCompanyFilters>({ page: 1, pageSize: 20 })
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', domain: '', industry: '', phone: '', website: '' })

  const { data, isLoading } = useCrmCompanies({ ...filters, q: search || undefined })
  const createMutation = useCreateCrmCompany()
  const deleteMutation = useDeleteCrmCompany()

  const companies = data?.data ?? []
  const total = data?.total ?? 0

  const handleCreate = async () => {
    if (!formData.name.trim()) return
    await createMutation.mutateAsync(formData)
    setFormData({ name: '', domain: '', industry: '', phone: '', website: '' })
    setShowForm(false)
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
          + {t('crm.companies')}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow space-y-[8px]">
          <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder={t('crm.company.name')} className="w-full text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
          <div className="flex gap-[8px]">
            <input type="text" value={formData.domain} onChange={e => setFormData(p => ({...p, domain: e.target.value}))} placeholder={t('crm.company.domain')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
            <input type="text" value={formData.industry} onChange={e => setFormData(p => ({...p, industry: e.target.value}))} placeholder={t('crm.company.industry')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
          </div>
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
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold">{t('crm.company.name')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden md:table-cell">{t('crm.company.domain')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden md:table-cell">{t('crm.company.industry')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.company.owner')}</th>
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-[12px] py-[8px]"><div className="h-[16px] bg-surf2 rounded animate-pulse" /></td></tr>
                ))
              ) : companies.length === 0 ? (
                <tr><td colSpan={5} className="px-[12px] py-[20px] text-center text-text3">{t('common.noData')}</td></tr>
              ) : (
                companies.map(c => (
                  <tr key={c.id} className="border-b border-border2 hover:bg-surf2 transition-colors">
                    <td className="px-[12px] py-[8px] font-medium text-text">{c.name}</td>
                    <td className="px-[12px] py-[8px] text-text2 hidden md:table-cell">{c.domain}</td>
                    <td className="px-[12px] py-[8px] text-text2 hidden md:table-cell">{c.industry}</td>
                    <td className="px-[12px] py-[8px] text-text2 hidden lg:table-cell">{c.owner?.name ?? '—'}</td>
                    <td className="px-[12px] py-[8px] text-right">
                      <button onClick={() => { if(confirm(t('common.deleteConfirm'))) deleteMutation.mutate(c.id) }} className="text-[11px] text-danger hover:underline">{t('common.delete')}</button>
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
