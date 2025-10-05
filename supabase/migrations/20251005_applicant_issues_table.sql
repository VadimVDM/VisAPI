-- Applicant Issues Table Migration
-- Created: October 5, 2025
-- Purpose: Track issue reports from Visanet application for applicants requiring document fixes

-- Applicant issues table to track all issue reports and WhatsApp notifications
CREATE TABLE IF NOT EXISTS applicant_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Applicant identification (from Visanet/Airtable)
  applicant_id TEXT NOT NULL,
  order_id TEXT, -- Populated after Airtable lookup

  -- Issue data (stored as JSONB for flexibility)
  issues JSONB NOT NULL,

  -- Airtable lookup data
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  applicant_metadata JSONB, -- Additional applicant data from Airtable

  -- WhatsApp notification tracking
  whatsapp_notification_sent BOOLEAN DEFAULT FALSE,
  whatsapp_notification_sent_at TIMESTAMP WITH TIME ZONE,
  whatsapp_message_id TEXT,
  whatsapp_contact_id TEXT, -- CBB contact ID (phone number)
  whatsapp_template_used TEXT,
  whatsapp_correlation_id TEXT, -- For message ID correlation

  -- Error tracking
  error_message TEXT,
  error_code TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'lookup_completed', 'notification_sent', 'failed')),

  -- Processing metadata
  processed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Additional metadata
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_applicant_issues_applicant_id ON applicant_issues(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applicant_issues_order_id ON applicant_issues(order_id);
CREATE INDEX IF NOT EXISTS idx_applicant_issues_status ON applicant_issues(status);
CREATE INDEX IF NOT EXISTS idx_applicant_issues_created_at ON applicant_issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applicant_issues_whatsapp_sent ON applicant_issues(whatsapp_notification_sent) WHERE whatsapp_notification_sent = FALSE;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_applicant_issues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_applicant_issues_updated_at
  BEFORE UPDATE ON applicant_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_applicant_issues_updated_at();

-- RLS (Row Level Security) policies
ALTER TABLE applicant_issues ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role has full access to applicant_issues"
  ON applicant_issues
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read all issues (simplified policy)
-- In the future, this can be restricted based on order ownership
CREATE POLICY "Authenticated users can read applicant issues"
  ON applicant_issues
  FOR SELECT
  TO authenticated
  USING (true);

-- Comments for documentation
COMMENT ON TABLE applicant_issues IS 'Tracks issue reports for applicants requiring document fixes';
COMMENT ON COLUMN applicant_issues.applicant_id IS 'Applicant ID from Visanet/Airtable (e.g., apl_jwGu1dBAxeOc)';
COMMENT ON COLUMN applicant_issues.issues IS 'JSONB object with issue categories and their specific issues';
COMMENT ON COLUMN applicant_issues.status IS 'Processing status: received, lookup_completed, notification_sent, or failed';
COMMENT ON COLUMN applicant_issues.whatsapp_correlation_id IS 'Correlation ID for tracking message ID updates from Meta webhooks';
COMMENT ON COLUMN applicant_issues.metadata IS 'Additional metadata for tracking and debugging';
