-- 050_pipeline_crm_sync.sql
-- Sync pipeline_opportunities into CRM:
--   1. Every distinct client_name becomes a crm_companies row
--   2. Every Likely opportunity becomes a crm_leads row (unless a crm_deal already links to it)
--
-- Adds crm_leads.pipeline_opportunity_id so the app can dedupe / keep leads in lockstep
-- when pipeline rows are edited.

ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS pipeline_opportunity_id UUID
    REFERENCES pipeline_opportunities(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_crm_leads_pipeline_opportunity_id
  ON crm_leads(pipeline_opportunity_id);

-- -----------------------------------------------------------------------------
-- Backfill 1: crm_companies from distinct pipeline client_names
-- -----------------------------------------------------------------------------
INSERT INTO crm_companies (name, source, lifecycle_stage, tags, custom_fields)
SELECT DISTINCT
  po.client_name,
  'pipeline',
  'opportunity',
  '["pipeline"]'::jsonb,
  jsonb_build_object('origin', 'pipeline')
FROM pipeline_opportunities po
WHERE po.client_name IS NOT NULL
  AND btrim(po.client_name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM crm_companies cc WHERE cc.name = po.client_name
  );

-- -----------------------------------------------------------------------------
-- Backfill 2: crm_leads for every Likely opportunity
--   - skip if a crm_deal already references this pipeline row (deal supersedes lead)
--   - skip if a lead already references this pipeline row (idempotent re-run)
-- -----------------------------------------------------------------------------
INSERT INTO crm_leads (
  company_id,
  title,
  status,
  source,
  estimated_value,
  owner_id,
  pipeline_opportunity_id,
  description,
  tags,
  custom_fields
)
SELECT
  cc.id,
  CASE
    WHEN po.sub_opportunity IS NOT NULL AND btrim(po.sub_opportunity) <> ''
      THEN po.opportunity_name || ' - ' || po.sub_opportunity
    ELSE COALESCE(NULLIF(btrim(po.opportunity_name), ''), 'Pipeline #' || po.seq_id)
  END,
  'new',
  'pipeline',
  COALESCE(
    (SELECT SUM(revenue) * 1000 FROM pipeline_monthly_data WHERE opportunity_id = po.id),
    0
  ),
  po.pm_user_id,
  po.id,
  'Auto-created from pipeline opportunity #' || po.seq_id,
  '["pipeline", "likely"]'::jsonb,
  jsonb_build_object(
    'pipeline_seq_id', po.seq_id,
    'probability', po.probability
  )
FROM pipeline_opportunities po
JOIN crm_companies cc ON cc.name = po.client_name
WHERE po.status = 'Likely'
  AND NOT EXISTS (
    SELECT 1 FROM crm_leads cl WHERE cl.pipeline_opportunity_id = po.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM crm_deals cd WHERE cd.pipeline_opportunity_id = po.id
  );
