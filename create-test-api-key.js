#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

async function createApiKey() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Generate API key components
  const prefix = 'visapi';
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const secret = crypto.randomBytes(32).toString('base64url');
  const fullKey = `${prefix}_${randomBytes}_${secret}`;
  
  // Hash the secret
  const hashedSecret = await bcrypt.hash(secret, 10);
  
  // Insert into database
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      name: 'Test WhatsApp API Key',
      prefix: `${prefix}_${randomBytes}`,
      hashed_secret: hashedSecret,
      scopes: ['workflows:*', 'queue:*', 'logs:*'],
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating API key:', error);
    process.exit(1);
  }
  
  console.log('✅ API Key created successfully!');
  console.log('📋 Key details:');
  console.log('   ID:', data.id);
  console.log('   Name:', data.name);
  console.log('   Prefix:', data.prefix);
  console.log('   Scopes:', data.scopes.join(', '));
  console.log('\n🔑 Full API Key (save this, it cannot be retrieved again):');
  console.log(`   ${fullKey}`);
  
  return fullKey;
}

createApiKey().then(key => {
  console.log('\n📝 Export this for testing:');
  console.log(`export TEST_API_KEY="${key}"`);
}).catch(console.error);