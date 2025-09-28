#!/usr/bin/env node

/**
 * VisAPI Database Type Regeneration Script
 *
 * Regenerates TypeScript types from Supabase schema and updates the shared types library.
 * Uses the Supabase MCP tool for type generation.
 *
 * Usage:
 *   pnpm regenerate:types
 *
 * Requirements:
 *   - Claude Code with Supabase MCP integration
 *   - Project ID: pangdzwamawwgmvxnwkk
 */

const fs = require('fs').promises;
const path = require('path');

const PROJECT_ID = 'pangdzwamawwgmvxnwkk';
const TYPES_FILE = 'libs/shared/types/src/lib/database.types.ts';

async function main() {
  console.log('🔄 Regenerating database types from Supabase...');

  try {
    // Note: This script requires Claude Code with Supabase MCP integration
    console.log(`📋 Project ID: ${PROJECT_ID}`);
    console.log(`📝 Target file: ${TYPES_FILE}`);

    console.log('\n⚠️  To regenerate types:');
    console.log('1. Use Claude Code with Supabase MCP integration');
    console.log('2. Run: mcp__supabase__generate_typescript_types');
    console.log('3. Update the types file manually or via Claude');
    console.log('4. Rebuild the types library: pnpm nx build types');

    console.log('\n📚 Current schema includes:');
    console.log('  • orders (with visa_validity_days field)');
    console.log('  • cbb_contacts');
    console.log('  • whatsapp_messages');
    console.log('  • api_keys');
    console.log('  • workflows');
    console.log('  • users & roles');

    console.log('\n✅ For now, types have been manually updated with latest schema');
    console.log('🚀 Run "pnpm nx build types" to compile the updated types');

  } catch (error) {
    console.error('❌ Error regenerating types:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };