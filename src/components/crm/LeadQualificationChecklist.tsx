'use client'

import { useMemo } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { scoreLead, QUAL_THRESHOLD_PASSING } from '@/lib/crm/qualification'
import type { CrmLead } from '@/types/crm'

interface Props {
  lead: Pick<
    CrmLead,
    | 'decision_maker_role'
    | 'pain_point'
    | 'expected_start_period'
    | 'budget_range'
    | 'next_action_date'
    | 'last_contact_date'
  >
}

export function LeadQualificationChecklist({ lead }: Props) {
  const { t } = useI18n()
  const result = useMemo(() => scoreLead(lead), [lead])

  return (
    <div className="bg-surface border border-border2 rounded-[8px] p-[12px]">
      <div className="flex items-center justify-between mb-[8px]">
        <span className="text-[12px] font-bold text-text">
          {t('crm.lead.qual.title')}
        </span>
        <span
          className={`text-[14px] font-bold ${
            result.passing ? 'text-emerald-600' : result.score >= 2 ? 'text-amber-600' : 'text-danger'
          }`}
        >
          {result.score} / 6
        </span>
      </div>

      <ul className="space-y-[5px]">
        {result.checks.map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-[6px] text-[11px]"
            title={c.hintKey ? t(c.hintKey) : undefined}
          >
            <span
              className={
                c.passed
                  ? 'text-emerald-600 font-bold'
                  : 'text-text3'
              }
            >
              {c.passed ? '✓' : '○'}
            </span>
            <span className={c.passed ? 'text-text' : 'text-text2'}>
              {t(c.labelKey)}
            </span>
          </li>
        ))}
      </ul>

      {!result.passing && (
        <div className="mt-[8px] pt-[8px] border-t border-border2 text-[10px] text-text3">
          {t('crm.lead.qual.thresholdHint').replace('{n}', String(QUAL_THRESHOLD_PASSING))}
        </div>
      )}
    </div>
  )
}
