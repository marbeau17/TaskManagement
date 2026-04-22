// =============================================================================
// Server-side normalization for crm_deals / crm_leads writes.
// Applies amount recalc and mirrors tcv → amount for backwards compat.
// =============================================================================

import { normalizeForSave } from './amount-calc'
import type { DealType } from '@/types/crm'

const AMOUNT_FIELDS = [
  'deal_type',
  'one_time_amount',
  'monthly_recurring_amount',
  'contract_term_months',
  'tcv',
] as const

/**
 * If the request body touches any amount-related field, recompute the full
 * canonical set and write it back into the body. The deprecated `amount`
 * column is mirrored from `tcv` so old reports keep working.
 */
export function normalizeDealBody<T extends Record<string, any>>(
  body: T,
  current?: { deal_type?: DealType; one_time_amount?: number; monthly_recurring_amount?: number; contract_term_months?: number | null; tcv?: number },
): T {
  const touchesAmount = AMOUNT_FIELDS.some((k) => k in body)
  if (!touchesAmount) return body

  const merged = {
    deal_type: (body.deal_type ?? current?.deal_type ?? 'spot') as DealType,
    one_time_amount: body.one_time_amount ?? current?.one_time_amount ?? 0,
    monthly_recurring_amount:
      body.monthly_recurring_amount ?? current?.monthly_recurring_amount ?? 0,
    contract_term_months:
      body.contract_term_months !== undefined
        ? body.contract_term_months
        : current?.contract_term_months ?? null,
    tcv: body.tcv ?? current?.tcv ?? 0,
    last_edited: body.last_edited as any,
  }

  const resolved = normalizeForSave(merged)

  // Strip last_edited (UI-only hint).
  const out: Record<string, any> = { ...body }
  delete out.last_edited
  out.deal_type = merged.deal_type
  out.one_time_amount = resolved.one_time_amount
  out.monthly_recurring_amount = resolved.monthly_recurring_amount
  out.contract_term_months = resolved.contract_term_months
  out.tcv = resolved.tcv
  out.acv = resolved.acv
  out.amount = resolved.amount
  return out as T
}
