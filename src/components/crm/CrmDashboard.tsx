'use client'

import { KpiCard } from '@/components/shared/KpiCard'
import { useI18n } from '@/hooks/useI18n'
import { useCrmDashboard } from '@/hooks/useCrm'

export function CrmDashboard() {
  const { t } = useI18n()
  const { data, isLoading } = useCrmDashboard()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-[16px]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border2 rounded-[10px] p-[13px] shadow h-[88px] animate-pulse" />
          ))}
        </div>
        <div className="bg-surface border border-border2 rounded-[10px] shadow h-[300px] animate-pulse" />
      </div>
    )
  }

  const d = data ?? {
    pipelineValue: 0, wonThisMonth: 0, avgDealSize: 0, conversionRate: 0,
    totalContacts: 0, totalLeads: 0, totalDeals: 0, dealsByStage: [], recentActivities: [],
  }

  const formatCurrency = (v: number) => {
    if (v >= 1000000) return `¥${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `¥${(v / 1000).toFixed(0)}K`
    return `¥${v}`
  }

  return (
    <div className="flex flex-col gap-[16px]">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
        <KpiCard
          label={t('crm.kpi.pipelineValue')}
          value={d.pipelineValue >= 1000000 ? Math.round(d.pipelineValue / 1000000) : Math.round(d.pipelineValue / 1000)}
          unit={d.pipelineValue >= 1000000 ? 'M¥' : 'K¥'}
          variant="mint"
        />
        <KpiCard
          label={t('crm.kpi.wonThisMonth')}
          value={d.wonThisMonth >= 1000000 ? Math.round(d.wonThisMonth / 1000000) : Math.round(d.wonThisMonth / 1000)}
          unit={d.wonThisMonth >= 1000000 ? 'M¥' : 'K¥'}
          variant="mint"
        />
        <KpiCard
          label={t('crm.kpi.totalContacts')}
          value={d.totalContacts}
          unit={t('kpi.unit.count')}
          variant="mint"
        />
        <KpiCard
          label={t('crm.kpi.totalDeals')}
          value={d.totalDeals}
          unit={t('kpi.unit.count')}
          subText={`${d.totalLeads} ${t('crm.leads')}`}
          variant="mint"
        />
      </div>

      {/* Deals by Stage */}
      {d.dealsByStage.length > 0 && (
        <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
          <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
            <h3 className="text-[13px] font-bold text-text">{t('crm.dealsByStage')}</h3>
          </div>
          <div className="p-[12px]">
            <div className="flex flex-col gap-[8px]">
              {d.dealsByStage.map(s => (
                <div key={s.stage} className="flex items-center gap-[12px]">
                  <span className="text-[12px] text-text2 w-[100px] capitalize">{t(`crm.deal.${s.stage}`)}</span>
                  <div className="flex-1 bg-surf2 rounded-full h-[20px] overflow-hidden">
                    <div
                      className="bg-mint-dd h-full rounded-full flex items-center justify-end px-[8px]"
                      style={{ width: `${Math.max(5, (s.count / Math.max(d.totalDeals, 1)) * 100)}%` }}
                    >
                      <span className="text-[9px] text-white font-bold">{s.count}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-text2 w-[70px] text-right">{formatCurrency(s.total_amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {d.totalDeals === 0 && d.totalContacts === 0 && (
        <div className="bg-surface border border-border2 rounded-[10px] shadow p-[40px] text-center">
          <p className="text-[14px] text-text3 mb-[8px]">{t('crm.empty')}</p>
          <p className="text-[12px] text-text3">{t('crm.emptyHint')}</p>
        </div>
      )}
    </div>
  )
}
