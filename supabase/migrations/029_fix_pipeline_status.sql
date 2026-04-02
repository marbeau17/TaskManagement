-- Fix misspelled status 'Namelikly' -> 'Likely'
UPDATE pipeline_opportunities SET status = 'Likely' WHERE status = 'Namelikly';
ALTER TABLE pipeline_opportunities DROP CONSTRAINT IF EXISTS pipeline_opportunities_status_check;
ALTER TABLE pipeline_opportunities ADD CONSTRAINT pipeline_opportunities_status_check
  CHECK (status IN ('Firm', 'Likely', 'Win', 'Lost', ''));
