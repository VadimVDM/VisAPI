#!/usr/bin/env node

/**
 * VisAPI Database Type Regeneration Script
 *
 * Regenerates TypeScript types from Supabase schema using the Supabase CLI.
 *
 * Usage:
 *   pnpm regenerate:types
 *
 * Requirements:
 *   - Supabase CLI installed (npx supabase)
 *   - SUPABASE_ACCESS_TOKEN environment variable set
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const PROJECT_ID = 'pangdzwamawwgmvxnwkk';
const TYPES_FILE = path.join(__dirname, '..', 'libs/shared/types/src/lib/database.types.ts');

async function main() {
  console.log('🔄 Regenerating database types from Supabase...');

  try {
    // Check if SUPABASE_ACCESS_TOKEN is set
    if (!process.env.SUPABASE_ACCESS_TOKEN) {
      console.error('❌ SUPABASE_ACCESS_TOKEN environment variable is not set');
      console.log('\n💡 To set it up:');
      console.log('1. Get your access token from: https://supabase.com/dashboard/account/tokens');
      console.log('2. Add to your .env file: SUPABASE_ACCESS_TOKEN=your_token_here');
      console.log('3. Or export it: export SUPABASE_ACCESS_TOKEN=your_token_here');
      process.exit(1);
    }

    console.log(`📋 Project ID: ${PROJECT_ID}`);
    console.log(`📝 Target file: ${TYPES_FILE}`);
    console.log('');

    // Generate types using Supabase CLI
    console.log('⚙️  Generating types with Supabase CLI...');
    const command = `npx supabase gen types typescript --project-id ${PROJECT_ID} --schema public`;

    const types = execSync(command, {
      encoding: 'utf-8',
      env: { ...process.env },
    });

    // Write types to file
    console.log('📝 Writing types to file...');
    fs.writeFileSync(TYPES_FILE, types);

    console.log('✅ Types successfully regenerated!');
    console.log('');
    console.log('📚 Schema includes:');
    console.log('  • orders');
    console.log('  • scraper_jobs ✨ NEW');
    console.log('  • cbb_contacts');
    console.log('  • whatsapp_messages');
    console.log('  • api_keys');
    console.log('  • workflows');
    console.log('  • users & roles');
    console.log('');
    console.log('🚀 Next step: pnpm nx build types');

  } catch (error) {
    console.error('❌ Error regenerating types:', error.message);
    console.log('');
    console.log('💡 Make sure:');
    console.log('  1. SUPABASE_ACCESS_TOKEN is set correctly');
    console.log('  2. Supabase CLI is installed (npx supabase --version)');
    console.log('  3. You have internet connection');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };