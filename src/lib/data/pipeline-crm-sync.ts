/**
 * Pipeline ↔ CRM sync helpers.
 *
 * Keeps crm_companies, crm_leads, crm_deals and pipeline_opportunities
 * in lockstep:
 *
 *   Pipeline → CRM (syncPipelineToCrm):
 *     - Every client_name becomes a crm_companies row (dedupe by name).
 *     - 'Likely' opportunities materialize as crm_leads.
 *     - When an opp has a linked crm_deal (via crm_deal_id or
 *       crm_deals.pipeline_opportunity_id), update the deal's headline
 *       fields (title / company / probability / stage) instead of
 *       creating a lead.
 *
 *   CRM → Pipeline (syncDealToPipeline):
 *     - Every crm_deals row mirrors a pipeline_opportunities row.
 *     - The link is bidirectional: crm_deals.pipeline_opportunity_id and
 *       pipeline_opportunities.crm_deal_id (added in migration 060).
 *     - Stage → status mapping per SPEC v2 §5.4.
 *
 * Loop prevention: each helper writes directly to the DB (no HTTP), so
 * the route-level sync hooks never fan out beyond their own side.
 *
 * Matches the backfill in supabase/migrations/050_pipeline_crm_sync.sql.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any

export interface PipelineRowForSync {
  id: string
  seq_id?: number | null
  client_name?: string | null
  opportunity_name?: string | null
  sub_opportunity?: string | null
  status?: string | null
  probability?: number | null
  pm_user_id?: string | null
}

function buildLeadTitle(opp: PipelineRowForSync): string {
  const name = (opp.opportunity_name ?? '').trim()
  const sub = (opp.sub_opportunity ?? '').trim()
  const base = name || `Pipeline #${opp.seq_id ?? ''}`.trim()
  return sub ? `${base} - ${sub}` : base
}

async function upsertCompanyByName(db: Db, rawName: string): Promise<string | null> {
  const name = rawName.trim()
  if (!name) return null

  const { data: existing } = await db
    .from('crm_companies')
    .select('id')
    .eq('name', name)
    .limit(1)
    .maybeSingle()
  if (existing?.id) return existing.id

  const { data: created, error } = await db
    .from('crm_companies')
    .insert({
      name,
      source: 'pipeline',
      lifecycle_stage: 'opportunity',
      tags: ['pipeline'],
      custom_fields: { origin: 'pipeline' },
    })
    .select('id')
    .single()
  if (error) {
    console.warn('[pipeline-crm-sync] company insert failed:', error.message)
    return null
  }
  return created?.id ?? null
}

async function upsertLead(db: Db, opp: PipelineRowForSync, companyId: string) {
  // Deal supersedes lead — if a crm_deal already references this opp,
  // refresh the deal's headline fields and skip lead creation.
  const { data: linkedDeal } = await db
    .from('crm_deals')
    .select('id, title, company_id, probability, stage')
    .eq('pipeline_opportunity_id', opp.id)
    .limit(1)
    .maybeSingle()
  if (linkedDeal?.id) {
    await refreshDealFromOpp(db, linkedDeal, opp, companyId)
    return
  }

  const { data: existing } = await db
    .from('crm_leads')
    .select('id')
    .eq('pipeline_opportunity_id', opp.id)
    .limit(1)
    .maybeSingle()

  const title = buildLeadTitle(opp)
  const custom_fields = {
    pipeline_seq_id: opp.seq_id ?? null,
    probability: opp.probability ?? 0,
  }

  if (existing?.id) {
    await db
      .from('crm_leads')
      .update({
        company_id: companyId,
        title,
        owner_id: opp.pm_user_id ?? null,
        custom_fields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return
  }

  await db.from('crm_leads').insert({
    company_id: companyId,
    title,
    status: 'new',
    source: 'pipeline',
    owner_id: opp.pm_user_id ?? null,
    pipeline_opportunity_id: opp.id,
    description: `Auto-created from pipeline opportunity #${opp.seq_id ?? ''}`.trim(),
    tags: ['pipeline', 'likely'],
    custom_fields,
  })
}

async function deleteLeadForOpportunity(db: Db, opportunityId: string) {
  await db.from('crm_leads').delete().eq('pipeline_opportunity_id', opportunityId)
}

// ---------------------------------------------------------------------------
// Pipeline status ↔ CRM Deal stage mapping (SPEC v2 §5.4)
// ---------------------------------------------------------------------------

const STAGE_TO_STATUS: Record<string, string> = {
  proposal: '',
  negotiation: 'Likely',
  contract_sent: 'Firm',
  won: 'Win',
  lost: 'Lost',
  churned: 'Churned',
}

const STATUS_TO_STAGE: Record<string, string> = {
  '': 'proposal',
  Firm: 'contract_sent',
  Likely: 'negotiation',
  Win: 'won',
  Lost: 'lost',
  Churned: 'churned',
}

export function mapStageToStatus(stage: string | null | undefined): string {
  if (!stage) return ''
  return STAGE_TO_STATUS[stage] ?? ''
}

export function mapStatusToStage(status: string | null | undefined): string {
  if (status == null) return 'proposal'
  return STATUS_TO_STAGE[status] ?? 'proposal'
}

interface DealForRefresh {
  id: string
  title?: string | null
  company_id?: string | null
  probability?: number | null
  stage?: string | null
}

async function refreshDealFromOpp(db: Db, deal: DealForRefresh, opp: PipelineRowForSync, companyId: string) {
  const newTitle = buildLeadTitle(opp)
  const newStage = mapStatusToStage(opp.status)
  const patch: Record<string, unknown> = {}
  if (deal.title !== newTitle) patch.title = newTitle
  if (deal.company_id !== companyId) patch.company_id = companyId
  if ((deal.probability ?? 0) !== (opp.probability ?? 0)) patch.probability = opp.probability ?? 0
  if (deal.stage !== newStage) {
    patch.stage = newStage
    patch.stage_changed_at = new Date().toISOString()
  }
  if (Object.keys(patch).length === 0) return
  patch.updated_at = new Date().toISOString()
  await db.from('crm_deals').update(patch).eq('id', deal.id)
}

/**
 * Upsert company + lead for a pipeline opportunity.
 * Safe to call after any insert/update — idempotent and best-effort (errors are logged, not thrown).
 */
export async function syncPipelineToCrm(db: Db, opp: PipelineRowForSync | null | undefined) {
  if (!opp?.id) return
  const name = opp.client_name?.trim()
  if (!name) return
  try {
    const companyId = await upsertCompanyByName(db, name)
    if (!companyId) return
    if (opp.status === 'Likely') {
      await upsertLead(db, opp, companyId)
    } else {
      await deleteLeadForOpportunity(db, opp.id)
    }
  } catch (err) {
    console.warn('[pipeline-crm-sync] syncPipelineToCrm failed:', err)
  }
}

/**
 * Remove the derived lead when a pipeline row is deleted.
 * (Note: the migration sets ON DELETE CASCADE, but we call this explicitly in case
 * a code path deletes the opp via a client that bypasses FK cascade semantics.)
 */
export async function cleanupPipelineCrmLinks(db: Db, opportunityId: string) {
  try {
    await deleteLeadForOpportunity(db, opportunityId)
  } catch (err) {
    console.warn('[pipeline-crm-sync] cleanup failed:', err)
  }
}

// ---------------------------------------------------------------------------
// CRM → Pipeline sync
// ---------------------------------------------------------------------------

export interface DealForSync {
  id: string
  title?: string | null
  stage?: string | null
  probability?: number | null
  tcv?: number | null
  amount?: number | null
  pipeline_opportunity_id?: string | null
  owner_id?: string | null
  sales_contribution?: number | null
  expected_close_date?: string | null
  company?: { id?: string | null; name?: string | null } | null
  company_id?: string | null
}

async function nextSeqId(db: Db): Promise<number> {
  const { data } = await db
    .from('pipeline_opportunities')
    .select('seq_id')
    .order('seq_id', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.seq_id ?? 0) + 1
}

async function resolveCompanyName(db: Db, deal: DealForSync): Promise<string | null> {
  if (deal.company?.name) return deal.company.name
  if (deal.company_id) {
    const { data } = await db
      .from('crm_companies')
      .select('name')
      .eq('id', deal.company_id)
      .maybeSingle()
    return data?.name ?? null
  }
  return deal.title ?? null
}

/**
 * Mirror a CRM deal to its pipeline_opportunities row. Creates a new row if
 * not already linked. Idempotent — safe to call after every save.
 */
export async function syncDealToPipeline(db: Db, deal: DealForSync) {
  if (!deal?.id) return
  try {
    const headlineAmount = deal.tcv ?? deal.amount ?? 0
    const status = mapStageToStatus(deal.stage)
    const clientName = await resolveCompanyName(db, deal)

    if (deal.pipeline_opportunity_id) {
      // Update the existing pipeline row in place.
      const patch: Record<string, unknown> = {
        opportunity_name: deal.title ?? '',
        client_name: clientName ?? '',
        status,
        probability: deal.probability ?? 0,
        pm_user_id: deal.owner_id ?? null,
        cm_percent: deal.sales_contribution ?? 0,
        crm_deal_id: deal.id,
      }
      await db.from('pipeline_opportunities').update(patch).eq('id', deal.pipeline_opportunity_id)
      return
    }

    // Not linked yet — create a new pipeline row and link both directions.
    const seq_id = await nextSeqId(db)
    const insertPayload = {
      seq_id,
      is_new: true,
      client_name: clientName ?? '',
      client_type: 'Prospect',
      opportunity_name: deal.title ?? '',
      status,
      probability: deal.probability ?? 0,
      pm_user_id: deal.owner_id ?? null,
      cm_percent: deal.sales_contribution ?? 0,
      crm_deal_id: deal.id,
    }
    const { data: created, error } = await db
      .from('pipeline_opportunities')
      .insert(insertPayload)
      .select('id')
      .single()
    if (error || !created?.id) {
      console.warn('[pipeline-crm-sync] syncDealToPipeline insert failed:', error?.message)
      return
    }
    await db
      .from('crm_deals')
      .update({ pipeline_opportunity_id: created.id, updated_at: new Date().toISOString() })
      .eq('id', deal.id)

    // If we have an expected close date and a TCV, seed monthly revenue.
    if (headlineAmount > 0 && deal.expected_close_date) {
      const closeMonth = String(deal.expected_close_date).slice(0, 7)
      await db.from('pipeline_monthly_data').insert({
        opportunity_id: created.id,
        month: closeMonth,
        revenue: headlineAmount / 1000,
        revenue_plan: (headlineAmount / 1000) * ((deal.probability ?? 0) / 100),
      })
    }
  } catch (err) {
    console.warn('[pipeline-crm-sync] syncDealToPipeline failed:', err)
  }
}
