'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useCrmDeals, useUpdateCrmDeal } from '@/hooks/useCrm'
import type { CrmDeal, DealStage } from '@/types/crm'

const STAGES: DealStage[] = ['proposal', 'negotiation', 'contract_sent', 'won', 'lost']

const STAGE_COLORS: Record<DealStage, string> = {
  proposal: 'border-t-blue-500',
  negotiation: 'border-t-purple-500',
  contract_sent: 'border-t-indigo-500',
  won: 'border-t-emerald-500',
  lost: 'border-t-red-500',
  churned: 'border-t-gray-500',
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

  return (
    <div className="flex gap-[12px] overflow-x-auto pb-[8px]">
      {STAGES.map(stage => {
        const stageDeals = deals.filter(d => d.stage === stage)
        const totalAmount = stageDeals.reduce((s, d) => s + (d.amount ?? 0), 0)

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
              {stageDeals.map(deal => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={e => handleDragStart(e, deal.id)}
                  onClick={() => onDealClick?.(deal)}
                  className={`bg-surface rounded-[8px] border border-border2 p-[10px] cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                    dragId === deal.id ? 'opacity-50' : ''
                  }`}
                >
                  <p className="text-[12px] font-semibold text-text truncate">{deal.title}</p>
                  <p className="text-[11px] text-text2 truncate">{deal.company?.name ?? '—'}</p>
                  <div className="flex items-center justify-between mt-[6px]">
                    <span className="text-[11px] font-bold text-mint-dd">{formatAmount(deal.amount ?? 0)}</span>
                    <span className="text-[10px] text-text3">{deal.probability}%</span>
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
              ))}
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
