#!/usr/bin/env tsx
/**
 * Check specific CBB Contact details
 * Usage: npx tsx scripts/check-cbb-contact.ts [phone]
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// Load environment variables
config({ path: resolve(__dirname, '../.env.backend') });

const PHONE = process.argv[2] || '972502005240';
const CBB_API_URL = process.env.CBB_API_URL || 'https://app.chatgptbuilder.io/api';
const CBB_API_KEY = process.env.CBB_API_KEY;

if (!CBB_API_KEY) {
  console.error('❌ CBB_API_KEY not configured in .env.backend');
  process.exit(1);
}

async function checkContact() {
  console.log(`🔍 Checking CBB Contact: ${PHONE}`);
  console.log(`📡 CBB API URL: ${CBB_API_URL}`);
  console.log('━'.repeat(50));

  try {
    // Get contact details
    const response = await axios.get(`${CBB_API_URL}/contacts/${PHONE}`, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY,
      },
    });

    console.log(`\n✅ Contact Found!`);
    console.log('━'.repeat(50));
    
    const contact = response.data;
    console.log(`📌 Contact ID: ${contact.id}`);
    console.log(`📱 Phone: ${contact.phone || 'Not set'}`);
    console.log(`👤 Name: ${contact.name || 'Not set'}`);
    console.log(`📧 Email: ${contact.email || 'Not set'}`);
    
    if (contact.customFields && Object.keys(contact.customFields).length > 0) {
      console.log(`\n📋 Custom Fields:`);
      for (const [field, value] of Object.entries(contact.customFields)) {
        console.log(`  • ${field}: ${value !== null && value !== undefined ? value : 'Not set'}`);
      }
    } else {
      console.log(`\n📋 No custom fields set`);
    }
    
    console.log('━'.repeat(50));
    console.log(`\n💡 Notes:`);
    console.log(`  • Contact exists in CBB with ID: ${contact.id}`);
    console.log(`  • Phone field: ${contact.phone ? `Set to ${contact.phone}` : 'Empty (this might be why it\'s not visible in dashboard)'}`);
    console.log(`  • Name field: ${contact.name ? `Set to "${contact.name}"` : 'Empty'}`);
    
    if (!contact.phone || !contact.name) {
      console.log(`\n⚠️  Warning: Contact has empty phone or name fields!`);
      console.log(`  This might explain why the contact is not visible in CBB dashboard.`);
      console.log(`  CBB dashboard might filter out contacts without basic info.`);
    }

  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error(`\n❌ Contact ${PHONE} does not exist in CBB`);
    } else {
      console.error(`\n❌ Error checking contact:`, error.response?.data || error.message);
    }
  }
}

// Run the check
checkContact().catch(console.error);