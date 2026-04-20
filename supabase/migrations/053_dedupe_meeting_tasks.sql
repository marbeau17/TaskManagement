-- 053_dedupe_meeting_tasks.sql
-- Enforce one task per MS365 calendar event at the DB level.
--
-- Background: src/app/api/ms365/sync/route.ts auto-creates a task per meeting
-- and dedupes in-memory via template_data->>'ms_event_id'. When the sync runs
-- concurrently (manual click + 2-min interval + window-focus), both callers
-- can read the existing-task set before either writes, producing duplicates.
-- A partial unique index closes that race.
--
-- All tables with FKs to tasks(id) use ON DELETE CASCADE or SET NULL (verified
-- in migrations 004, 005, 006, 010, 012, 015, 016, 022, 047), so deleting the
-- duplicate rows below will not orphan anything.

-- -----------------------------------------------------------------------------
-- Step 1 — dedupe existing rows. Keep the oldest task per ms_event_id; drop
-- the rest. created_at ASC + id ASC gives a deterministic tiebreaker.
-- -----------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY template_data->>'ms_event_id'
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM tasks
  WHERE template_data ? 'ms_event_id'
    AND btrim(coalesce(template_data->>'ms_event_id', '')) <> ''
)
DELETE FROM tasks
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- -----------------------------------------------------------------------------
-- Step 2 — partial unique index. NULL / empty ms_event_id rows are excluded
-- so non-meeting tasks are unaffected.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_ms_event_id
  ON tasks ((template_data->>'ms_event_id'))
  WHERE template_data ? 'ms_event_id'
    AND btrim(coalesce(template_data->>'ms_event_id', '')) <> '';
