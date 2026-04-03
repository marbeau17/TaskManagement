'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useCrmDeals, useCreateCrmDeal, useUpdateCrmDeal, useDeleteCrmDeal } from '@/hooks/useCrm'
import { Pagination } from '@/components/shared'
import { toast } from '@/stores/toastStore'
import type { CrmDealFilters, DealStage } from '@/types/crm'

const STAGES: DealStage[] = ['proposal', 'negotiation', 'contract_sent', 'won', 'lost', 'churned']

const STAGE_BADGE: Record<DealStage, string> = {
  proposal:      'bg-blue-100 text-blue-700',
  negotiation:   'bg-purple-100 text-purple-700',
  contract_sent: 'bg-indigo-100 text-indigo-700',
  won:           'bg-green-100 text-green-700',
  lost:          'bg-red-100 text-red-700',
  churned:       'bg-gray-100 text-gray-500',
}

const formatYen = (v: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(v)

const emptyForm = {
  title: '',
  amount: '',
  stage: 'proposal' as DealStage,
  probability: '',
  expected_close_date: '',
  description: '',
}

export function CrmDealList() {
  const { t } = useI18n()
  const [filters, setFilters] = useState<CrmDealFilters>({ page: 1, pageSize: 20 })
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  const { data, isLoading } = useCrmDeals({ ...filters, q: search || undefined })
  const createMutation = useCreateCrmDeal()
  const updateMutation = useUpdateCrmDeal()
  const deleteMutation = useDeleteCrmDeal()

  const [pushing, setPushing] = useState<string | null>(null)

  const deals = data?.data ?? []
  const total = data?.total ?? 0

  const handlePushToPipeline = async (dealId: string) => {
    if (!confirm(t('crm.deal.pushConfirm'))) return
    setPushing(dealId)
    try {
      const res = await fetch(`/api/crm/deals/${dealId}/push-to-pipeline`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(t('crm.deal.pushSuccess'))
        // Refresh deals
        window.location.reload()
      } else {
        toast.error(data.error || t('crm.deal.pushFailed'))
      }
    } catch {
      toast.error(t('crm.deal.pushFailed'))
    } finally {
      setPushing(null)
    }
  }

  const handleCreate = async () => {
    if (!formData.title.trim()) return
    await createMutation.mutateAsync({
      title: formData.title,
      amount: formData.amount ? Number(formData.amount) : 0,
      stage: formData.stage,
      probability: formData.probability ? Number(formData.probability) : 0,
      expected_close_date: formData.expected_close_date || null,
      description: formData.description,
    })
    setFormData(emptyForm)
    setShowForm(false)
  }

  const handleStageChange = (id: string, stage: DealStage) => {
    updateMutation.mutate({ id, data: { stage } })
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
          + {t('crm.deals')}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow space-y-[8px]">
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
            placeholder={t('crm.deal.title')}
            className="w-full text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
          />
          <div className="flex gap-[8px]">
            <input
              type="number"
              value={formData.amount}
              onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
              placeholder={t('crm.deal.amount')}
              className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            />
            <select
              value={formData.stage}
              onChange={e => setFormData(p => ({ ...p, stage: e.target.value as DealStage }))}
              className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            >
              {STAGES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-[8px]">
            <input
              type="number"
              min={0}
              max={100}
              value={formData.probability}
              onChange={e => setFormData(p => ({ ...p, probability: e.target.value }))}
              placeholder={t('crm.deal.probability') + ' (0-100)'}
              className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            />
            <input
              type="date"
              value={formData.expected_close_date}
              onChange={e => setFormData(p => ({ ...p, expected_close_date: e.target.value }))}
              className="flex-1 text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            />
          </div>
          <textarea
            value={formData.description}
            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            placeholder={t('crm.deal.description')}
            rows={2}
            className="w-full text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint resize-none"
          />
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
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold">{t('crm.deal.title')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden md:table-cell">{t('crm.deal.company')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold">{t('crm.deal.stage')}</th>
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold">{t('crm.deal.amount')}</th>
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold hidden md:table-cell">{t('crm.deal.probability')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.deal.expectedClose')}</th>
                <th className="text-left px-[12px] py-[8px] text-text2 font-semibold hidden lg:table-cell">{t('crm.deal.owner')}</th>
                <th className="text-right px-[12px] py-[8px] text-text2 font-semibold w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-[12px] py-[8px]"><div className="h-[16px] bg-surf2 rounded animate-pulse" /></td></tr>
                ))
              ) : deals.length === 0 ? (
                <tr><td colSpan={8} className="px-[12px] py-[20px] text-center text-text3">{t('common.noData')}</td></tr>
              ) : (
                deals.map(d => (
                  <tr key={d.id} className="border-b border-border2 hover:bg-surf2 transition-colors">
                    <td className="px-[12px] py-[8px] font-medium text-text">{d.title}</td>
                    <td className="px-[12px] py-[8px] text-text2 hidden md:table-cell">{d.company?.name ?? '—'}</td>
                    <td className="px-[12px] py-[8px]">
                      <select
                        value={d.stage}
                        onChange={e => handleStageChange(d.id, e.target.value as DealStage)}
                        className={`text-[11px] font-semibold px-[6px] py-[2px] rounded-full border-none outline-none cursor-pointer ${STAGE_BADGE[d.stage]}`}
                      >
                        {STAGES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-[12px] py-[8px] text-right font-medium text-text">{formatYen(d.amount)}</td>
                    <td className="px-[12px] py-[8px] text-right text-text2 hidden md:table-cell">{d.probability}%</td>
                    <td className="px-[12px] py-[8px] text-text2 hidden lg:table-cell">{d.expected_close_date ?? '—'}</td>
                    <td className="px-[12px] py-[8px] text-text2 hidden lg:table-cell">{d.owner?.name ?? '—'}</td>
                    <td className="px-[12px] py-[8px] text-right">
                      {!d.pipeline_opportunity_id && ['negotiation', 'contract_sent', 'won'].includes(d.stage) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePushToPipeline(d.id) }}
                          disabled={pushing === d.id}
                          className="text-[11px] text-mint-dd hover:underline mr-[6px] disabled:opacity-50"
                          title={t('crm.deal.pushToPipeline')}
                        >
                          {pushing === d.id ? '...' : '📊→'}
                        </button>
                      )}
                      {d.pipeline_opportunity_id && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 mr-[6px]" title={t('crm.deal.linkedPipeline')}>✓PL</span>
                      )}
                      <button onClick={() => { if (confirm(t('common.deleteConfirm'))) deleteMutation.mutate(d.id) }} className="text-[11px] text-danger hover:underline">{t('common.delete')}</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > (filters.pageSize ?? 20) && (
          <div className="px-[12px] py-[8px] border-t border-border2">
            <Pagination page={filters.page ?? 1} totalCount={total} pageSize={filters.pageSize ?? 20} onPageChange={p => setFilters(f => ({ ...f, page: p }))} onPageSizeChange={() => {}} />
          </div>
        )}
      </div>
    </div>
  )
}
