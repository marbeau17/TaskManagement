-- Add resolved_date and closed_date to issues
ALTER TABLE issues ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
