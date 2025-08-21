#!/usr/bin/env tsx
/**
 * Check CBB Custom Fields definitions
 * Usage: npx tsx scripts/check-cbb-custom-fields.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// Load environment variables
config({ path: resolve(__dirname, '../.env.backend') });

const CBB_API_URL = process.env.CBB_API_URL || 'https://app.chatgptbuilder.io/api';
const CBB_API_KEY = process.env.CBB_API_KEY;

if (!CBB_API_KEY) {
  console.error('❌ CBB_API_KEY not configured in .env.backend');
  process.exit(1);
}

async function checkCustomFields() {
  console.log('🔍 Fetching CBB Custom Fields from API');
  console.log(`📡 CBB API URL: ${CBB_API_URL}`);
  console.log('━'.repeat(50));

  try {
    // Get all custom fields
    const response = await axios.get(`${CBB_API_URL}/accounts/custom_fields`, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY,  // CBB uses X-ACCESS-TOKEN header
      },
    });

    console.log(`\n📋 Found ${response.data.length} Custom Fields:\n`);
    
    response.data.forEach((field: any) => {
      const typeMap: Record<number, string> = {
        0: 'Text',
        1: 'Number',
        2: 'Date (Unix timestamp)',
        3: 'Date & Time (Unix timestamp)',
        4: 'Boolean (0 or 1)',
        5: 'Long Text',
        6: 'Select',
        7: 'Multi Select',
      };
      
      console.log(`📌 Field: ${field.name}`);
      console.log(`   • ID: ${field.id}`);
      console.log(`   • Type: ${typeMap[field.type] || `Unknown (${field.type})`}`);
      if (field.description) {
        console.log(`   • Description: ${field.description}`);
      }
      console.log('');
    });

    console.log('━'.repeat(50));
    console.log('\n💡 Custom Field Mapping for CBB Sync:\n');
    console.log('Based on the custom fields above, here\'s what we should use:');
    console.log('');
    
    // Map our fields to CBB fields
    const fieldMapping = {
      'order_urgent': 'Boolean field - TRUE/FALSE based on urgency',
      'Email': 'Text field - Customer email',
      'OrderNumber': 'Text field - Our order ID',
      'customer_name': 'Text field - Customer full name',
      'visa_country': 'Text field - Destination country',
      'visa_type': 'Text field - Visa type',
      'visa_quantity': 'Number field - Number of visas',
    };
    
    for (const [field, description] of Object.entries(fieldMapping)) {
      const exists = response.data.find((f: any) => f.name === field);
      if (exists) {
        console.log(`✅ ${field}: ${description}`);
      } else {
        console.log(`⚠️  ${field}: ${description} (NOT FOUND - may need creation)`);
      }
    }

  } catch (error: any) {
    console.error(`\n❌ Failed to fetch custom fields:`, error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('\n🔑 API Key issue - please check CBB_API_KEY in .env.backend');
    }
    
    process.exit(1);
  }
}

// Run the check
checkCustomFields().catch(console.error);