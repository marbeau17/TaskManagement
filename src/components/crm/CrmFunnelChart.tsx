'use client'

import { useI18n } from '@/hooks/useI18n'
import { useCrmDashboard } from '@/hooks/useCrm'

const STAGE_COLORS: Record<string, string> = {
  proposal: 'bg-blue-500',
  negotiation: 'bg-purple-500',
  contract_sent: 'bg-indigo-500',
  won: 'bg-emerald-500',
  lost: 'bg-red-400',
  churned: 'bg-gray-400',
}

export function CrmFunnelChart() {
  const { t } = useI18n()
  const { data } = useCrmDashboard()

  const stages = data?.dealsByStage ?? []
  const maxCount = Math.max(...stages.map(s => s.count), 1)

  if (stages.length === 0) return null

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
        <h3 className="text-[13px] font-bold text-text">{t('crm.funnel.title')}</h3>
      </div>
      <div className="p-[16px] flex flex-col items-center gap-[4px]">
        {stages.filter(s => !['won', 'lost', 'churned'].includes(s.stage)).map((s, i) => {
          const width = Math.max(30, (s.count / maxCount) * 100)
          return (
            <div key={s.stage} className="w-full flex flex-col items-center">
              <div
                className={`${STAGE_COLORS[s.stage] ?? 'bg-gray-400'} rounded-[4px] flex items-center justify-center py-[8px] text-white transition-all`}
                style={{ width: `${width}%` }}
              >
                <span className="text-[11px] font-bold">{t(`crm.deal.${s.stage}`)} ({s.count})</span>
              </div>
              {i < stages.filter(s2 => !['won', 'lost', 'churned'].includes(s2.stage)).length - 1 && (
                <div className="text-[9px] text-text3 py-[2px]">▼</div>
              )}
            </div>
          )
        })}
        {/* Won/Lost summary */}
        <div className="flex gap-[12px] mt-[8px] pt-[8px] border-t border-border2 w-full justify-center">
          {stages.filter(s => s.stage === 'won' || s.stage === 'lost').map(s => (
            <div key={s.stage} className={`flex items-center gap-[4px] px-[10px] py-[4px] rounded-full ${s.stage === 'won' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
              <span className={`text-[11px] font-bold ${s.stage === 'won' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {t(`crm.deal.${s.stage}`)}: {s.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
