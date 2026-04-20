-- 054_merge_line_logistics_clients.sql
-- Merge the duplicate client entry "株式会社ラインロジスティックス" into the
-- canonical "LINEロジスティクス株式会社", then delete the duplicate.
--
-- `clients` is referenced by:
--   tasks.client_id         (NOT NULL, ON DELETE RESTRICT) — must reassign first
--   projects.client_id      (nullable, ON DELETE SET NULL) — reassign to preserve
--   crm_companies.client_id (nullable, ON DELETE SET NULL) — reassign to preserve
-- The DO block fails loudly rather than silently orphaning data if either
-- client name is missing in this DB.

DO $$
DECLARE
  dup_id UUID;
  canonical_id UUID;
  moved_tasks INT := 0;
  moved_projects INT := 0;
  moved_crm INT := 0;
BEGIN
  SELECT id INTO dup_id
    FROM clients WHERE name = '株式会社ラインロジスティックス' LIMIT 1;

  SELECT id INTO canonical_id
    FROM clients WHERE name = 'LINEロジスティクス株式会社' LIMIT 1;

  IF dup_id IS NULL THEN
    RAISE NOTICE 'Duplicate client "株式会社ラインロジスティックス" not found — nothing to do.';
    RETURN;
  END IF;

  IF canonical_id IS NULL THEN
    RAISE EXCEPTION 'Canonical client "LINEロジスティクス株式会社" not found; refusing to delete duplicate and orphan its data.';
  END IF;

  UPDATE tasks SET client_id = canonical_id WHERE client_id = dup_id;
  GET DIAGNOSTICS moved_tasks = ROW_COUNT;

  UPDATE projects SET client_id = canonical_id WHERE client_id = dup_id;
  GET DIAGNOSTICS moved_projects = ROW_COUNT;

  UPDATE crm_companies SET client_id = canonical_id WHERE client_id = dup_id;
  GET DIAGNOSTICS moved_crm = ROW_COUNT;

  DELETE FROM clients WHERE id = dup_id;

  RAISE NOTICE 'Merged duplicate client (%) into canonical (%). Moved: % tasks, % projects, % crm_companies.',
    dup_id, canonical_id, moved_tasks, moved_projects, moved_crm;
END $$;
