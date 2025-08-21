#!/usr/bin/env tsx
/**
 * Update CBB Contact custom fields
 * Usage: npx tsx scripts/update-cbb-contact-fields.ts
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

async function updateContactBasicInfo(phone: string, name: string) {
  console.log(`🔄 Updating contact basic info for ${phone}...`);
  
  try {
    // Try using PUT instead of PATCH
    const response = await axios.put(`${CBB_API_URL}/contacts/${phone}`, {
      name: name,
    }, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`✅ Basic info updated:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Failed to update basic info:`, error.response?.data || error.message);
    
    // Try POST to same endpoint
    console.log(`🔄 Trying POST method...`);
    try {
      const response2 = await axios.post(`${CBB_API_URL}/contacts/${phone}`, {
        name: name,
      }, {
        headers: {
          'X-ACCESS-TOKEN': CBB_API_KEY!,
          'Content-Type': 'application/json',
        },
      });
      console.log(`✅ Basic info updated via POST:`, response2.data);
      return response2.data;
    } catch (error2: any) {
      console.error(`❌ POST also failed:`, error2.response?.data || error2.message);
    }
  }
}

async function setCustomField(contactId: string, fieldName: string, value: any) {
  console.log(`  Setting ${fieldName} = ${value}`);
  
  try {
    // First get the custom field ID
    const fieldsResponse = await axios.get(`${CBB_API_URL}/accounts/custom_fields`, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
      },
    });
    
    const field = fieldsResponse.data.find((f: any) => f.name === fieldName);
    if (!field) {
      console.log(`    ⚠️ Field "${fieldName}" not found in CBB`);
      return false;
    }
    
    // Set the custom field value
    const response = await axios.post(
      `${CBB_API_URL}/contacts/${contactId}/custom_fields/${field.id}`,
      { value: value },
      {
        headers: {
          'X-ACCESS-TOKEN': CBB_API_KEY!,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log(`    ✅ Set successfully`);
    return true;
  } catch (error: any) {
    console.error(`    ❌ Failed to set ${fieldName}:`, error.response?.data?.message || error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 CBB Contact Update Test');
  console.log('━'.repeat(50));

  const contactId = '972502005240';
  
  try {
    // 1. Try to update basic info
    console.log(`Step 1: Update basic info...`);
    await updateContactBasicInfo(contactId, 'Test Customer');
    
    // 2. Set custom fields one by one
    console.log(`\nStep 2: Set custom fields...`);
    const customFields = {
      customer_name: 'Test Customer',
      visa_country: 'india',
      visa_type: 'tourist',
      OrderNumber: 'IL250821IN1',
      visa_quantity: 1,
      order_urgent: 0,
      order_priority: 'standard',
      order_date: 1755734400,
      Email: 'test@visanet.app',
    };
    
    for (const [fieldName, value] of Object.entries(customFields)) {
      await setCustomField(contactId, fieldName, value);
    }
    
    // 3. Verify the update
    console.log(`\nStep 3: Verify final state...`);
    const response = await axios.get(`${CBB_API_URL}/contacts/${contactId}`, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
      },
    });
    
    const contact = response.data;
    console.log(`\n✅ Final Contact State:`);
    console.log(`  • ID: ${contact.id}`);
    console.log(`  • Phone: ${contact.phone || 'Not set'}`);
    console.log(`  • Name: ${contact.name || 'Not set'}`);
    console.log(`  • Email: ${contact.email || 'Not set'}`);
    
    // Get custom fields
    const fieldsResponse = await axios.get(`${CBB_API_URL}/contacts/${contactId}/custom_fields`, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
      },
    });
    
    if (fieldsResponse.data && fieldsResponse.data.length > 0) {
      console.log(`  • Custom Fields Set: ${fieldsResponse.data.length} fields`);
      for (const field of fieldsResponse.data) {
        console.log(`    - ${field.name}: ${field.value}`);
      }
    } else {
      console.log(`  • Custom Fields: None set`);
    }
    
    console.log('━'.repeat(50));
    console.log(`\n✨ Update complete!`);
    console.log(`The contact should now be visible in the CBB dashboard with all data.`);

  } catch (error: any) {
    console.error(`\n❌ Fatal error:`, error.message);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);