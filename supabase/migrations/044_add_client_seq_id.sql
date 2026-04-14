-- Add numeric sequential ID to clients for CSV management
ALTER TABLE clients ADD COLUMN IF NOT EXISTS seq_id SERIAL;

-- Backfill existing clients with sequential IDs based on creation order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, name) AS rn
  FROM clients
)
UPDATE clients SET seq_id = numbered.rn
FROM numbered WHERE clients.id = numbered.id;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_seq_id ON clients(seq_id);
