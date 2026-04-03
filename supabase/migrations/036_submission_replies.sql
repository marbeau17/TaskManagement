-- Submission replies for form inquiries
CREATE TABLE IF NOT EXISTS crm_submission_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES crm_form_submissions(id) ON DELETE CASCADE,
  reply_to TEXT NOT NULL,           -- email address
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_replies_submission ON crm_submission_replies(submission_id);
ALTER TABLE crm_submission_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_replies_all" ON crm_submission_replies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add status tracking to submissions
ALTER TABLE crm_form_submissions ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
ALTER TABLE crm_form_submissions ADD COLUMN IF NOT EXISTS replied_by UUID REFERENCES users(id) ON DELETE SET NULL;
