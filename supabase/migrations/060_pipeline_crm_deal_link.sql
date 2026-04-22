-- 060_pipeline_crm_deal_link.sql
-- Add the back-pointer from pipeline_opportunities → crm_deals so the two
-- can be kept in lockstep by app-layer sync (PR4).
--
-- crm_deals.pipeline_opportunity_id (existing) is the forward link.
-- This adds the reverse to make either-side lookups cheap and to enforce
-- the 1:1 relationship.

ALTER TABLE pipeline_opportunities
  ADD COLUMN IF NOT EXISTS crm_deal_id UUID
    REFERENCES crm_deals(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pipeline_opportunities_crm_deal_id
  ON pipeline_opportunities(crm_deal_id)
  WHERE crm_deal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_opportunities_crm_deal_id
  ON pipeline_opportunities(crm_deal_id);

-- Backfill: for every crm_deals row that already references a pipeline_opportunity,
-- write the reverse pointer.
UPDATE pipeline_opportunities po
SET crm_deal_id = cd.id
FROM crm_deals cd
WHERE cd.pipeline_opportunity_id = po.id
  AND po.crm_deal_id IS NULL;
