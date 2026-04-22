-- 057_crm_stage_changed_trigger.sql
-- Auto-update stage_changed_at whenever stage (deals) or status (leads)
-- changes. Used for "stuck in stage N days" reports on the manager dashboard.

CREATE OR REPLACE FUNCTION fn_crm_deals_stage_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_deals_stage_changed ON crm_deals;
CREATE TRIGGER trg_crm_deals_stage_changed
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION fn_crm_deals_stage_changed();

CREATE OR REPLACE FUNCTION fn_crm_leads_status_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.stage_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_leads_status_changed ON crm_leads;
CREATE TRIGGER trg_crm_leads_status_changed
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION fn_crm_leads_status_changed();
