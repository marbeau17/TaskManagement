'use client'

import { useI18n } from '@/hooks/useI18n'
import { useCrmDashboard, useCrmDeals } from '@/hooks/useCrm'

export function CrmWinLossAnalysis() {
  const { t } = useI18n()
  const { data: dashboard } = useCrmDashboard()
  const { data: dealsData } = useCrmDeals({ pageSize: 200 })

  const deals = dealsData?.data ?? []
  const wonDeals = deals.filter(d => d.stage === 'won')
  const lostDeals = deals.filter(d => d.stage === 'lost')
  const totalClosed = wonDeals.length + lostDeals.length
  const winRate = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 100) : 0

  const avgDealSize = wonDeals.length > 0
    ? Math.round(wonDeals.reduce((s, d) => s + (d.amount ?? 0), 0) / wonDeals.length)
    : 0

  // Average sales cycle (days from created to actual_close_date)
  const cycles = wonDeals.filter(d => d.actual_close_date).map(d => {
    const created = new Date(d.created_at).getTime()
    const closed = new Date(d.actual_close_date!).getTime()
    return Math.round((closed - created) / (1000 * 60 * 60 * 24))
  })
  const avgCycle = cycles.length > 0 ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 0

  // Loss reasons
  const lossReasons = lostDeals.reduce((acc, d) => {
    const reason = d.loss_reason || t('crm.analysis.noReason')
    acc[reason] = (acc[reason] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
        <h3 className="text-[13px] font-bold text-text">{t('crm.analysis.title')}</h3>
      </div>
      <div className="p-[16px]">
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px] mb-[16px]">
          <Metric label={t('crm.analysis.winRate')} value={`${winRate}%`} color={winRate >= 50 ? 'text-emerald-600' : 'text-amber-600'} />
          <Metric label={t('crm.analysis.avgDealSize')} value={`¥${avgDealSize.toLocaleString()}`} />
          <Metric label={t('crm.analysis.avgCycle')} value={`${avgCycle} ${t('crm.analysis.days')}`} />
          <Metric label={t('crm.analysis.totalClosed')} value={`${totalClosed}`} />
        </div>

        {/* Win/Loss bar */}
        {totalClosed > 0 && (
          <div className="mb-[12px]">
            <div className="flex rounded-full h-[24px] overflow-hidden">
              <div className="bg-emerald-500 flex items-center justify-center" style={{ width: `${winRate}%` }}>
                {winRate > 15 && <span className="text-[10px] font-bold text-white">{wonDeals.length} Won</span>}
              </div>
              <div className="bg-red-400 flex items-center justify-center" style={{ width: `${100 - winRate}%` }}>
                {(100 - winRate) > 15 && <span className="text-[10px] font-bold text-white">{lostDeals.length} Lost</span>}
              </div>
            </div>
          </div>
        )}

        {/* Loss reasons */}
        {Object.keys(lossReasons).length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-text2 mb-[6px]">{t('crm.analysis.lossReasons')}</p>
            <div className="space-y-[4px]">
              {Object.entries(lossReasons).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
                <div key={reason} className="flex items-center gap-[8px] text-[11px]">
                  <span className="text-text2 flex-1 truncate">{reason}</span>
                  <span className="text-text3 font-mono">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalClosed === 0 && (
          <p className="text-[12px] text-text3 text-center py-[12px]">{t('crm.analysis.noData')}</p>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-[18px] font-bold ${color ?? 'text-text'}`}>{value}</p>
      <p className="text-[10px] text-text2">{label}</p>
    </div>
  )
}
