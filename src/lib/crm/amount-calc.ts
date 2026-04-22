// =============================================================================
// CRM amount calculator — bidirectional TCV / ACV / MRR / term resolution.
// Implements SPEC_CRM_LEAD_DEAL_V2 §2.3.
// =============================================================================

import type { DealType } from '@/types/crm'

/** Field the user most recently edited; used to pick which value to derive. */
export type AmountField = 'one_time' | 'mrr' | 'term' | 'tcv'

export interface AmountInputs {
  deal_type: DealType
  one_time_amount: number
  monthly_recurring_amount: number
  contract_term_months: number | null
  tcv: number
  /**
   * Which field the user just edited. The calculator will leave that field
   * alone and derive whichever of the remaining {mrr, term, tcv} is the
   * "stale" one (the one that wasn't edited most recently).
   */
  last_edited?: AmountField
}

export interface AmountResolved {
  one_time_amount: number
  monthly_recurring_amount: number
  contract_term_months: number | null
  tcv: number
  acv: number
}

/**
 * Resolve an amount triple into a fully-consistent set.
 *
 * Rules (spec §2.3):
 *   TCV = one_time + mrr × term
 *   ACV = mrr × 12  (always derived; never user-editable)
 *
 * Bidirectional behavior — given two of {mrr, term, tcv} the third is solved:
 *   - mrr + term  → tcv
 *   - tcv + term  → mrr
 *   - mrr + tcv   → term  (rounded to nearest integer month)
 *
 * deal_type constraints:
 *   - 'spot':      mrr forced to 0, term forced to 0, tcv = one_time
 *   - 'retainer':  one_time defaults to 0 (caller may override)
 *   - 'hybrid':    no constraints
 *
 * `last_edited` chooses which of the two complete fields is "kept" when all
 * three look filled. If omitted, tcv is treated as the derived value.
 */
export function recalcAmount(input: AmountInputs): AmountResolved {
  const one_time = input.one_time_amount || 0
  let mrr = input.monthly_recurring_amount || 0
  let term = input.contract_term_months ?? null
  let tcv = input.tcv || 0

  // deal_type-driven constraints take precedence over inputs.
  if (input.deal_type === 'spot') {
    mrr = 0
    term = 0
    tcv = one_time
    return { one_time_amount: one_time, monthly_recurring_amount: 0, contract_term_months: 0, tcv, acv: 0 }
  }

  // For retainer/hybrid: figure out which of mrr/term/tcv to derive.
  // A field is "filled" if numeric and (for term/mrr/tcv) > 0.
  const mrrFilled = mrr > 0
  const termFilled = term != null && term > 0
  const tcvFilled = tcv > 0

  // Pick the derived field. If last_edited says "tcv", we want to back-solve
  // mrr or term from tcv (whichever is also filled). Otherwise derive tcv.
  let derive: 'mrr' | 'term' | 'tcv'
  if (input.last_edited === 'tcv' && tcvFilled) {
    // user just edited TCV; back-solve whichever of mrr/term is the older value
    if (mrrFilled && termFilled) {
      // both still filled — favor solving for mrr (term tends to be discrete)
      derive = 'mrr'
    } else if (termFilled) {
      derive = 'mrr'
    } else if (mrrFilled) {
      derive = 'term'
    } else {
      derive = 'tcv' // nothing to back-solve from; leave tcv alone
    }
  } else if (input.last_edited === 'term' && termFilled) {
    if (mrrFilled) derive = 'tcv'
    else if (tcvFilled) derive = 'mrr'
    else derive = 'tcv'
  } else if (input.last_edited === 'mrr' && mrrFilled) {
    if (termFilled) derive = 'tcv'
    else if (tcvFilled) derive = 'term'
    else derive = 'tcv'
  } else {
    // No last_edited hint: prefer deriving tcv from mrr+term.
    if (mrrFilled && termFilled) derive = 'tcv'
    else if (tcvFilled && termFilled) derive = 'mrr'
    else if (mrrFilled && tcvFilled) derive = 'term'
    else derive = 'tcv'
  }

  switch (derive) {
    case 'tcv':
      tcv = one_time + mrr * (term ?? 0)
      break
    case 'mrr':
      if (term && term > 0) {
        const numerator = tcv - one_time
        mrr = numerator > 0 ? numerator / term : 0
      }
      break
    case 'term':
      if (mrr > 0) {
        const numerator = tcv - one_time
        term = numerator > 0 ? Math.round(numerator / mrr) : 0
      }
      break
  }

  const acv = mrr * 12

  return {
    one_time_amount: one_time,
    monthly_recurring_amount: mrr,
    contract_term_months: term,
    tcv,
    acv,
  }
}

/**
 * Validate the resolved amounts. Caller decides what to do with the result;
 * UI typically blocks save when valid=false.
 */
export function validateAmount(resolved: AmountResolved, deal_type: DealType): {
  valid: boolean
  reason?: string
} {
  const { one_time_amount, monthly_recurring_amount, contract_term_months, tcv } = resolved
  if (deal_type === 'spot') {
    if (one_time_amount <= 0) return { valid: false, reason: 'one_time_amount must be > 0 for spot deals' }
    return { valid: true }
  }
  // retainer / hybrid: at least one revenue source
  if ((monthly_recurring_amount <= 0 || !contract_term_months || contract_term_months <= 0) && one_time_amount <= 0) {
    return { valid: false, reason: 'enter MRR + term, or one_time_amount' }
  }
  if (tcv <= 0) return { valid: false, reason: 'TCV resolved to zero' }
  return { valid: true }
}

/**
 * Apply server-side defaults before persisting. Mirrors `tcv` into the
 * deprecated `amount` column for backwards compat (spec §2.2).
 */
export function normalizeForSave(input: Partial<AmountInputs> & { deal_type?: DealType }): AmountResolved & { amount: number } {
  const dealType = (input.deal_type ?? 'spot') as DealType
  const resolved = recalcAmount({
    deal_type: dealType,
    one_time_amount: input.one_time_amount ?? 0,
    monthly_recurring_amount: input.monthly_recurring_amount ?? 0,
    contract_term_months: input.contract_term_months ?? null,
    tcv: input.tcv ?? 0,
    last_edited: input.last_edited,
  })
  return { ...resolved, amount: resolved.tcv }
}
