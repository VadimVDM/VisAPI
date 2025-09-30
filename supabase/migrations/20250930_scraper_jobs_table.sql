-- Scraper Jobs Table Migration
-- Created: September 30, 2025
-- Purpose: Track visa document scraping jobs for ESTA, Vietnam eVisa, and Korea K-ETA

-- Scraper jobs table to track all scraping attempts and results
CREATE TABLE IF NOT EXISTS scraper_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Job identification
  job_id TEXT NOT NULL UNIQUE,
  scraper_type TEXT NOT NULL CHECK (scraper_type IN ('esta', 'vietnam-evisa', 'korea-keta')),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'not_found', 'retry')),

  -- Credentials (stored securely, encrypted at rest by Supabase)
  credentials JSONB NOT NULL,

  -- Document metadata (populated on success)
  document_url TEXT,
  signed_url TEXT,
  filename TEXT,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',

  -- Error tracking
  error_message TEXT,
  error_code TEXT,

  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  retry_after TIMESTAMP WITH TIME ZONE,
  should_retry BOOLEAN DEFAULT FALSE,

  -- Performance metrics
  duration_ms INTEGER,
  screenshots JSONB, -- Array of base64 screenshots for debugging

  -- Timestamps
  downloaded_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Foreign key relationships
  order_id TEXT REFERENCES orders(order_id) ON DELETE SET NULL,

  -- Webhook for completion notification
  webhook_url TEXT,
  webhook_sent BOOLEAN DEFAULT FALSE,

  -- Additional metadata
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scraper_jobs_job_id ON scraper_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_scraper_jobs_status ON scraper_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraper_jobs_scraper_type ON scraper_jobs(scraper_type);
CREATE INDEX IF NOT EXISTS idx_scraper_jobs_order_id ON scraper_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_scraper_jobs_created_at ON scraper_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_jobs_retry_after ON scraper_jobs(retry_after) WHERE retry_after IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_scraper_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scraper_jobs_updated_at
  BEFORE UPDATE ON scraper_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_scraper_jobs_updated_at();

-- RLS (Row Level Security) policies
ALTER TABLE scraper_jobs ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role has full access to scraper_jobs"
  ON scraper_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read their own jobs (via order_id)
CREATE POLICY "Users can read their own scraper jobs"
  ON scraper_jobs
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.order_id
      FROM orders o
      WHERE o.created_by_email = auth.jwt() ->> 'email'
    )
  );

-- Comments for documentation
COMMENT ON TABLE scraper_jobs IS 'Tracks visa document scraping jobs and their results';
COMMENT ON COLUMN scraper_jobs.job_id IS 'Unique job identifier from queue system';
COMMENT ON COLUMN scraper_jobs.scraper_type IS 'Type of visa scraper: esta, vietnam-evisa, or korea-keta';
COMMENT ON COLUMN scraper_jobs.status IS 'Current job status: pending, running, completed, failed, not_found, or retry';
COMMENT ON COLUMN scraper_jobs.credentials IS 'Encrypted credentials for accessing government portals';
COMMENT ON COLUMN scraper_jobs.document_url IS 'Supabase storage URL for downloaded document';
COMMENT ON COLUMN scraper_jobs.retry_after IS 'Timestamp when job should be retried (for not_found status)';
COMMENT ON COLUMN scraper_jobs.screenshots IS 'Base64 encoded screenshots for debugging failed jobs';