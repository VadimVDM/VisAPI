#!/usr/bin/env tsx
/**
 * Fix CBB Contact with complete data
 * Usage: npx tsx scripts/fix-cbb-contact.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// Load environment variables
config({ path: resolve(__dirname, '../.env.backend') });

const CBB_API_URL = process.env.CBB_API_URL || 'https://app.chatgptbuilder.io/api';
const CBB_API_KEY = process.env.CBB_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!CBB_API_KEY) {
  console.error('❌ CBB_API_KEY not configured in .env.backend');
  process.exit(1);
}

async function getOrder(orderId: string): Promise<any> {
  console.log(`📥 Fetching order ${orderId} from database...`);
  
  const response = await axios.get(`${SUPABASE_URL}/rest/v1/orders`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY!,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    params: {
      order_id: `eq.${orderId}`,
      select: '*',
    },
  });

  if (response.data && response.data.length > 0) {
    return response.data[0];
  }
  return null;
}

async function fixContact(phone: string, data: any) {
  console.log(`🔧 Fixing contact ${phone} with complete data...`);
  
  try {
    // Update contact with ALL fields (basic + custom)
    const response = await axios.patch(`${CBB_API_URL}/contacts/${phone}`, {
      // Basic fields
      phone: phone,
      name: data.name,
      email: data.email,
      // Custom fields
      customFields: data.cufs,
    }, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`✅ Contact updated successfully with all fields`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Error updating contact:`, error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting CBB Contact Fix');
  console.log('━'.repeat(50));

  try {
    // 1. Get order from database
    const order = await getOrder('IL250821IN1');
    if (!order) {
      console.error(`❌ Order not found`);
      return;
    }

    console.log(`\n📋 Order Details:`);
    console.log(`  • Order ID: ${order.order_id}`);
    console.log(`  • Client: ${order.client_name}`);
    console.log(`  • Email: ${order.client_email}`);
    console.log(`  • Phone: ${order.client_phone}`);
    console.log(`  • Country: ${order.product_country}`);
    console.log(`  • Entry Date: ${order.entry_date}`);
    console.log('━'.repeat(50));

    // 2. Calculate Unix timestamp for order_date
    let orderDateUnix: number | undefined;
    if (order.entry_date) {
      const date = new Date(order.entry_date);
      if (!isNaN(date.getTime())) {
        orderDateUnix = Math.floor(date.getTime() / 1000);
        console.log(`  • Order Date Unix: ${orderDateUnix}`);
      }
    }

    // 3. Prepare complete contact data
    const contactData = {
      phone: order.client_phone,
      name: order.client_name,
      email: order.client_email,
      cufs: {
        customer_name: order.client_name,
        visa_country: order.product_country,
        visa_type: order.product_doc_type || 'tourist',
        OrderNumber: order.order_id,
        visa_quantity: order.visa_quantity || 1,
        order_urgent: (order.urgency === 'urgent' || order.urgency === 'express') ? 1 : 0,
        order_priority: order.urgency || 'standard',
        order_date: orderDateUnix,
        Email: order.client_email,
      },
    };

    console.log(`\n📦 Contact Data to Send:`);
    console.log(JSON.stringify(contactData, null, 2));
    console.log('━'.repeat(50));

    // 4. Fix the contact
    await fixContact(order.client_phone, contactData);

    // 5. Verify the fix
    console.log(`\n🔍 Verifying contact update...`);
    const verifyResponse = await axios.get(`${CBB_API_URL}/contacts/${order.client_phone}`, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
      },
    });

    const contact = verifyResponse.data;
    console.log(`\n✅ Contact Verified:`);
    console.log(`  • ID: ${contact.id}`);
    console.log(`  • Phone: ${contact.phone || 'Not set'}`);
    console.log(`  • Name: ${contact.name || 'Not set'}`);
    console.log(`  • Email: ${contact.email || 'Not set'}`);
    
    if (contact.customFields && Object.keys(contact.customFields).length > 0) {
      console.log(`  • Custom Fields: ${Object.keys(contact.customFields).length} fields set`);
    }

    console.log('━'.repeat(50));
    console.log(`\n🎉 Contact Fixed Successfully!`);
    console.log(`The contact should now be visible in the CBB dashboard.`);

  } catch (error: any) {
    console.error(`\n❌ Fix Failed:`, error.message);
    process.exit(1);
  }
}

// Run the fix
main().catch(console.error);