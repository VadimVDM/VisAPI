#!/usr/bin/env node

/**
 * Import Missed Orders Script
 * Quick script to import orders from webhooks received on August 20-21, 2025
 */

const SUPABASE_URL = 'https://pangdzwamawwgmvxnwkk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbmdkendhbWF3d2dtdnhud2trIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyMzY1MywiZXhwIjoyMDY4MDk5NjUzfQ.tMdbyEAUGf3NET5Sgy1DF0Ljlsg6gu8Jo9MvX51agtw';

// Orders from logs (August 20-21, 2025)
const missedOrders = [
  // August 20, 2025
  { order_id: 'IL250820IN1', form_id: 'frm_VKQGv0lsElUd', country: 'india', timestamp: '2025-08-20 06:11:17.963+00' },
  { order_id: 'RU250820IL1', form_id: 'frm_PDB6XBgJsHJD', country: 'israel', timestamp: '2025-08-20 07:05:23.64+00' },
  { order_id: 'RU250820IL2', form_id: 'frm_LqZZCDa0AHaU', country: 'israel', timestamp: '2025-08-20 07:31:57.237+00' },
  { order_id: 'IL250820IN2', form_id: 'frm_ZTpNb94jVgoH', country: 'india', timestamp: '2025-08-20 09:29:04.551+00' },
  { order_id: 'IL250820IN3', form_id: 'frm_L1sLhn0dLqZ5', country: 'india', timestamp: '2025-08-20 09:46:15.707+00' },
  { order_id: 'RU250820IL3', form_id: 'frm_Yd1_vpp3CQij', country: 'israel', timestamp: '2025-08-20 09:47:40.215+00' },
  { order_id: 'RU250820IL4', form_id: 'frm_3KBh8VhiuOCD', country: 'israel', timestamp: '2025-08-20 10:19:16.705+00' },
  { order_id: 'RU250820IL5', form_id: 'frm_lP3fpA2Nrevr', country: 'israel', timestamp: '2025-08-20 11:10:41.136+00' },
  { order_id: 'IL250820IN4', form_id: 'frm_kdnhzGtpgaa2', country: 'india', timestamp: '2025-08-20 11:21:57.535+00' },
  { order_id: 'IL250820IN5', form_id: 'frm_wByGy0F2vDfL', country: 'india', timestamp: '2025-08-20 11:48:03.442+00' },
  { order_id: 'IL250820IN6', form_id: 'frm_JLjuFKhgAtm4', country: 'india', timestamp: '2025-08-20 12:45:00.523+00' },
  { order_id: 'IL250820IN7', form_id: 'frm_x09Tqq8hF-JX', country: 'india', timestamp: '2025-08-20 12:50:49.216+00' },
  { order_id: 'IL250820IN8', form_id: 'frm_-FVkNtPMnrhh', country: 'india', timestamp: '2025-08-20 12:52:01.626+00' },
  { order_id: 'IL250820IN9', form_id: 'frm_WcVeGWQ7NOEv', country: 'india', timestamp: '2025-08-20 12:58:53.724+00' },
  { order_id: 'IL250820IN10', form_id: 'frm_SXPmIIiLqaLL', country: 'india', timestamp: '2025-08-20 13:02:18.01+00' },
  { order_id: 'IL250820VN11', form_id: 'frm_tIDhiMee60bA', country: 'vietnam', timestamp: '2025-08-20 14:38:38.223+00' },
  { order_id: 'IL250820US12', form_id: 'frm_pWlQ7iwDU7xH', country: 'usa', timestamp: '2025-08-20 14:49:34.221+00' },
  { order_id: 'RU250820IN6', form_id: 'frm_dAm34fSkz5YY', country: 'india', timestamp: '2025-08-20 14:58:41.243+00' },
  { order_id: 'IL250820US13', form_id: 'frm_AjAvvh9i2fwV', country: 'usa', timestamp: '2025-08-20 15:05:24.363+00' },
  { order_id: 'IL250820US14', form_id: 'frm_I-VVALWFdSem', country: 'usa', timestamp: '2025-08-20 15:11:58.109+00' },
  { order_id: 'IL250820VN15', form_id: 'frm_83XQ0tq1fBE0', country: 'vietnam', timestamp: '2025-08-20 15:27:32.104+00' },
  { order_id: 'IL250820MA16', form_id: 'frm__RCuIIWJchbW', country: 'morocco', timestamp: '2025-08-20 15:41:20.039+00' },
  { order_id: 'IL250820IN17', form_id: 'frm_qkoIiN6POU7n', country: 'india', timestamp: '2025-08-20 16:31:59.713+00' },
  { order_id: 'IL250820MA18', form_id: 'frm_ruKdY4ahDoVB', country: 'morocco', timestamp: '2025-08-20 17:40:23.462+00' },
  { order_id: 'IL250820GB19', form_id: 'frm_sBaQUn3kXfrA', country: 'uk', timestamp: '2025-08-20 18:38:07.607+00' },
  { order_id: 'RU250820IL7', form_id: 'frm_pq-QOwL29pUp', country: 'israel', timestamp: '2025-08-20 19:37:56.915+00' },
  { order_id: 'IL250820GB20', form_id: 'frm_4485vT2a-kOF', country: 'uk', timestamp: '2025-08-20 22:20:08.903+00' },
  { order_id: 'IL250820VN21', form_id: 'frm_Vi9tv5w9kcn2', country: 'vietnam', timestamp: '2025-08-20 22:54:38.763+00' },
  // August 21, 2025
  { order_id: 'IL250821IN1', form_id: 'frm_wy2NmM1IlvVw', country: 'india', timestamp: '2025-08-21 06:28:28.814+00' }
];

function extractBranchFromOrderId(orderId) {
  if (!orderId || orderId.length < 2) {
    return 'unknown';
  }
  return orderId.substring(0, 2).toLowerCase();
}

function getCurrencyForCountry(country) {
  const currencyMap = {
    'uk': 'GBP',
    'gb': 'GBP',
    'usa': 'USD',
    'us': 'USD',
    'india': 'INR',
    'in': 'INR',
    'israel': 'ILS',
    'il': 'ILS',
    'vietnam': 'VND',
    'vn': 'VND',
    'morocco': 'MAD',
    'ma': 'MAD',
  };
  return currencyMap[country?.toLowerCase()] || 'USD';
}

async function importOrders() {
  console.log('🚀 Starting import of missed orders from August 20-21, 2025...');
  console.log(`📊 Found ${missedOrders.length} orders to import`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const order of missedOrders) {
    try {
      // Check if order already exists
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?order_id=eq.${order.order_id}&select=id`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          }
        }
      );
      
      const existing = await checkResponse.json();
      if (existing && existing.length > 0) {
        console.log(`⊘ Order ${order.order_id} already exists, skipping`);
        skipCount++;
        continue;
      }
      
      // Prepare order data
      const orderData = {
        order_id: order.order_id,
        form_id: order.form_id,
        branch: extractBranchFromOrderId(order.order_id),
        domain: 'visanet.app',
        payment_processor: 'stripe',
        payment_id: `pay_${order.order_id}`,
        amount: 0,
        currency: getCurrencyForCountry(order.country),
        order_status: 'active',
        client_name: `Historical_${order.order_id}`,
        client_email: `${order.order_id.toLowerCase()}@historical.visanet.app`,
        client_phone: '1000000' + order.order_id.replace(/\D/g, '').slice(-4).padStart(4, '0'),
        whatsapp_alerts_enabled: false,
        product_name: `${order.country} Visa`,
        product_country: order.country,
        product_doc_type: 'tourist',
        product_doc_name: 'Historical Import',
        visa_quantity: 1,
        urgency: 'standard',
        file_transfer_method: 'email',
        webhook_received_at: order.timestamp,
        extra_data: {
          imported_from_logs: true,
          import_date: new Date().toISOString(),
          import_script: 'import-missed-orders.js'
        }
      };
      
      // Insert order
      const insertResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/orders`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(orderData)
        }
      );
      
      if (insertResponse.ok) {
        console.log(`✅ Successfully imported order ${order.order_id} (${order.country})`);
        successCount++;
      } else {
        const error = await insertResponse.text();
        console.error(`❌ Failed to insert order ${order.order_id}: ${error}`);
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing order ${order.order_id}:`, error.message);
      errorCount++;
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 IMPORT COMPLETE - SUMMARY:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully imported: ${successCount} orders`);
  console.log(`⊘ Skipped (already exist): ${skipCount} orders`);
  console.log(`❌ Failed: ${errorCount} orders`);
  console.log(`📊 Total processed: ${missedOrders.length} orders`);
  
  console.log('\n✨ Import process complete!');
}

// Run the import
importOrders()
  .then(() => {
    console.log('\n✅ Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });