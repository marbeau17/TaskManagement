/**
 * Pipeline → CRM sync helpers.
 *
 * Keeps crm_companies and crm_leads in lockstep with pipeline_opportunities:
 *   - Every client_name becomes a crm_companies row (dedupe by name).
 *   - Every Likely opportunity becomes a crm_leads row (linked via pipeline_opportunity_id).
 *   - When an opp moves out of Likely or is deleted, the derived lead is removed.
 *   - Opportunities that already have a linked crm_deal are left alone (deal supersedes lead).
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
  const { data: linkedDeal } = await db
    .from('crm_deals')
    .select('id')
    .eq('pipeline_opportunity_id', opp.id)
    .limit(1)
    .maybeSingle()
  if (linkedDeal?.id) return

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
