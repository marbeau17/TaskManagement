-- Create assets table for asset management feature
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_no INTEGER,
  name TEXT NOT NULL,
  acquired_date DATE,
  acquired_price NUMERIC,
  management_id TEXT UNIQUE,
  owner_name TEXT,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'in_use' CHECK (status IN ('in_use','spare','disposed','loaned')),
  serial_number TEXT,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_owner_user_id ON assets(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_assets_management_id ON assets(management_id);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to assets"
  ON assets FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_assets_updated_at();
