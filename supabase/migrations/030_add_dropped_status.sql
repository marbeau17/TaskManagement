-- Add 'dropped' to task_status enum
-- First check if the column uses an enum type
DO $$
BEGIN
  -- If status is enum type, add the new value
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'task_status'
  ) THEN
    ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'dropped';
  END IF;
END$$;
