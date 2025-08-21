#!/usr/bin/env node

/**
 * Script to manually trigger CBB sync for existing IL orders
 * Usage: node scripts/trigger-cbb-sync.js
 */

const Bull = require('bullmq');
const { createClient } = require('@supabase/supabase-js');

// Load environment - use backend env for production services
require('dotenv').config({ path: '.env.backend' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const redisUrl = process.env.REDIS_URL;

if (!supabaseUrl || !supabaseKey || !redisUrl) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse Redis URL
const redisOptions = {};
if (redisUrl.startsWith('rediss://')) {
  const url = new URL(redisUrl);
  redisOptions.host = url.hostname;
  redisOptions.port = url.port || 6379;
  redisOptions.password = url.password;
  redisOptions.tls = {};
} else if (redisUrl.startsWith('redis://')) {
  const url = new URL(redisUrl);
  redisOptions.host = url.hostname;
  redisOptions.port = url.port || 6379;
  if (url.password) {
    redisOptions.password = url.password;
  }
}

async function triggerCBBSync() {
  console.log('🔄 Starting CBB sync for IL orders...\n');

  try {
    // Fetch IL orders that need CBB sync
    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_id, client_name, client_phone, branch, cbb_sync_status')
      .eq('branch', 'il')
      .in('cbb_sync_status', ['pending', null])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch orders:', error);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('✅ No IL orders need CBB sync');
      return;
    }

    console.log(`Found ${orders.length} IL orders needing CBB sync:\n`);
    orders.forEach(order => {
      console.log(`  - ${order.order_id}: ${order.client_name} (${order.client_phone})`);
    });

    // Create queue
    const queue = new Bull.Queue('cbb-sync', {
      connection: redisOptions,
    });

    console.log('\n📤 Queueing CBB sync jobs...\n');

    // Queue sync jobs
    for (const order of orders) {
      try {
        const job = await queue.add(
          'sync-contact',
          { orderId: order.order_id },
          {
            delay: 1000, // 1 second delay between jobs
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: false,
          }
        );
        console.log(`  ✅ Queued sync for ${order.order_id} (Job ID: ${job.id})`);
      } catch (err) {
        console.error(`  ❌ Failed to queue ${order.order_id}:`, err.message);
      }
    }

    console.log('\n✨ CBB sync jobs queued successfully!');
    console.log('📊 Monitor progress in the logs table or check order cbb_sync_status');

    // Close queue connection
    await queue.close();
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
triggerCBBSync();