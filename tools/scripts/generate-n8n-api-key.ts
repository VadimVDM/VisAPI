#!/usr/bin/env ts-node

/**
 * Generate a secure API key for n8n webhook authentication
 * Usage: npx ts-node tools/scripts/generate-n8n-api-key.ts
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env['SUPABASE_URL'];
const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function generateN8nApiKey() {
  try {
    console.log('Generating secure API key for n8n webhook...\n');

    // Generate secure random values
    const prefix = 'n8n_' + randomBytes(8).toString('hex');
    const secret = randomBytes(32).toString('hex');
    const fullKey = `${prefix}.${secret}`;

    // Hash the secret part
    const saltRounds = 10;
    const hashedSecret = await bcrypt.hash(secret, saltRounds);

    // Set expiry to 1 year from now
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Insert into database
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        name: 'n8n Webhook Key',
        prefix: prefix,
        hashed_secret: hashedSecret,
        scopes: ['webhook:n8n', 'orders:write'],
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ API Key generated successfully!\n');
    console.log('='.repeat(80));
    console.log('IMPORTANT: Save this API key securely. It will not be shown again.');
    console.log('='.repeat(80));
    console.log(`\nAPI Key: ${fullKey}\n`);
    console.log('='.repeat(80));
    console.log('\nKey Details:');
    console.log(`- Name: n8n Webhook Key`);
    console.log(`- ID: ${data.id}`);
    console.log(`- Prefix: ${prefix}`);
    console.log(`- Scopes: webhook:n8n, orders:write`);
    console.log(`- Expires: ${expiresAt.toLocaleDateString()}`);
    console.log('\nAdd this to your n8n webhook configuration:');
    console.log(`Header: X-API-Key`);
    console.log(`Value: ${fullKey}`);
    console.log('\n');

  } catch (error) {
    console.error('Error generating API key:', error);
    process.exit(1);
  }
}

// Run the script
generateN8nApiKey();