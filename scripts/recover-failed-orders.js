#!/usr/bin/env node

/**
 * Recovery script for failed Vizi webhook orders from August 22, 2025
 * This script extracts webhook data from logs and replays them through the API
 * 
 * IMPORTANT: WhatsApp messages will NOT be sent during recovery (late night consideration)
 * But CBB synchronization will still occur for IL branch orders
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: '.env.backend' });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.visanet.app' 
  : 'http://localhost:3000';
const VIZI_API_KEY = process.env.VIZI_API_KEY || 'vizi_32cf6923b6d84884.YBGmlP3VLQ1GrV51BL_wurqPBzjh3A3jISRfsdqb49g'; // Production Vizi API key

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// List of failed orders to recover (from our analysis)
const failedOrders = [
  { order_id: 'RU250822IN1', timestamp: '2025-08-22 06:45:38.804+00' },
  { order_id: 'IL250822IN1', timestamp: '2025-08-22 08:28:51.809+00' },
  { order_id: 'IL250822MA2', timestamp: '2025-08-22 08:42:04.117+00' },
  { order_id: 'RU250822IN2', timestamp: '2025-08-22 09:27:16.985+00' },
  { order_id: 'IL250822MA3', timestamp: '2025-08-22 11:10:27.832+00' },
  { order_id: 'IL250822SC4', timestamp: '2025-08-22 14:07:06.979+00' },
  { order_id: 'RU250822IN3', timestamp: '2025-08-22 16:00:47.477+00' },
  { order_id: 'RU250822KR4', timestamp: '2025-08-22 17:49:19.063+00' },
  { order_id: 'IL250822CA5', timestamp: '2025-08-22 18:17:39.832+00' }
];

async function extractWebhookDataFromLogs(orderId) {
  console.log(`\n📝 Extracting webhook data for order: ${orderId}`);
  
  // Query logs to get the webhook data
  const { data, error } = await supabase
    .from('logs')
    .select('metadata')
    .eq('level', 'info')
    .like('message', `%Vizi webhook received for order ${orderId}%`)
    .single();

  if (error) {
    console.error(`❌ Error fetching logs for ${orderId}:`, error);
    return null;
  }

  if (!data || !data.metadata || !data.metadata.webhook_data) {
    console.error(`❌ No webhook data found for ${orderId}`);
    return null;
  }

  console.log(`✅ Found webhook data for ${orderId}`);
  return data.metadata.webhook_data;
}

async function checkIfOrderExists(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('order_id', orderId)
    .single();

  return !!data && !error;
}

async function replayWebhook(webhookData, orderId) {
  console.log(`\n🔄 Replaying webhook for order: ${orderId}`);

  // Check if order already exists
  const exists = await checkIfOrderExists(orderId);
  if (exists) {
    console.log(`⚠️  Order ${orderId} already exists in database, skipping...`);
    return { success: true, message: 'Order already exists' };
  }

  // Disable WhatsApp messages for this recovery by modifying the webhook data
  if (webhookData.form && webhookData.form.client) {
    webhookData.form.client.whatsappAlertsEnabled = false;
    console.log(`📵 WhatsApp messages disabled for ${orderId} (late night recovery)`);
  }

  try {
    // Send the webhook to the API
    const response = await axios.post(
      `${API_URL}/api/v1/webhooks/vizi/orders`,
      webhookData,
      {
        headers: {
          'X-API-Key': VIZI_API_KEY,
          'Content-Type': 'application/json',
          'X-Correlation-Id': `recovery-${orderId}-${Date.now()}`,
          'X-Recovery-Mode': 'true' // Flag to indicate this is a recovery
        }
      }
    );

    console.log(`✅ Successfully replayed webhook for ${orderId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ Failed to replay webhook for ${orderId}:`, error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

async function syncToCBB(orderId) {
  console.log(`🔄 Syncing order ${orderId} to CBB...`);
  
  try {
    // Get the order details
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      console.error(`❌ Could not find order ${orderId} for CBB sync`);
      return false;
    }

    // Only sync IL branch orders
    if (order.branch !== 'il') {
      console.log(`⏭️  Skipping CBB sync for ${orderId} (branch: ${order.branch})`);
      return true;
    }

    // Check if already synced
    if (order.cbb_synced_at) {
      console.log(`✅ Order ${orderId} already synced to CBB`);
      return true;
    }

    // Trigger CBB sync through the API
    const response = await axios.post(
      `${API_URL}/api/v1/queue/sync-to-cbb`,
      { orderId: order.id },
      {
        headers: {
          'X-API-Key': VIZI_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ CBB sync triggered for ${orderId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to sync ${orderId} to CBB:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Vizi Order Recovery Script');
  console.log('📅 Date: August 22, 2025');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API URL: ${API_URL}`);
  console.log('📵 WhatsApp messages: DISABLED (late night recovery)');
  console.log('✅ CBB synchronization: ENABLED for IL orders\n');

  const results = {
    successful: [],
    failed: [],
    alreadyExists: []
  };

  // Process each failed order
  for (const failedOrder of failedOrders) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${failedOrder.order_id}`);
    console.log(`${'='.repeat(60)}`);

    // Step 1: Extract webhook data from logs
    const webhookData = await extractWebhookDataFromLogs(failedOrder.order_id);
    if (!webhookData) {
      results.failed.push({
        orderId: failedOrder.order_id,
        reason: 'Could not extract webhook data from logs'
      });
      continue;
    }

    // Step 2: Replay the webhook
    const replayResult = await replayWebhook(webhookData, failedOrder.order_id);
    
    if (replayResult.message === 'Order already exists') {
      results.alreadyExists.push(failedOrder.order_id);
    } else if (replayResult.success) {
      results.successful.push(failedOrder.order_id);
      
      // Step 3: Sync to CBB (only for IL orders)
      if (webhookData.order && webhookData.order.branch === 'il') {
        await syncToCBB(failedOrder.order_id);
      }
    } else {
      results.failed.push({
        orderId: failedOrder.order_id,
        reason: replayResult.error
      });
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 RECOVERY SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Successfully recovered: ${results.successful.length} orders`);
  if (results.successful.length > 0) {
    results.successful.forEach(id => console.log(`   - ${id}`));
  }
  
  console.log(`\n⚠️  Already existed: ${results.alreadyExists.length} orders`);
  if (results.alreadyExists.length > 0) {
    results.alreadyExists.forEach(id => console.log(`   - ${id}`));
  }
  
  console.log(`\n❌ Failed to recover: ${results.failed.length} orders`);
  if (results.failed.length > 0) {
    results.failed.forEach(item => console.log(`   - ${item.orderId}: ${item.reason}`));
  }

  // Verify final state
  console.log(`\n${'='.repeat(60)}`);
  console.log('🔍 VERIFICATION');
  console.log(`${'='.repeat(60)}`);
  
  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', '2025-08-22T00:00:00Z')
    .lte('created_at', '2025-08-22T23:59:59Z');

  if (!error) {
    console.log(`📈 Total orders created on August 22: ${count}`);
  }

  // Check IL orders synced to CBB
  const { count: cbbCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('branch', 'il')
    .not('cbb_synced_at', 'is', null)
    .gte('created_at', '2025-08-22T00:00:00Z');

  console.log(`🔗 IL orders synced to CBB today: ${cbbCount || 0}`);

  console.log('\n✨ Recovery script completed!');
}

// Run the script
main().catch(console.error);