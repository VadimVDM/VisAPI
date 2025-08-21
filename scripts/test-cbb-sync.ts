#!/usr/bin/env tsx
/**
 * Test CBB Contact Sync for a specific order
 * Usage: npx tsx scripts/test-cbb-sync.ts [order-id]
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// Load environment variables
config({ path: resolve(__dirname, '../.env.backend') });

const ORDER_ID = process.argv[2] || 'IL250821IN1';
const CBB_API_URL = process.env.CBB_API_URL || 'https://app.chatgptbuilder.io/api';
const CBB_API_KEY = process.env.CBB_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!CBB_API_KEY) {
  console.error('❌ CBB_API_KEY not configured in .env');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Supabase credentials not configured in .env.backend');
  process.exit(1);
}

interface OrderData {
  order_id: string;
  client_phone: string;
  client_name: string;
  client_email: string;
  product_country: string;
  product_doc_type?: string;
  visa_quantity: number;
  urgency?: string;
  amount: number;
  currency: string;
  entry_date?: string;
  branch: string;
  form_id: string;
  webhook_received_at: string;
  whatsapp_alerts_enabled: boolean;
}

interface CBBContactData {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  cufs: Record<string, any>;
}

async function getOrder(orderId: string): Promise<OrderData | null> {
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

async function checkContactExists(phone: string): Promise<boolean> {
  console.log(`🔍 Checking if contact exists for phone: ${phone}`);
  
  try {
    const response = await axios.get(`${CBB_API_URL}/contacts/${phone}`, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
      },
    });
    
    console.log(`✅ Contact exists with ID: ${response.data.id}`);
    return true;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`ℹ️ Contact does not exist`);
      return false;
    }
    console.error(`❌ Error checking contact:`, error.response?.data || error.message);
    throw error;
  }
}

async function createContact(data: CBBContactData): Promise<any> {
  console.log(`➕ Creating new contact...`);
  
  try {
    const response = await axios.post(`${CBB_API_URL}/contacts`, {
      id: data.id,
      phone: data.phone,
      name: data.name,
      email: data.email,
      customFields: data.cufs,
    }, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`✅ Contact created successfully:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Error creating contact:`, error.response?.data || error.message);
    throw error;
  }
}

async function updateContactFields(id: string, cufs: Record<string, any>): Promise<any> {
  console.log(`🔄 Updating contact custom fields for ID: ${id}`);
  
  try {
    const response = await axios.patch(`${CBB_API_URL}/contacts/${id}`, {
      customFields: cufs,
    }, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`✅ Contact custom fields updated successfully`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Error updating contact:`, error.response?.data || error.message);
    throw error;
  }
}

async function updateContactComplete(data: CBBContactData): Promise<any> {
  console.log(`🔄 Updating complete contact data for ID: ${data.id}`);
  
  try {
    const response = await axios.patch(`${CBB_API_URL}/contacts/${data.id}`, {
      phone: data.phone,
      name: data.name,
      email: data.email,
      customFields: data.cufs,
    }, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`✅ Contact fully updated with all fields`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Error updating contact:`, error.response?.data || error.message);
    throw error;
  }
}

async function validateWhatsApp(phone: string): Promise<boolean> {
  console.log(`📱 Validating WhatsApp for phone: ${phone}`);
  
  try {
    const response = await axios.get(`${CBB_API_URL}/contacts/${phone}/validate-whatsapp`, {
      headers: {
        'X-ACCESS-TOKEN': CBB_API_KEY!,
      },
    });
    
    const hasWhatsApp = response.data?.hasWhatsApp || false;
    console.log(`📱 WhatsApp status: ${hasWhatsApp ? '✅ Available' : '❌ Not available'}`);
    return hasWhatsApp;
  } catch (error: any) {
    console.warn(`⚠️ Failed to validate WhatsApp:`, error.response?.data || error.message);
    return false;
  }
}

async function updateOrderSyncStatus(orderId: string, updates: any): Promise<void> {
  console.log(`💾 Updating order sync status in database...`);
  
  const response = await axios.patch(
    `${SUPABASE_URL}/rest/v1/orders?order_id=eq.${orderId}`,
    updates,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    }
  );
  
  console.log(`✅ Order updated successfully`);
}

async function testCBBSync() {
  console.log('🚀 Starting CBB Contact Sync Test');
  console.log(`📌 Order ID: ${ORDER_ID}`);
  console.log('━'.repeat(50));

  try {
    // 1. Get order from database
    const order = await getOrder(ORDER_ID);
    if (!order) {
      console.error(`❌ Order ${ORDER_ID} not found in database`);
      return;
    }

    console.log(`\n📋 Order Details:`);
    console.log(`  • Client: ${order.client_name}`);
    console.log(`  • Email: ${order.client_email}`);
    console.log(`  • Phone: ${order.client_phone}`);
    console.log(`  • Country: ${order.product_country}`);
    console.log(`  • WhatsApp Alerts: ${order.whatsapp_alerts_enabled}`);
    console.log('━'.repeat(50));

    // 2. Prepare contact data
    // Calculate order_date Unix timestamp (in seconds)
    let orderDateUnix: number | undefined;
    if (order.entry_date) {
      try {
        const date = new Date(order.entry_date);
        if (!isNaN(date.getTime())) {
          orderDateUnix = Math.floor(date.getTime() / 1000); // Convert to seconds
          console.log(`  • Entry Date: ${order.entry_date} (Unix: ${orderDateUnix})`);
        }
      } catch (error) {
        console.warn(`  ⚠️ Failed to convert entry_date: ${order.entry_date}`);
      }
    }
    
    const contactData: CBBContactData = {
      id: order.client_phone,
      phone: order.client_phone,
      name: order.client_name,
      email: order.client_email,
      cufs: {
        // CBB Custom Fields - Must match exact field names from CBB API
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

    console.log(`\n📦 Contact Data Prepared:`);
    console.log(JSON.stringify(contactData, null, 2));
    console.log('━'.repeat(50));

    // 3. Mark as syncing
    await updateOrderSyncStatus(ORDER_ID, {
      cbb_sync_status: 'syncing',
      cbb_sync_attempted_at: new Date().toISOString(),
    });

    // 4. Check if contact exists
    const contactExists = await checkContactExists(order.client_phone);
    
    let contact;
    let isNewContact = false;

    if (contactExists) {
      // Update existing contact with ALL fields (basic + custom)
      contact = await updateContactComplete(contactData);
    } else {
      // Create new contact
      contact = await createContact(contactData);
      isNewContact = true;
    }

    // 5. Validate WhatsApp
    const hasWhatsApp = await validateWhatsApp(order.client_phone);

    // 6. Update order with results
    await updateOrderSyncStatus(ORDER_ID, {
      cbb_contact_id: contact.id || order.client_phone,
      cbb_sync_status: hasWhatsApp ? 'synced' : 'no_whatsapp',
      cbb_contact_exists: !isNewContact,
      cbb_has_whatsapp: hasWhatsApp,
      cbb_sync_completed_at: new Date().toISOString(),
      cbb_sync_error: null,
    });

    console.log('━'.repeat(50));
    console.log(`\n🎉 CBB Sync Completed Successfully!`);
    console.log(`  • Action: ${isNewContact ? 'Created new contact' : 'Updated existing contact'}`);
    console.log(`  • Contact ID: ${contact.id || order.client_phone}`);
    console.log(`  • WhatsApp: ${hasWhatsApp ? '✅ Available' : '❌ Not available'}`);
    console.log('━'.repeat(50));

  } catch (error: any) {
    console.error(`\n❌ CBB Sync Failed:`, error.message);
    
    // Update order with error
    await updateOrderSyncStatus(ORDER_ID, {
      cbb_sync_status: 'failed',
      cbb_sync_error: error.message,
      cbb_sync_attempted_at: new Date().toISOString(),
    }).catch(err => console.error('Failed to update order error status:', err));
    
    process.exit(1);
  }
}

// Run the test
testCBBSync().catch(console.error);