#!/usr/bin/env node
/**
 * Backfill Orders Script
 *
 * This script backfills the orders table with historical data from logs.
 * It reconstructs order records from Vizi webhook logs for the past 30 days.
 *
 * Usage: npx ts-node apps/backend/src/scripts/backfill-orders.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env') });

const supabaseUrl = process.env['SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

interface LogRecord {
  id: string;
  level: string;
  message: string;
  metadata: any;
  created_at: string;
  workflow_id?: string;
  job_id?: string;
  correlation_id?: string;
}

interface OrderGroup {
  orderId: string;
  receivedLog?: LogRecord;
  processedLog?: LogRecord;
  errorLogs: LogRecord[];
}

/**
 * Extract branch code from order ID
 */
function extractBranchFromOrderId(orderId: string): string {
  if (!orderId || orderId.length < 2) {
    return 'unknown';
  }
  return orderId.substring(0, 2).toLowerCase();
}

/**
 * Get currency for country
 */
function getCurrencyForCountry(country: string): string {
  const currencyMap: Record<string, string> = {
    uk: 'GBP',
    gb: 'GBP',
    usa: 'USD',
    us: 'USD',
    canada: 'CAD',
    ca: 'CAD',
    india: 'INR',
    in: 'INR',
    israel: 'ILS',
    il: 'ILS',
    vietnam: 'VND',
    vn: 'VND',
    korea: 'KRW',
    kr: 'KRW',
    morocco: 'MAD',
    ma: 'MAD',
    saudi_arabia: 'SAR',
    sa: 'SAR',
    schengen: 'EUR',
    eu: 'EUR',
  };
  return currencyMap[country?.toLowerCase()] || 'USD';
}

/**
 * Reconstruct order data from logs
 */
function reconstructOrderFromLogs(orderGroup: OrderGroup): any {
  const { orderId, receivedLog, processedLog } = orderGroup;

  if (!receivedLog) {
    console.warn(`No received log found for order ${orderId}`);
    return null;
  }

  const metadata = receivedLog.metadata || {};
  const processedMetadata = processedLog?.metadata || {};

  // Try to extract as much data as possible from metadata
  const country = metadata.country || 'unknown';
  const formId = metadata.form_id || 'unknown';

  return {
    // Core order fields
    order_id: orderId,
    form_id: formId,
    branch: extractBranchFromOrderId(orderId),
    domain: metadata.domain || 'historical-import',
    payment_processor: metadata.payment_processor || 'unknown',
    payment_id: metadata.payment_id || 'unknown',
    amount: metadata.amount || 0,
    currency: getCurrencyForCountry(country),
    order_status: processedLog ? 'completed' : 'active',

    // Client info - minimal from logs
    client_name: metadata.client_name || 'Historical Import',
    client_email: metadata.client_email || `historical-${orderId}@import.com`,
    client_phone: metadata.client_phone || '0000000000',
    whatsapp_alerts_enabled: metadata.whatsapp_alerts_enabled || false,

    // Product info
    product_name: metadata.product_name || `${country} Visa`,
    product_country: country,
    product_doc_type: metadata.product_doc_type || 'unknown',
    product_doc_name: metadata.product_doc_name || 'Historical Import',

    // Visa details
    visa_quantity: metadata.visa_quantity || 1,
    urgency: metadata.urgency || 'standard',
    file_transfer_method: metadata.file_transfer_method || 'unknown',

    // Entry details
    entry_date: metadata.entry_date || null,
    entry_port: metadata.entry_port || null,
    entry_type: metadata.entry_type || null,

    // Document URLs - not available in logs
    face_url: null,
    passport_url: null,

    // JSON data - store all original metadata
    extra_data: {
      imported_from_logs: true,
      import_date: new Date().toISOString(),
      original_metadata: metadata,
      processed_metadata: processedMetadata,
      log_ids: {
        received: receivedLog.id,
        processed: processedLog?.id,
        errors: orderGroup.errorLogs.map((l) => l.id),
      },
    },

    // Other JSON fields as null
    passport_data: null,
    extra_nationality_data: null,
    address_data: null,
    family_data: null,
    occupation_data: null,
    military_data: null,
    past_travels_data: null,
    emergency_contact_data: null,
    business_data: null,
    files_data: null,
    coupon_data: null,
    form_meta_data: null,
    applicants_data: null,

    // Tracking
    webhook_received_at: receivedLog.created_at,
    processed_at: processedLog?.created_at || null,
    workflow_id: processedMetadata.workflow_id || null,
    job_id: processedMetadata.job_id || null,
  };
}

