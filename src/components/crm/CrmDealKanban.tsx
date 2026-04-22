'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useCrmDeals, useUpdateCrmDeal } from '@/hooks/useCrm'
import type { CrmDeal, DealStage, ForecastCategory, DealType } from '@/types/crm'

const STAGES: DealStage[] = ['proposal', 'negotiation', 'contract_sent', 'won', 'lost']

const STAGE_COLORS: Record<DealStage, string> = {
  proposal: 'border-t-blue-500',
  negotiation: 'border-t-purple-500',
  contract_sent: 'border-t-indigo-500',
  won: 'border-t-emerald-500',
  lost: 'border-t-red-500',
  churned: 'border-t-gray-500',
}

const FORECAST_BADGE: Record<ForecastCategory, string> = {
  commit: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  best_case: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  pipeline: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  omitted: 'bg-surface text-text3 border border-border2',
}

const DEAL_TYPE_PILL: Record<DealType, string> = {
  spot: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  retainer: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400',
  hybrid: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400',
}

const STUCK_STAGE_DAYS = 30

function daysSince(timestamp: string | null): number {
  if (!timestamp) return 0
  const ms = Date.now() - new Date(timestamp).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

interface Props {
  onDealClick?: (deal: CrmDeal) => void
}

export function CrmDealKanban({ onDealClick }: Props) {
  const { t } = useI18n()
  const { data } = useCrmDeals({ pageSize: 100 })
  const updateDeal = useUpdateCrmDeal()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null)
  const [editingContribution, setEditingContribution] = useState<string | null>(null)
  const [contributionValue, setContributionValue] = useState<number>(0)

  const deals = data?.data ?? []

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId)
    setDragId(dealId)
  }

  const handleDragOver = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault()
    setDragOverStage(stage)
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const handleDrop = async (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault()
    const dealId = e.dataTransfer.getData('text/plain')
    setDragId(null)
    setDragOverStage(null)

    if (!dealId) return
    const deal = deals.find(d => d.id === dealId)
    if (!deal || deal.stage === stage) return

    await updateDeal.mutateAsync({
      id: dealId,
      data: {
        stage,
        ...(stage === 'won' ? { actual_close_date: new Date().toISOString().slice(0, 10), probability: 100 } : {}),
        ...(stage === 'lost' ? { actual_close_date: new Date().toISOString().slice(0, 10), probability: 0 } : {}),
      },
    })
  }

  const handleContributionSave = async (dealId: string) => {
    const clamped = Math.min(100, Math.max(0, contributionValue))
    await updateDeal.mutateAsync({ id: dealId, data: { sales_contribution: clamped } })
    setEditingContribution(null)
  }

  const formatAmount = (v: number) => `¥${v.toLocaleString()}`
  const headlineAmount = (deal: CrmDeal) => deal.tcv ?? deal.amount ?? 0

  return (
    <div className="flex gap-[12px] overflow-x-auto pb-[8px]">
      {STAGES.map(stage => {
        const stageDeals = deals.filter(d => d.stage === stage)
        const totalAmount = stageDeals.reduce((s, d) => s + headlineAmount(d), 0)

        return (
          <div
            key={stage}
            className={`flex-shrink-0 w-[160px] md:w-[240px] bg-surf2 rounded-[10px] border border-border2 flex flex-col ${
              dragOverStage === stage ? 'ring-2 ring-mint-dd' : ''
            }`}
            onDragOver={e => handleDragOver(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, stage)}
          >
            {/* Column header */}
            <div className={`px-[12px] py-[8px] border-t-[3px] ${STAGE_COLORS[stage]} rounded-t-[10px]`}>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-text">{t(`crm.deal.${stage}`)}</span>
                <span className="text-[10px] text-text3 bg-surface px-[6px] py-[1px] rounded-full">{stageDeals.length}</span>
              </div>
              <span className="text-[10px] text-text2">{formatAmount(totalAmount)}</span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-[8px] space-y-[6px] min-h-[100px]">
              {stageDeals.map(deal => {
                const stuckDays = daysSince(deal.stage_changed_at)
                const isStuck = stuckDays >= STUCK_STAGE_DAYS && !['won', 'lost', 'churned'].includes(deal.stage)
                const dealType: DealType = (deal.deal_type ?? 'spot') as DealType
                const forecast: ForecastCategory = (deal.forecast_category ?? 'pipeline') as ForecastCategory
                return (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={e => handleDragStart(e, deal.id)}
                  onClick={() => onDealClick?.(deal)}
                  className={`bg-surface rounded-[8px] border border-border2 p-[10px] cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                    dragId === deal.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-[6px]">
                    <p className="text-[12px] font-semibold text-text truncate flex-1">{deal.title}</p>
                    <span className={`text-[9px] font-bold px-[5px] py-[1px] rounded-full whitespace-nowrap ${DEAL_TYPE_PILL[dealType]}`}>
                      {t(`crm.deal.type${dealType.charAt(0).toUpperCase()}${dealType.slice(1)}`)}
                    </span>
                  </div>
                  <p className="text-[11px] text-text2 truncate">{deal.company?.name ?? '—'}</p>
                  <div className="flex items-center justify-between mt-[6px]">
                    <span className="text-[12px] font-bold text-mint-dd">{formatAmount(headlineAmount(deal))}</span>
                    <span className="text-[10px] text-text3">{deal.probability}%</span>
                  </div>
                  {(deal.acv > 0 || deal.contract_term_months) && (
                    <div className="flex items-center justify-between mt-[1px] text-[9px] text-text3">
                      {deal.acv > 0 && <span>ACV {formatAmount(deal.acv)}</span>}
                      {deal.contract_term_months ? <span>{deal.contract_term_months}ヶ月</span> : <span />}
                    </div>
                  )}
                  <div className="flex items-center gap-[4px] mt-[4px]">
                    <span className={`text-[9px] font-semibold px-[5px] py-[1px] rounded-full ${FORECAST_BADGE[forecast]}`}>
                      {t(`crm.deal.forecast${forecast === 'best_case' ? 'BestCase' : forecast.charAt(0).toUpperCase() + forecast.slice(1)}`)}
                    </span>
                    {isStuck && (
                      <span className="text-[9px] text-amber-700 dark:text-amber-400" title={`${stuckDays}日 滞留`}>
                        ⚠ {stuckDays}d
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-[2px]">
                    {editingContribution === deal.id ? (
                      <div className="flex items-center gap-[4px]" onClick={e => e.stopPropagation()}>
                        <span className="text-[10px] text-text3">貢献度:</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={contributionValue}
                          onChange={e => setContributionValue(Number(e.target.value))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleContributionSave(deal.id)
                            if (e.key === 'Escape') setEditingContribution(null)
                          }}
                          onBlur={() => handleContributionSave(deal.id)}
                          autoFocus
                          className="w-[40px] text-[10px] px-[4px] py-[1px] rounded border border-border2 bg-surface text-text text-right"
                        />
                        <span className="text-[10px] text-text3">%</span>
                      </div>
                    ) : (
                      <span
                        className="text-[10px] text-text3 cursor-pointer hover:text-text2"
                        onClick={e => {
                          e.stopPropagation()
                          setEditingContribution(deal.id)
                          setContributionValue(deal.sales_contribution ?? 0)
                        }}
                      >
                        貢献度: {deal.sales_contribution ?? 0}%
                      </span>
                    )}
                  </div>
                  {deal.expected_close_date && (
                    <p className="text-[10px] text-text3 mt-[2px]">📅 {deal.expected_close_date}</p>
                  )}
                </div>
                )
              })}
              {stageDeals.length === 0 && (
                <div className="text-[11px] text-text3 text-center py-[20px]">
                  {t('crm.kanban.dropHere')}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
