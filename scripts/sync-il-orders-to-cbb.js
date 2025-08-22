#!/usr/bin/env node

/**
 * Manual sync script for IL orders to CBB
 * This syncs the recovered orders to the CBB system
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: '.env.backend' });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CBB_API_URL = process.env.CBB_API_URL || 'https://app.chatgptbuilder.io/api';
const CBB_ACCESS_TOKEN = process.env.CBB_API_KEY || '1947781.eT6fJXXJ0v9DzobZKJFVC3gYExg8qEcP0djNfBFH9OmwE8La3';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// IL orders to sync
const ilOrders = [
  'IL250822IN1',
  'IL250822MA2',
  'IL250822MA3',
  'IL250822SC4',
  'IL250822CA5'
];

async function syncOrderToCBB(orderId) {
  console.log(`\n🔄 Syncing order ${orderId} to CBB...`);
  
  try {
    // Get the order details
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      console.error(`❌ Could not find order ${orderId}`);
      return false;
    }

    // Check if already synced
    if (order.cbb_synced) {
      console.log(`✅ Order ${orderId} already synced to CBB`);
      return true;
    }

    // Prepare contact data for CBB
    const contactData = {
      name: order.client_name,
      email: order.client_email,
      phone: order.client_phone,
      customFields: {
        order_id: order.order_id,
        form_id: order.form_id,
        product: order.product_name,
        country: order.product_country,
        visa_type: order.product_doc_type || 'unknown',
        amount: `${order.currency} ${order.amount}`,
        order_date: order.created_at,
        branch: order.branch.toUpperCase()
      },
      tags: [
        `order_${order.order_status}`,
        `branch_${order.branch}`,
        `country_${order.product_country}`,
        'vizi_webhook'
      ]
    };

    // Create contact in CBB (using their specific format)
    const cbbPayload = {
      phone: order.client_phone,
      email: order.client_email,
      name: order.client_name,
      actions: [
        { action: 'set_field_value', field_name: 'customer_name', value: order.client_name },
        { action: 'set_field_value', field_name: 'visa_country', value: order.product_country },
        { action: 'set_field_value', field_name: 'visa_type', value: order.product_doc_type || 'unknown' },
        { action: 'set_field_value', field_name: 'OrderNumber', value: order.order_id },
        { action: 'set_field_value', field_name: 'payment_amount', value: String(order.amount) },
        { action: 'set_field_value', field_name: 'order_branch', value: order.branch.toUpperCase() },
        { action: 'set_field_value', field_name: 'order_date', value: order.created_at }
      ]
    };

    const response = await axios.post(
      `${CBB_API_URL}/contacts`,
      cbbPayload,
      {
        headers: {
          'X-ACCESS-TOKEN': CBB_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    // CBB returns nested structure: { success: true, data: { id: '...' } }
    const cbbContactId = response.data?.data?.id || response.data?.id;
    
    if (response.data && response.data.success && cbbContactId) {
      // Update order with CBB contact ID
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          cbb_synced: true,
          cbb_contact_id: cbbContactId.toString()
        })
        .eq('order_id', orderId);

      if (updateError) {
        console.error(`❌ Failed to update order ${orderId}:`, updateError);
        return false;
      }

      console.log(`✅ Order ${orderId} synced to CBB (Contact ID: ${cbbContactId})`);
      return true;
    } else {
      console.log(`⚠️ CBB returned unexpected response for ${orderId}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to sync ${orderId} to CBB:`);
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    return false;
  }

  return false;
}

async function main() {
  console.log('🚀 Starting CBB Sync for IL Orders');
  console.log('📅 Date: August 22, 2025');
  console.log(`🌐 CBB API URL: ${CBB_API_URL}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const orderId of ilOrders) {
    const success = await syncOrderToCBB(orderId);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 SYNC SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Successfully synced: ${successCount} orders`);
  console.log(`❌ Failed to sync: ${failCount} orders`);

  // Verify final state
  const { data: syncedOrders, error } = await supabase
    .from('orders')
    .select('order_id, cbb_synced, cbb_contact_id')
    .eq('branch', 'il')
    .gte('created_at', '2025-08-22T00:00:00Z')
    .lte('created_at', '2025-08-22T23:59:59Z');

  if (!error && syncedOrders) {
    console.log(`\n📈 IL Orders CBB Sync Status:`);
    syncedOrders.forEach(order => {
      const status = order.cbb_synced ? '✅' : '❌';
      const contactId = order.cbb_contact_id || 'N/A';
      console.log(`   ${status} ${order.order_id} (CBB ID: ${contactId})`);
    });
  }

  console.log('\n✨ CBB sync script completed!');
}

// Run the script
main().catch(console.error);