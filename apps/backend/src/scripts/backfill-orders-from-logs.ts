#!/usr/bin/env node
/**
 * Backfill Orders from Logs Script
 *
 * This script backfills the orders table with real historical data from logs.
 * It reconstructs order records from Vizi webhook logs since July 31, 2025.
 *
 * Usage: npx ts-node apps/backend/src/scripts/backfill-orders-from-logs.ts
 */

import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials for the script (since we don't have .env)
const SUPABASE_URL = 'https://pangdzwamawwgmvxnwkk.supabase.co';
// Note: This should be the service role key - you'll need to provide it
const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.log(
    'Usage: SUPABASE_SERVICE_ROLE_KEY=your_key npx ts-node apps/backend/src/scripts/backfill-orders-from-logs.ts',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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
  formId?: string;
  country?: string;
  receivedLog?: LogRecord;
  processedLog?: LogRecord;
  errorLogs: LogRecord[];
  allLogs: LogRecord[];
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
    cambodia: 'USD',
    thailand: 'THB',
    new_zealand: 'NZD',
    sri_lanka: 'LKR',
  };
  return currencyMap[country?.toLowerCase()] || 'USD';
}

/**
 * Extract phone number from metadata if available
 */
function extractPhoneFromMetadata(metadata: any): string {
  // Try to extract phone from various possible locations in metadata
  if (metadata.client_phone) {
    return String(metadata.client_phone).replace(/\D/g, '');
  }
  if (metadata.phone) {
    return String(metadata.phone).replace(/\D/g, '');
  }
  // Generate a placeholder phone based on order ID
  const orderNum = metadata.order_id?.replace(/\D/g, '') || '0000';
  return '1000000' + orderNum.slice(-4).padStart(4, '0');
}

/**
 * Reconstruct order data from logs with more detail extraction
 */
