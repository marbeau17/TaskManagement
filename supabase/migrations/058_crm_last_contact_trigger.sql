-- 058_crm_last_contact_trigger.sql
-- When a crm_activities row is inserted or its completed_at is set, reflect
-- the activity's effective contact date onto the parent deal or lead's
-- last_contact_date. Only activities representing actual touches count:
-- note, call, email, meeting (skip task/stage_change/status_change/system).

CREATE OR REPLACE FUNCTION fn_crm_last_contact_update()
RETURNS TRIGGER AS $$
DECLARE
  contact_date DATE;
BEGIN
  IF NEW.activity_type NOT IN ('note', 'call', 'email', 'meeting') THEN
    RETURN NEW;
  END IF;

  contact_date := COALESCE(NEW.completed_at, NEW.scheduled_at, NEW.created_at)::date;

  IF NEW.entity_type = 'deal' THEN
    UPDATE crm_deals
      SET last_contact_date = contact_date
      WHERE id = NEW.entity_id
        AND (last_contact_date IS NULL OR last_contact_date < contact_date);
  ELSIF NEW.entity_type = 'lead' THEN
    UPDATE crm_leads
      SET last_contact_date = contact_date
      WHERE id = NEW.entity_id
        AND (last_contact_date IS NULL OR last_contact_date < contact_date);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_last_contact_insert ON crm_activities;
CREATE TRIGGER trg_crm_last_contact_insert
  AFTER INSERT ON crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION fn_crm_last_contact_update();

DROP TRIGGER IF EXISTS trg_crm_last_contact_update ON crm_activities;
CREATE TRIGGER trg_crm_last_contact_update
  AFTER UPDATE OF completed_at ON crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION fn_crm_last_contact_update();

-- Backfill from existing activities (pick the most recent qualifying activity
-- per parent entity).
UPDATE crm_deals d
SET last_contact_date = sub.last_touch
FROM (
  SELECT entity_id,
         MAX(COALESCE(completed_at, scheduled_at, created_at)::date) AS last_touch
  FROM crm_activities
  WHERE entity_type = 'deal'
    AND activity_type IN ('note', 'call', 'email', 'meeting')
  GROUP BY entity_id
) sub
WHERE d.id = sub.entity_id;

UPDATE crm_leads l
SET last_contact_date = sub.last_touch
FROM (
  SELECT entity_id,
         MAX(COALESCE(completed_at, scheduled_at, created_at)::date) AS last_touch
  FROM crm_activities
  WHERE entity_type = 'lead'
    AND activity_type IN ('note', 'call', 'email', 'meeting')
  GROUP BY entity_id
) sub
WHERE l.id = sub.entity_id;