/**
 * Main backfill function
 */
async function backfillOrders() {
  console.log('🚀 Starting orders backfill process...');

  // Calculate date range (past 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  console.log(`📅 Fetching logs from ${thirtyDaysAgo.toISOString()} to now...`);

  // Query logs for Vizi webhook data
  const { data: logs, error } = await supabase
    .from('logs')
    .select('*')
    .or(
      'message.eq.Received Vizi webhook,message.eq.Vizi webhook processed successfully,message.eq.Failed to process Vizi webhook',
    )
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Failed to fetch logs:', error);
    return;
  }

  console.log(`📊 Found ${logs?.length || 0} webhook-related logs`);

  if (!logs || logs.length === 0) {
    console.log('No logs found to process');
    return;
  }

  // Group logs by order_id
  const orderGroups = new Map<string, OrderGroup>();

  for (const log of logs) {
    const orderId = log.metadata?.order_id;
    if (!orderId) continue;

    if (!orderGroups.has(orderId)) {
      orderGroups.set(orderId, {
        orderId,
        errorLogs: [],
      });
    }

    const group = orderGroups.get(orderId);

    if (log.message === 'Received Vizi webhook') {
      group.receivedLog = log;
    } else if (log.message === 'Vizi webhook processed successfully') {
      group.processedLog = log;
    } else if (log.message === 'Failed to process Vizi webhook') {
      group.errorLogs.push(log);
    }
  }

  console.log(`🔍 Found ${orderGroups.size} unique orders to process`);

  // Statistics
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // Process each order group
  for (const [orderId, orderGroup] of orderGroups) {
    try {
      // Check if order already exists
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('order_id', orderId)
        .single();

      if (existing) {
        console.log(`⊘ Order ${orderId} already exists, skipping`);
        skipCount++;
        continue;
      }

      // Reconstruct order data from logs
      const orderData = reconstructOrderFromLogs(orderGroup);

      if (!orderData) {
        console.log(`⚠️ Could not reconstruct order ${orderId}`);
        errorCount++;
        continue;
      }

      // Insert order
      const { error: insertError } = await supabase
        .from('orders')
        .insert(orderData);

      if (insertError) {
        console.error(
          `❌ Failed to insert order ${orderId}:`,
          insertError.message,
        );
        errorCount++;
      } else {
        console.log(`✅ Successfully backfilled order ${orderId}`);
        successCount++;
      }

      // Add a small delay to avoid overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`❌ Error processing order ${orderId}:`, error);
      errorCount++;
    }
  }

  // Print summary
  console.log('\n📈 Backfill Summary:');
  console.log(`✅ Successfully imported: ${successCount} orders`);
  console.log(`⊘ Skipped (already exist): ${skipCount} orders`);
  console.log(`❌ Failed: ${errorCount} orders`);
  console.log(`📊 Total processed: ${orderGroups.size} orders`);

  // Query and display final stats
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📦 Total orders in database: ${count}`);

  // Show distribution by country
  const { data: countryStats } = await supabase
    .from('orders')
    .select('product_country')
    .not('product_country', 'is', null);

  if (countryStats) {
    const countryCounts = countryStats.reduce(
      (acc, row) => {
        acc[row.product_country] = (acc[row.product_country] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log('\n🌍 Orders by country:');
    Object.entries(countryCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([country, count]) => {
        console.log(`  ${country}: ${count} orders`);
      });
  }

  console.log('\n✨ Backfill complete!');
}

// Run the backfill
backfillOrders()
  .then(() => {
    console.log('Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
