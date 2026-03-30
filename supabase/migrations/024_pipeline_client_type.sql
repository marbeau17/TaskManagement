-- Add client_type column to pipeline_opportunities
ALTER TABLE pipeline_opportunities ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'Customer' CHECK (client_type IN ('Customer', 'Prospect'));
