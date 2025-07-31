-- Script to manually create an n8n API key in Supabase
-- Run this in your Supabase SQL editor

-- Generate a secure API key for n8n webhook
-- You'll need to manually generate the prefix and secret, then hash the secret

-- Example values (REPLACE THESE WITH YOUR OWN SECURE VALUES):
-- Prefix: n8n_1234567890abcdef
-- Secret: abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
-- Full API Key: n8n_1234567890abcdef.abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890

-- To generate the bcrypt hash, you can use an online bcrypt generator or run:
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YOUR_SECRET_HERE', 10).then(console.log)"

INSERT INTO api_keys (
  name,
  prefix,
  hashed_secret,
  scopes,
  expires_at
) VALUES (
  'n8n Webhook Key',
  'n8n_1234567890abcdef', -- REPLACE with your generated prefix
  '$2b$10$YourBcryptHashHere', -- REPLACE with bcrypt hash of your secret
  ARRAY['webhook:n8n', 'orders:write'],
  NOW() + INTERVAL '1 year'
)
RETURNING id, name, prefix, scopes, expires_at;

-- Instructions:
-- 1. Generate a random prefix: n8n_<16 random hex characters>
-- 2. Generate a random secret: <64 random hex characters>
-- 3. Create bcrypt hash of the secret (salt rounds: 10)
-- 4. Replace the values above and run this query
-- 5. Save the full API key: prefix.secret
-- 6. Use the full API key in your n8n webhook configuration