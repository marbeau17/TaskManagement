-- 059_crm_clients_sync_trigger.sql
-- Bidirectional name sync between `clients` (legacy, used by tasks/projects)
-- and `crm_companies` (full CRM record). Until Phase 3 fully retires the
-- `clients` stub, we keep them in lockstep by name.
--
-- Loop protection: pg_trigger_depth() guards re-entry when one trigger's
-- write fires the other.

-- ----------------------------------------------------------------------------
-- clients → crm_companies: ensure a crm_companies row exists with matching
-- name whenever a client is created or its name changes.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sync_client_to_crm()
RETURNS TRIGGER AS $$
DECLARE
  existing_company_id UUID;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Try to find a crm_companies row with the same name.
  SELECT id INTO existing_company_id
    FROM crm_companies
    WHERE name = NEW.name
    LIMIT 1;

  IF existing_company_id IS NOT NULL THEN
    -- Link it to this client if not already linked.
    UPDATE crm_companies
      SET client_id = NEW.id
      WHERE id = existing_company_id
        AND (client_id IS NULL OR client_id <> NEW.id);
  ELSE
    -- Create a minimal crm_companies row.
    INSERT INTO crm_companies (name, client_id, source, lifecycle_stage, tags, custom_fields)
    VALUES (
      NEW.name,
      NEW.id,
      'other',
      'customer',
      '[]'::jsonb,
      jsonb_build_object('origin', 'clients_sync')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_to_crm_upsert ON clients;
CREATE TRIGGER trg_clients_to_crm_upsert
  AFTER INSERT OR UPDATE OF name ON clients
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_client_to_crm();

-- ----------------------------------------------------------------------------
-- crm_companies → clients: ensure a clients row exists with matching name.
-- Also follow a rename on an already-linked client.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sync_crm_to_client()
RETURNS TRIGGER AS $$
DECLARE
  existing_client_id UUID;
  existing_client_name TEXT;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.client_id IS NULL THEN
    -- Try to find a clients row with the same name.
    SELECT id INTO existing_client_id
      FROM clients
      WHERE name = NEW.name
      LIMIT 1;

    IF existing_client_id IS NOT NULL THEN
      NEW.client_id := existing_client_id;
    ELSE
      -- Create a minimal clients row and link it.
      INSERT INTO clients (name) VALUES (NEW.name)
      RETURNING id INTO existing_client_id;
      NEW.client_id := existing_client_id;
    END IF;
  ELSE
    -- Already linked. If names diverge, follow the crm rename through.
    SELECT name INTO existing_client_name
      FROM clients WHERE id = NEW.client_id;
    IF existing_client_name IS NOT NULL AND existing_client_name <> NEW.name THEN
      UPDATE clients SET name = NEW.name WHERE id = NEW.client_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_companies_to_clients_upsert ON crm_companies;
CREATE TRIGGER trg_crm_companies_to_clients_upsert
  BEFORE INSERT OR UPDATE OF name ON crm_companies
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_crm_to_client();

-- ----------------------------------------------------------------------------
-- Backfill: link existing orphan crm_companies rows to clients by name.
-- ----------------------------------------------------------------------------
UPDATE crm_companies cc
SET client_id = c.id
FROM clients c
WHERE cc.client_id IS NULL
  AND cc.name = c.name;

-- For clients that have no matching crm_companies, create a stub row.
INSERT INTO crm_companies (name, client_id, source, lifecycle_stage, tags, custom_fields)
SELECT c.name, c.id, 'other', 'customer', '[]'::jsonb,
       jsonb_build_object('origin', 'clients_backfill')
FROM clients c
WHERE NOT EXISTS (
  SELECT 1 FROM crm_companies cc WHERE cc.client_id = c.id OR cc.name = c.name
);
