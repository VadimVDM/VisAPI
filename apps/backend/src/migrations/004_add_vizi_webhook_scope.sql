-- Migration: Add Vizi webhook scope and update API key system
-- Date: 2025-07-31

BEGIN;

-- Add new scope for vizi webhooks
INSERT INTO api_key_scopes (scope, description)
VALUES ('webhook:vizi', 'Access to Vizi webhook endpoints')
ON CONFLICT (scope) DO NOTHING;

-- Create a function to mark old n8n keys for deprecation
CREATE OR REPLACE FUNCTION mark_n8n_keys_deprecated()
RETURNS void AS $$
BEGIN
  UPDATE api_keys 
  SET 
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb), 
      '{deprecated}', 
      'true'::jsonb
    ),
    expires_at = CASE 
      WHEN expires_at > NOW() + INTERVAL '30 days' OR expires_at IS NULL 
      THEN NOW() + INTERVAL '30 days'
      ELSE expires_at
    END
  WHERE prefix = 'n8n_';
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT mark_n8n_keys_deprecated();

-- Drop the function after use
DROP FUNCTION mark_n8n_keys_deprecated();

-- Add index on prefix for better query performance
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix);

-- Create webhook_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS webhook_data (
  webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Add index for webhook queries
CREATE INDEX IF NOT EXISTS idx_webhook_data_type_processed 
ON webhook_data(type, processed, created_at DESC);

COMMIT;