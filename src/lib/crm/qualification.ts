// =============================================================================
// Lead qualification scorer (SPEC_CRM_LEAD_DEAL_V2 §4.2 / §4.3).
// Pure function used by both UI (live preview) and API (post-write).
// =============================================================================

import type { CrmLead } from '@/types/crm'

const DECISION_MAKER_QUALIFIED = new Set(['社長', '役員', '部長'])
const PAIN_POINT_MIN_CHARS = 30
const RECENT_CONTACT_DAYS = 14

export type QualificationCheckId =
  | 'decision_maker'
  | 'pain_point'
  | 'expected_start_period'
  | 'budget_range'
  | 'next_action_date'
  | 'last_contact_date'

export interface QualificationCheck {
  id: QualificationCheckId
  passed: boolean
  labelKey: string
  hintKey?: string
}

export interface QualificationResult {
  checks: QualificationCheck[]
  score: number  // 0..6
  passing: boolean // score ≥ 4 (recommended threshold)
}

function isWithinDays(dateStr: string | null | undefined, days: number): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr).getTime()
  if (isNaN(d)) return false
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return d >= cutoff
}

function isFutureOrToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr).getTime()
  if (isNaN(d)) return false
  // Compare by date, ignoring time-of-day.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d >= today.getTime()
}

export function scoreLead(lead: Pick<
  CrmLead,
  'decision_maker_role' | 'pain_point' | 'expected_start_period' | 'budget_range' | 'next_action_date' | 'last_contact_date'
>): QualificationResult {
  const checks: QualificationCheck[] = [
    {
      id: 'decision_maker',
      passed: !!lead.decision_maker_role && DECISION_MAKER_QUALIFIED.has(lead.decision_maker_role.trim()),
      labelKey: 'crm.lead.qual.decisionMaker',
      hintKey: 'crm.lead.qual.decisionMakerHint',
    },
    {
      id: 'pain_point',
      passed: !!lead.pain_point && lead.pain_point.trim().length >= PAIN_POINT_MIN_CHARS,
      labelKey: 'crm.lead.qual.painPoint',
      hintKey: 'crm.lead.qual.painPointHint',
    },
    {
      id: 'expected_start_period',
      passed: !!lead.expected_start_period && lead.expected_start_period !== '未定',
      labelKey: 'crm.lead.qual.expectedStartPeriod',
    },
    {
      id: 'budget_range',
      passed: !!lead.budget_range && lead.budget_range !== '未確認',
      labelKey: 'crm.lead.qual.budgetRange',
    },
    {
      id: 'next_action_date',
      passed: isFutureOrToday(lead.next_action_date),
      labelKey: 'crm.lead.qual.nextActionDate',
    },
    {
      id: 'last_contact_date',
      passed: isWithinDays(lead.last_contact_date, RECENT_CONTACT_DAYS),
      labelKey: 'crm.lead.qual.lastContactDate',
      hintKey: 'crm.lead.qual.lastContactHint',
    },
  ]

  const score = checks.filter((c) => c.passed).length
  return {
    checks,
    score,
    passing: score >= 4,
  }
}

export const QUAL_THRESHOLD_PASSING = 4
export const QUAL_THRESHOLD_HARD_WARN = 2
