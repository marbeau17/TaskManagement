'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useCrmContacts, useCreateCrmContact, useDeleteCrmContact } from '@/hooks/useCrm'
import { Pagination } from '@/components/shared'
import type { CrmContactFilters, LifecycleStage } from '@/types/crm'

const LIFECYCLE_BADGE: Record<LifecycleStage, string> = {
  subscriber: 'bg-gray-100 text-gray-700',
  lead: 'bg-blue-100 text-blue-700',
  mql: 'bg-purple-100 text-purple-700',
  sql: 'bg-indigo-100 text-indigo-700',
  opportunity: 'bg-amber-100 text-amber-700',
  customer: 'bg-green-100 text-green-700',
  evangelist: 'bg-emerald-100 text-emerald-700',
  other: 'bg-gray-100 text-gray-600',
}

const LIFECYCLE_OPTIONS: LifecycleStage[] = ['subscriber', 'lead', 'mql', 'sql', 'opportunity', 'customer', 'evangelist', 'other']

export function CrmContactList() {
  const { t } = useI18n()
  const [filters, setFilters] = useState<CrmContactFilters>({ page: 1, pageSize: 20 })
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', company_id: '', lifecycle_stage: 'lead' as LifecycleStage,
  })

  const { data, isLoading } = useCrmContacts({ ...filters, q: search || undefined })
  const createMutation = useCreateCrmContact()
  const deleteMutation = useDeleteCrmContact()

  const contacts = data?.data ?? []
  const total = data?.total ?? 0

  const handleCreate = async () => {
    if (!formData.first_name.trim() && !formData.last_name.trim()) return
    await createMutation.mutateAsync({
      ...formData,
      company_id: formData.company_id || null,
    })
    setFormData({ first_name: '', last_name: '', email: '', phone: '', company_id: '', lifecycle_stage: 'lead' })
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
          + {t('crm.contacts')}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow space-y-[8px]">
          <div className="flex gap-[8px]">
            <input type="text" value={formData.first_name} onChange={e => setFormData(p => ({...p, first_name: e.target.value}))} placeholder={t('crm.contact.firstName')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
            <input type="text" value={formData.last_name} onChange={e => setFormData(p => ({...p, last_name: e.target.value}))} placeholder={t('crm.contact.lastName')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
          </div>
          <div className="flex gap-[8px]">
            <input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} placeholder={t('crm.contact.email')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
            <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder={t('crm.contact.phone')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
          </div>
          <div className="flex gap-[8px]">
            <input type="text" value={formData.company_id} onChange={e => setFormData(p => ({...p, company_id: e.target.value}))} placeholder={t('crm.contact.companyId')} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
            <select value={formData.lifecycle_stage} onChange={e => setFormData(p => ({...p, lifecycle_stage: e.target.value as LifecycleStage}))} className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint">
              {LIFECYCLE_OPTIONS.map(s => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
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
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold">{t('crm.contact.name')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden md:table-cell">{t('crm.contact.email')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden md:table-cell">{t('crm.contact.company')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.contact.lifecycleStage')}</th>
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.contact.leadScore')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.contact.owner')}</th>
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-[12px] py-[8px]"><div className="h-[16px] bg-surf2 rounded animate-pulse" /></td></tr>
                ))
              ) : contacts.length === 0 ? (
                <tr><td colSpan={7} className="px-[12px] py-[20px] text-center text-text3">{t('common.noData')}</td></tr>
              ) : (
                contacts.map(c => (
                  <tr key={c.id} className="border-b border-border2 hover:bg-surf2 transition-colors">
                    <td className="px-[12px] py-[8px] font-medium text-text">{c.first_name} {c.last_name}</td>
                    <td className="px-[12px] py-[8px] text-text2 hidden md:table-cell">{c.email}</td>
                    <td className="px-[12px] py-[8px] text-text2 hidden md:table-cell">{c.company?.name ?? '—'}</td>
                    <td className="px-[12px] py-[8px] hidden lg:table-cell">
                      <span className={`inline-block px-[6px] py-[2px] rounded-full text-[10px] font-semibold ${LIFECYCLE_BADGE[c.lifecycle_stage] ?? LIFECYCLE_BADGE.other}`}>
                        {c.lifecycle_stage.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-[12px] py-[8px] text-text2 text-right hidden lg:table-cell">{c.lead_score}</td>
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
