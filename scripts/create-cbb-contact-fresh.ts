#!/usr/bin/env tsx
/**
 * Create CBB Contact from scratch
 * Usage: npx tsx scripts/create-cbb-contact-fresh.ts
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

async function deleteContact(phone: string) {
  console.log(`🗑️ Attempting to delete contact ${phone} if it exists...`);
  
  try {
    const response = await axios.delete(`${CBB_API_URL}/contacts/${phone}`, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
      },
    });
    console.log(`✅ Contact deleted successfully`);
    return true;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`ℹ️ Contact does not exist (404), proceeding with creation`);
      return false;
    }
    console.error(`⚠️ Delete attempt failed:`, error.response?.data || error.message);
    return false;
  }
}

async function createContact() {
  console.log(`➕ Creating new contact 972502005240...`);
  
  const contactData = {
    id: '972502005240',
    phone: '972502005240',
    name: 'Test Customer',
    email: 'test@visanet.app',
    customFields: {
      customer_name: 'Test Customer',
      visa_country: 'india',
      visa_type: 'tourist',
      OrderNumber: 'IL250821IN1',
      visa_quantity: 1,
      order_urgent: 0,
      order_priority: 'standard',
      order_date: 1755734400,
      Email: 'test@visanet.app',
    },
  };
  
  try {
    const response = await axios.post(`${CBB_API_URL}/contacts`, contactData, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`✅ Contact created successfully!`);
    console.log(`Response:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
      console.log(`⚠️ Contact already exists (409). Let me check it...`);
      
      // Try to get the existing contact
      try {
        const getResponse = await axios.get(`${CBB_API_URL}/contacts/972502005240`, {
          headers: {
            'X-ACCESS-TOKEN': CBB_API_KEY!,
          },
        });
        console.log(`Existing contact data:`, JSON.stringify(getResponse.data, null, 2));
      } catch (getError: any) {
        console.error(`Failed to get existing contact:`, getError.response?.data || getError.message);
      }
      
      return null;
    }
    console.error(`❌ Error creating contact:`, error.response?.data || error.message);
    throw error;
  }
}

async function verifyContact() {
  console.log(`\n🔍 Verifying contact 972502005240...`);
  
  try {
    const response = await axios.get(`${CBB_API_URL}/contacts/972502005240`, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
      },
    });
    
    const contact = response.data;
    console.log(`\n✅ Contact Details:`);
    console.log(`  • ID: ${contact.id}`);
    console.log(`  • Phone: ${contact.phone || 'Not set'}`);
    console.log(`  • Name: ${contact.name || 'Not set'}`);
    console.log(`  • Email: ${contact.email || 'Not set'}`);
    
    if (contact.customFields && Object.keys(contact.customFields).length > 0) {
      console.log(`  • Custom Fields:`);
      for (const [field, value] of Object.entries(contact.customFields)) {
        console.log(`    - ${field}: ${value}`);
      }
    } else {
      console.log(`  • Custom Fields: None`);
    }
    
    return contact;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`❌ Contact not found (404)`);
      return null;
    }
    console.error(`❌ Error verifying contact:`, error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 CBB Contact Creation Test');
  console.log('━'.repeat(50));

  try {
    // 1. First check if contact exists
    console.log(`Step 1: Check if contact exists...`);
    const exists = await verifyContact();
    
    if (exists) {
      console.log(`\n⚠️ Contact already exists. Do you want to delete and recreate it?`);
      console.log(`Current data shows:`);
      console.log(`  - Phone: ${exists.phone || 'empty'}`);
      console.log(`  - Name: ${exists.name || 'empty'}`);
      console.log(`  - Email: ${exists.email || 'empty'}`);
      
      // Try to delete it
      console.log(`\nAttempting to delete...`);
      await deleteContact('972502005240');
    }
    
    // 2. Create the contact
    console.log(`\nStep 2: Create contact...`);
    const created = await createContact();
    
    // 3. Verify creation
    if (created) {
      console.log(`\nStep 3: Verify creation...`);
      await verifyContact();
    }
    
    console.log('━'.repeat(50));
    console.log(`\n✨ Process complete!`);
    console.log(`Check the CBB dashboard to see if the contact is visible now.`);

  } catch (error: any) {
    console.error(`\n❌ Fatal error:`, error.message);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);