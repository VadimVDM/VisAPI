#!/usr/bin/env node

/**
 * Standalone script to create Vizi API keys
 * 
 * Usage: node scripts/create-vizi-api-key.js
 * 
 * This script can be run without the NestJS app context
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pangdzwamawwgmvxnwkk.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required');
  console.error('Set it in your .env file or export it:');
  console.error('export SUPABASE_SERVICE_KEY=your-service-key-here');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createViziApiKey() {
  try {
    // 1. Ensure system user exists
    const systemEmail = 'vizi-system@visanet.app';
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', systemEmail)
      .single();

    let userId;
    if (!existingUser) {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: systemEmail,
          role: 'admin',
        })
        .select()
        .single();

      if (userError) throw userError;
      userId = newUser.id;
    } else {
      userId = existingUser.id;
    }

    // 2. Generate API key components
    const keyPrefix = 'vizi';
    const keyId = crypto.randomBytes(8).toString('hex');
    const keySecret = crypto.randomBytes(32).toString('base64url');
    
    // Full key that user will use
    const fullKey = `${keyPrefix}_${keyId}.${keySecret}`;
    
    // What gets stored in database
    const dbPrefix = `${keyPrefix}_${keyId}`;
    const hashedSecret = await bcrypt.hash(keySecret, 10);

    // 3. Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 days

    // 4. Define scopes (updated for Vizi webhook)
    const scopes = [
      'webhook:vizi',      // Access to Vizi webhook endpoints
      'triggers:create',   // Permission to trigger workflows
      'logs:write'         // Permission to write logs (instead of orders:write)
    ];

    // 5. Insert into database
    const { data: apiKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        name: 'Vizi Webhook API Key',
        prefix: dbPrefix,
        hashed_secret: hashedSecret,
        scopes: scopes,
        expires_at: expiresAt.toISOString(),
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 6. Display results
    console.log('\n✅ Vizi API Key Created Successfully!\n');
    console.log('━'.repeat(60));
    console.log('🔑 API KEY (Save this securely - it cannot be retrieved again):');
    console.log('━'.repeat(60));
    console.log(`\n${fullKey}\n`);
    console.log('━'.repeat(60));
    console.log('\n📋 Key Details:');
    console.log(`• ID: ${apiKey.id}`);
    console.log(`• Name: ${apiKey.name}`);
    console.log(`• Prefix: ${dbPrefix}`);
    console.log(`• Scopes: ${scopes.join(', ')}`);
    console.log(`• Expires: ${new Date(apiKey.expires_at).toLocaleDateString()}`);
    console.log(`• Created by: ${systemEmail}`);
    console.log('\n🚀 Usage:');
    console.log('Use this key in the X-API-Key header when calling:');
    console.log('POST https://api.visanet.app/api/v1/webhooks/vizi/orders');
    console.log('\nExample with curl:');
    console.log(`curl -X POST https://api.visanet.app/api/v1/webhooks/vizi/orders \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${fullKey}" \\
  -d '{"form": {...}, "order": {...}}'`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error creating API key:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    process.exit(1);
  }
}

// Run the script
createViziApiKey();