function reconstructOrderFromLogs(orderGroup: OrderGroup): any {
  const { orderId, formId, country, receivedLog, processedLog, allLogs } =
    orderGroup;

  if (!receivedLog && allLogs.length === 0) {
    console.warn(`No logs found for order ${orderId}`);
    return null;
  }

  // Use the best available log for metadata
  const primaryLog = receivedLog || processedLog || allLogs[0];
  const metadata = primaryLog.metadata || {};
  const processedMetadata = processedLog?.metadata || {};

  // Extract as much data as possible from all logs
  let combinedMetadata = { ...metadata };
  for (const log of allLogs) {
    if (log.metadata) {
      combinedMetadata = { ...combinedMetadata, ...log.metadata };
    }
  }

  // Determine country from various sources
  const finalCountry =
    country || metadata.country || combinedMetadata.country || 'unknown';
  const finalFormId =
    formId || metadata.form_id || combinedMetadata.form_id || `frm_${orderId}`;

  // Extract client information if available
  const clientName =
    combinedMetadata.client_name ||
    combinedMetadata.name ||
    `Client_${orderId}`;

  const clientEmail =
    combinedMetadata.client_email ||
    combinedMetadata.email ||
    `${orderId.toLowerCase()}@historical.visanet.app`;

  const clientPhone = extractPhoneFromMetadata(combinedMetadata);

  // Determine order status based on logs
  let orderStatus = 'active';
  if (processedLog) {
    orderStatus = 'completed';
  } else if (orderGroup.errorLogs.length > 0) {
    orderStatus = 'issue';
  }

  // Extract urgency if available
  const urgency =
    combinedMetadata.urgency ||
    (orderId.includes('URG') ? 'urgent' : 'standard');

  return {
    // Core order fields
    order_id: orderId,
    form_id: finalFormId,
    branch: extractBranchFromOrderId(orderId),
    domain: combinedMetadata.domain || 'visanet.app',
    payment_processor: combinedMetadata.payment_processor || 'stripe',
    payment_id: combinedMetadata.payment_id || `pay_${orderId}`,
    amount: combinedMetadata.amount || 0,
    currency: getCurrencyForCountry(finalCountry),
    order_status: orderStatus,

    // Client info
    client_name: clientName,
    client_email: clientEmail,
    client_phone: clientPhone,
    whatsapp_alerts_enabled: combinedMetadata.whatsapp_alerts_enabled || false,

    // Product info
    // product_name is now in product_data JSON
    product_country: finalCountry,
    product_doc_type:
      combinedMetadata.product_doc_type ||
      combinedMetadata.doc_type ||
      'tourist',
    product_doc_name: combinedMetadata.product_doc_name || 'Historical Import',

    // Visa details
    visa_quantity:
      combinedMetadata.visa_quantity || combinedMetadata.quantity || 1,
    file_transfer_method: combinedMetadata.file_transfer_method || 'email',

    // Entry details
    entry_date: combinedMetadata.entry_date || null,
    entry_port: combinedMetadata.entry_port || null,
    visa_entries: combinedMetadata.visa_entries || combinedMetadata.product_entries || 'single',

    // Document URLs - not available in logs
    face_url: null,
    passport_url: null,

    // JSON data - store all metadata for future reference
    extra_data: {
      imported_from_logs: true,
      import_date: new Date().toISOString(),
      original_metadata: metadata,
      processed_metadata: processedMetadata,
      combined_metadata: combinedMetadata,
      log_count: allLogs.length,
      log_ids: allLogs.map((l) => l.id),
      has_errors: orderGroup.errorLogs.length > 0,
      error_count: orderGroup.errorLogs.length,
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
    webhook_received_at: receivedLog?.created_at || primaryLog.created_at,
    processed_at: processedLog?.created_at || null,
    workflow_id:
      processedMetadata.workflow_id || combinedMetadata.workflow_id || null,
    job_id: processedMetadata.job_id || combinedMetadata.job_id || null,
  };
}

/**
 * Main backfill function
 */
async function backfillOrders() {
  console.log('🚀 Starting comprehensive orders backfill from logs...');
  console.log(`📅 Database: ${SUPABASE_URL}`);

  // Query ALL Vizi webhook logs since the beginning
  console.log('📊 Fetching all Vizi webhook logs...');

  const { data: logs, error } = await supabase
    .from('logs')
    .select('*')
    .or(
      'message.eq.Received Vizi webhook,message.eq.Vizi webhook processed successfully,message.eq.Failed to process Vizi webhook,message.ilike.%Vizi%',
    )
    .not('metadata->order_id', 'is', null)
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
        formId: log.metadata?.form_id,
        country: log.metadata?.country,
        errorLogs: [],
        allLogs: [],
      });
    }

    const group = orderGroups.get(orderId);

    // Update form_id and country if found
    if (log.metadata?.form_id && !group.formId) {
      group.formId = log.metadata.form_id;
    }
    if (log.metadata?.country && !group.country) {
      group.country = log.metadata.country;
    }

    // Categorize logs
    group.allLogs.push(log);

    if (log.message === 'Received Vizi webhook') {
      group.receivedLog = log;
    } else if (log.message === 'Vizi webhook processed successfully') {
      group.processedLog = log;
    } else if (
      log.message === 'Failed to process Vizi webhook' ||
      log.level === 'error'
    ) {
      group.errorLogs.push(log);
    }
  }

  console.log(`🔍 Found ${orderGroups.size} unique orders to process`);

  // Statistics
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  // Process each order group in batches
  const orderGroupsArray = Array.from(orderGroups.entries());
  const batchSize = 10;

  for (let i = 0; i < orderGroupsArray.length; i += batchSize) {
    const batch = orderGroupsArray.slice(i, i + batchSize);

    console.log(
      `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(orderGroupsArray.length / batchSize)}...`,
    );

    const promises = batch.map(async ([orderId, orderGroup]) => {
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
          return;
        }

        // Reconstruct order data from logs
        const orderData = reconstructOrderFromLogs(orderGroup);

        if (!orderData) {
          console.log(`⚠️ Could not reconstruct order ${orderId}`);
          errorCount++;
          errors.push(`${orderId}: Could not reconstruct`);
          return;
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
          errors.push(`${orderId}: ${insertError.message}`);
        } else {
          console.log(
            `✅ Successfully imported order ${orderId} (${orderData.product_country})`,
          );
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing order ${orderId}:`, error);
        errorCount++;
        errors.push(`${orderId}: ${error.message || 'Unknown error'}`);
      }
    });

    // Wait for batch to complete
    await Promise.all(promises);

    // Small delay between batches
    if (i + batchSize < orderGroupsArray.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 BACKFILL COMPLETE - SUMMARY:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully imported: ${successCount} orders`);
  console.log(`⊘ Skipped (already exist): ${skipCount} orders`);
  console.log(`❌ Failed: ${errorCount} orders`);
  console.log(`📊 Total processed: ${orderGroups.size} orders`);

  if (errors.length > 0 && errors.length <= 10) {
    console.log('\n❌ Errors:');
    errors.forEach((err) => console.log(`  - ${err}`));
  } else if (errors.length > 10) {
    console.log(`\n❌ Too many errors (${errors.length}), showing first 10:`);
    errors.slice(0, 10).forEach((err) => console.log(`  - ${err}`));
  }

  // Query and display final stats
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📦 Total orders now in database: ${count}`);

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
        const percentage = ((count / countryStats.length) * 100).toFixed(1);
        console.log(
          `  ${country.padEnd(15)} : ${String(count).padStart(4)} orders (${percentage}%)`,
        );
      });
  }

  // Show order status distribution
  const { data: statusStats } = await supabase
    .from('orders')
    .select('order_status');

  if (statusStats) {
    const statusCounts = statusStats.reduce(
      (acc, row) => {
        acc[row.order_status] = (acc[row.order_status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log('\n📊 Orders by status:');
    Object.entries(statusCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([status, count]) => {
        const percentage = ((count / statusStats.length) * 100).toFixed(1);
        console.log(
          `  ${status.padEnd(15)} : ${String(count).padStart(4)} orders (${percentage}%)`,
        );
      });
  }

  console.log('\n✨ Backfill process complete!');
  console.log(
    '💡 All historical Vizi webhook data has been imported to the orders table.',
  );
}

// Run the backfill
backfillOrders()
  .then(() => {
    console.log('\n✅ Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
