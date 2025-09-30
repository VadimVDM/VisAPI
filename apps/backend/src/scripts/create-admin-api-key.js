const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Standalone script to create an admin API key for Vizi webhooks retrigger functionality
 *
 * Usage:
 * - Via npm script: pnpm nx run backend:create-admin-key
 * - Directly: node apps/backend/src/scripts/create-admin-api-key.js
 *
 * Requirements:
 * - .env.local file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *
 * This script creates:
 * 1. A system user (vizi-admin@visanet.app) if it doesn't exist
 * 2. An admin API key with full permissions for webhook retrigger operations
 *
 * The generated key can be used to call:
 * POST /api/v1/webhooks/vizi/retrigger
 */
async function createAdminKey() {
  console.log('🔧 Creating Vizi Admin API Key...\n');

  // Load environment variables
  require('dotenv').config({ path: '.env.local' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error(
      '   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local',
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Create system user if not exists
    const systemEmail = 'vizi-admin@visanet.app';

    let userId;

    // Try to get existing user
    console.log('👤 Checking for existing system user...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', systemEmail)
      .single();

    if (existingUser) {
      userId = existingUser.id;
      console.log('   ✅ Found existing system user:', userId);
    } else {
      // Create new user
      console.log('   📝 Creating new system user...');
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: systemEmail,
          role: 'admin',
        })
        .select()
        .single();

      if (userError) {
        throw userError;
      }

      userId = newUser.id;
      console.log('   ✅ Created new system user:', userId);
    }

    // Generate API key in the correct format (prefix.secret)
    console.log('\n🔑 Generating API key...');
    const prefix = 'vizi_admin_' + crypto.randomBytes(8).toString('hex');
    const secret = crypto.randomBytes(32).toString('hex');
    const fullKey = prefix + '.' + secret;

    // Hash the secret part
    const hashedSecret = await bcrypt.hash(secret, 10);

    // Create API key record
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .insert({
        name: 'Vizi Admin API Key (Retrigger)',
        prefix: prefix,
        hashed_secret: hashedSecret,
        scopes: [
          'webhook:vizi',
          'admin',
          'orders:write',
          'triggers:create',
          'logs:write',
          'queues:read',
          'integrations:airtable:read',
          'integrations:airtable:write',
          'integrations:scraper:trigger',
          'integrations:scraper:read',
        ],
        created_by: userId,
        expires_at: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 3 months
      })
      .select()
      .single();

    if (keyError) {
      throw keyError;
    }

    console.log('   ✅ API key created successfully!\n');

    console.log('📋 ADMIN API KEY DETAILS');
    console.log('========================');
    console.log('');
    console.log('🚨 SAVE THIS KEY SECURELY - IT WILL NOT BE SHOWN AGAIN:');
    console.log('');
    console.log(`🔐 API Key: ${fullKey}`);
    console.log('');
    console.log('📊 Key Information:');
    console.log(`   • Key ID: ${apiKey.id}`);
    console.log(`   • Prefix: ${apiKey.prefix}`);
    console.log(`   • Scopes: ${apiKey.scopes.join(', ')}`);
    console.log(`   • Expires: ${apiKey.expires_at}`);
    console.log(`   • User ID: ${userId}`);
    console.log('');
    console.log('🎯 Usage:');
    console.log('   Use this key in the X-API-Key header when calling:');
    console.log('   POST /api/v1/webhooks/vizi/retrigger');
    console.log('');
    console.log('🧪 Test Examples:');
    console.log('');
    console.log('   Single order retrigger:');
    console.log(
      `   curl -X POST https://api.visanet.app/api/v1/webhooks/vizi/retrigger \\`,
    );
    console.log(`     -H "X-API-Key: ${fullKey}" \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"mode": "single", "orderId": "IL250824IN15"}'`);
    console.log('');
    console.log('   Bulk retrigger by date range:');
    console.log(
      `   curl -X POST https://api.visanet.app/api/v1/webhooks/vizi/retrigger \\`,
    );
    console.log(`     -H "X-API-Key: ${fullKey}" \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(
      `     -d '{"mode": "bulk", "startDate": "2024-08-24T00:00:00Z", "endDate": "2024-08-24T23:59:59Z"}'`,
    );
    console.log('');
    console.log('   Bulk retrigger with order IDs:');
    console.log(
      `   curl -X POST https://api.visanet.app/api/v1/webhooks/vizi/retrigger \\`,
    );
    console.log(`     -H "X-API-Key: ${fullKey}" \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(
      `     -d '{"mode": "bulk", "orderIds": ["IL250824IN15", "IL250825US20"]}'`,
    );
  } catch (error) {
    console.error('\n❌ Error creating Vizi Admin API key:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  } finally {
    // Ensure the process exits cleanly
    process.exit(0);
  }
}

// Only run if called directly (not when required as module)
if (require.main === module) {
  createAdminKey();
}

module.exports = { createAdminKey };
