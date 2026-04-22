'use client'

import { useMemo, useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { recalcAmount, validateAmount, type AmountField } from '@/lib/crm/amount-calc'
import type { DealType } from '@/types/crm'

interface Props {
  dealType: DealType
  oneTimeAmount: number
  monthlyRecurringAmount: number
  contractTermMonths: number | null
  tcv: number
  onChange: (next: {
    deal_type: DealType
    one_time_amount: number
    monthly_recurring_amount: number
    contract_term_months: number | null
    tcv: number
    acv: number
    last_edited?: AmountField
  }) => void
}

const DEAL_TYPES: DealType[] = ['spot', 'retainer', 'hybrid']

const DEAL_TYPE_KEY: Record<DealType, string> = {
  spot: 'crm.deal.typeSpot',
  retainer: 'crm.deal.typeRetainer',
  hybrid: 'crm.deal.typeHybrid',
}

const formatYen = (v: number) =>
  v == null || isNaN(v) ? '¥0' : `¥${Math.round(v).toLocaleString()}`

export function DealAmountEditor({
  dealType,
  oneTimeAmount,
  monthlyRecurringAmount,
  contractTermMonths,
  tcv,
  onChange,
}: Props) {
  const { t } = useI18n()
  const [lastEdited, setLastEdited] = useState<AmountField | undefined>(undefined)

  const current = useMemo(
    () =>
      recalcAmount({
        deal_type: dealType,
        one_time_amount: oneTimeAmount,
        monthly_recurring_amount: monthlyRecurringAmount,
        contract_term_months: contractTermMonths,
        tcv,
        last_edited: lastEdited,
      }),
    [dealType, oneTimeAmount, monthlyRecurringAmount, contractTermMonths, tcv, lastEdited],
  )

  const validation = validateAmount(current, dealType)

  const propagate = (
    next: Partial<{
      deal_type: DealType
      one_time_amount: number
      monthly_recurring_amount: number
      contract_term_months: number | null
      tcv: number
    }>,
    edited?: AmountField,
  ) => {
    setLastEdited(edited)
    const merged = recalcAmount({
      deal_type: next.deal_type ?? dealType,
      one_time_amount: next.one_time_amount ?? oneTimeAmount,
      monthly_recurring_amount: next.monthly_recurring_amount ?? monthlyRecurringAmount,
      contract_term_months: next.contract_term_months !== undefined ? next.contract_term_months : contractTermMonths,
      tcv: next.tcv ?? tcv,
      last_edited: edited,
    })
    onChange({
      deal_type: next.deal_type ?? dealType,
      one_time_amount: merged.one_time_amount,
      monthly_recurring_amount: merged.monthly_recurring_amount,
      contract_term_months: merged.contract_term_months,
      tcv: merged.tcv,
      acv: merged.acv,
      last_edited: edited,
    })
  }

  const mrrDisabled = dealType === 'spot'
  const termDisabled = dealType === 'spot'

  return (
    <div className="space-y-[10px]">
      {/* deal_type selector */}
      <div className="flex gap-[6px]">
        {DEAL_TYPES.map((dt) => (
          <button
            key={dt}
            type="button"
            onClick={() => propagate({ deal_type: dt }, undefined)}
            className={`flex-1 px-[10px] py-[5px] text-[11px] font-semibold rounded-[6px] border transition-colors ${
              dealType === dt
                ? 'bg-mint text-white border-mint'
                : 'bg-surface text-text2 border-border2 hover:bg-surf2'
            }`}
          >
            {t(DEAL_TYPE_KEY[dt])}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-3 gap-[8px]">
        <div>
          <label className="text-[10px] text-text3 font-medium block mb-[2px]">
            {t('crm.deal.oneTimeAmount')}
          </label>
          <input
            type="number"
            min={0}
            step={1000}
            value={oneTimeAmount || ''}
            onChange={(e) => propagate({ one_time_amount: Number(e.target.value) || 0 }, 'one_time')}
            className="w-full text-[12px] text-text px-[8px] py-[5px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
          />
        </div>
        <div>
          <label className="text-[10px] text-text3 font-medium block mb-[2px]">
            {t('crm.deal.mrr')}
          </label>
          <input
            type="number"
            min={0}
            step={1000}
            value={monthlyRecurringAmount || ''}
            disabled={mrrDisabled}
            onChange={(e) => propagate({ monthly_recurring_amount: Number(e.target.value) || 0 }, 'mrr')}
            className="w-full text-[12px] text-text px-[8px] py-[5px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint disabled:bg-surf2 disabled:text-text3"
          />
        </div>
        <div>
          <label className="text-[10px] text-text3 font-medium block mb-[2px]">
            {t('crm.deal.contractTerm')}
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={contractTermMonths ?? ''}
            disabled={termDisabled}
            onChange={(e) =>
              propagate(
                { contract_term_months: e.target.value === '' ? null : Number(e.target.value) },
                'term',
              )
            }
            className="w-full text-[12px] text-text px-[8px] py-[5px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint disabled:bg-surf2 disabled:text-text3"
          />
        </div>
      </div>

      {/* TCV (editable) + ACV (read-only) */}
      <div className="grid grid-cols-2 gap-[8px] items-end">
        <div>
          <label className="text-[10px] text-text3 font-medium block mb-[2px]">
            {t('crm.deal.tcv')} <span className="text-text3">({t('crm.deal.tcvHint')})</span>
          </label>
          <input
            type="number"
            min={0}
            step={1000}
            value={tcv || ''}
            onChange={(e) => propagate({ tcv: Number(e.target.value) || 0 }, 'tcv')}
            className="w-full text-[14px] font-bold text-text px-[8px] py-[6px] bg-surface border border-mint rounded-[6px] outline-none focus:border-mint-dd"
          />
        </div>
        <div>
          <label className="text-[10px] text-text3 font-medium block mb-[2px]">
            {t('crm.deal.acv')} <span className="text-text3">({t('crm.deal.acvHint')})</span>
          </label>
          <div className="px-[8px] py-[6px] bg-surf2 border border-border2 rounded-[6px] text-[12px] text-text2">
            {formatYen(current.acv)}
          </div>
        </div>
      </div>

      {/* Live calculated TCV preview */}
      <div className="text-[11px] text-text2 px-[2px]">
        {t('crm.deal.calculatedTcv')}:{' '}
        <span className="font-semibold text-text">{formatYen(current.tcv)}</span>
      </div>

      {!validation.valid && (
        <div className="text-[11px] text-danger px-[2px]">⚠ {validation.reason}</div>
      )}
    </div>
  )
}
