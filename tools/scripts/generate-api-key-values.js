#!/usr/bin/env node

/**
 * Generate API key values for manual insertion
 * Usage: node tools/scripts/generate-api-key-values.js
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');

async function generateApiKeyValues() {
  // Generate secure random values
  const prefix = 'n8n_' + crypto.randomBytes(8).toString('hex');
  const secret = crypto.randomBytes(32).toString('hex');
  const fullKey = `${prefix}.${secret}`;

  // Hash the secret
  const saltRounds = 10;
  const hashedSecret = await bcrypt.hash(secret, saltRounds);

  console.log('='.repeat(80));
  console.log('API KEY GENERATION VALUES');
  console.log('='.repeat(80));
  console.log('\n1. Full API Key (save this securely):');
  console.log(`   ${fullKey}`);
  console.log('\n2. SQL Values for manual insertion:');
  console.log(`   prefix: '${prefix}'`);
  console.log(`   hashed_secret: '${hashedSecret}'`);
  console.log('\n3. SQL Insert Statement:');
  console.log(`
INSERT INTO api_keys (
  name,
  prefix,
  hashed_secret,
  scopes,
  expires_at
) VALUES (
  'n8n Webhook Key',
  '${prefix}',
  '${hashedSecret}',
  ARRAY['webhook:n8n', 'orders:write'],
  NOW() + INTERVAL '1 year'
)
RETURNING id, name, prefix, scopes, expires_at;
`);
  console.log('='.repeat(80));
  console.log('\nInstructions:');
  console.log('1. Copy the SQL insert statement above');
  console.log('2. Run it in your Supabase SQL editor');
  console.log('3. Save the full API key for use in n8n');
  console.log('4. Configure n8n webhook with:');
  console.log('   - Header: X-API-Key');
  console.log(`   - Value: ${fullKey}`);
  console.log('='.repeat(80));
}

generateApiKeyValues().catch(console.error);