#!/usr/bin/env node

/**
 * Test Missing Webhooks
 * Simulates the missing webhooks for today (August 21, 2025)
 * Expected: 2 RU branch + 4 IL branch (we only have 1 IL so far)
 */

const API_URL = 'https://visapi.up.railway.app/api/v1/webhooks/vizi/orders';
const API_KEY = process.env.VIZI_API_KEY || 'YOUR_VIZI_API_KEY_HERE';

// Missing webhooks for today
const missingWebhooks = [
  // RU branch orders
  {
    order_id: 'RU250821IL1',
    form_id: 'frm_test_ru1',
    branch: 'RU', // Will be normalized to lowercase
    domain: 'visanet.app',
    payment_processor: 'stripe',
    payment_id: 'pay_ru1_' + Date.now(),
    amount: 150.00,
    currency: 'ILS',
    order_status: 'active',
    client_name: 'Test RU Client 1',
    client_email: 'ru1@test.visanet.app',
    client_phone: '9721234567',
    whatsapp_alerts_enabled: true,
    product_name: 'Israel Visa',
    product_country: 'israel',
    product_doc_type: 'tourist',
    visa_quantity: 1,
    urgency: 'standard'
  },
  {
    order_id: 'RU250821IL2',
    form_id: 'frm_test_ru2',
    branch: 'RU',
    domain: 'visanet.app',
    payment_processor: 'stripe',
    payment_id: 'pay_ru2_' + Date.now(),
    amount: 150.00,
    currency: 'ILS',
    order_status: 'active',
    client_name: 'Test RU Client 2',
    client_email: 'ru2@test.visanet.app',
    client_phone: '9721234568',
    whatsapp_alerts_enabled: true,
    product_name: 'Israel Visa',
    product_country: 'israel',
    product_doc_type: 'tourist',
    visa_quantity: 1,
    urgency: 'standard'
  },
  // IL branch orders (3 more needed, we already have IL250821IN1)
  {
    order_id: 'IL250821IN2',
    form_id: 'frm_test_il2',
    branch: 'IL',
    domain: 'visanet.app',
    payment_processor: 'stripe',
    payment_id: 'pay_il2_' + Date.now(),
    amount: 200.00,
    currency: 'INR',
    order_status: 'active',
    client_name: 'Test IL Client 2',
    client_email: 'il2@test.visanet.app',
    client_phone: '9111234567',
    whatsapp_alerts_enabled: true,
    product_name: 'India Visa',
    product_country: 'india',
    product_doc_type: 'tourist',
    visa_quantity: 1,
    urgency: 'standard'
  },
  {
    order_id: 'IL250821IN3',
    form_id: 'frm_test_il3',
    branch: 'IL',
    domain: 'visanet.app',
    payment_processor: 'stripe',
    payment_id: 'pay_il3_' + Date.now(),
    amount: 200.00,
    currency: 'INR',
    order_status: 'active',
    client_name: 'Test IL Client 3',
    client_email: 'il3@test.visanet.app',
    client_phone: '9111234568',
    whatsapp_alerts_enabled: false,
    product_name: 'India Visa',
    product_country: 'india',
    product_doc_type: 'business',
    visa_quantity: 2,
    urgency: 'urgent'
  },
  {
    order_id: 'IL250821US1',
    form_id: 'frm_test_il4',
    branch: 'IL',
    domain: 'visanet.app',
    payment_processor: 'stripe',
    payment_id: 'pay_il4_' + Date.now(),
    amount: 300.00,
    currency: 'USD',
    order_status: 'active',
    client_name: 'Test IL Client 4',
    client_email: 'il4@test.visanet.app',
    client_phone: '12025551234',
    whatsapp_alerts_enabled: true,
    product_name: 'USA Visa',
    product_country: 'usa',
    product_doc_type: 'tourist',
    visa_quantity: 1,
    urgency: 'standard'
  }
];

async function testWebhook(webhook, index) {
  console.log(`\n📤 [${index + 1}/${missingWebhooks.length}] Sending webhook for order: ${webhook.order_id}`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(webhook)
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    if (response.ok) {
      console.log(`✅ Success: ${webhook.order_id} - Status ${response.status}`);
      return { success: true, order_id: webhook.order_id };
    } else {
      console.log(`❌ Failed: ${webhook.order_id} - Status ${response.status}`);
      console.log(`   Response: ${JSON.stringify(responseData)}`);
      return { success: false, order_id: webhook.order_id, error: responseData };
    }
  } catch (error) {
    console.error(`❌ Error: ${webhook.order_id} - ${error.message}`);
    return { success: false, order_id: webhook.order_id, error: error.message };
  }
}

async function verifyOrdersCreated(orderIds) {
  console.log('\n🔍 Verifying orders in database...');
  
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pangdzwamawwgmvxnwkk.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';
  
  for (const orderId of orderIds) {
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?order_id=eq.${orderId}&select=id,order_id,branch,product_country,created_at`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    const orders = await checkResponse.json();
    
    if (orders && orders.length > 0) {
      console.log(`✅ ${orderId} - Found in database (branch: ${orders[0].branch}, country: ${orders[0].product_country})`);
    } else {
      console.log(`⚠️  ${orderId} - NOT found in database`);
    }
  }
}

async function main() {
  console.log('🚀 Testing Missing Webhooks for August 21, 2025');
  console.log('📍 Endpoint:', API_URL);
  console.log(`📊 Sending ${missingWebhooks.length} webhooks (2 RU + 3 IL)`);
  console.log('=' .repeat(60));
  
  const results = [];
  
  // Send webhooks with small delay between each
  for (let i = 0; i < missingWebhooks.length; i++) {
    const result = await testWebhook(missingWebhooks[i], i);
    results.push(result);
    
    // Small delay to avoid overwhelming the server
    if (i < missingWebhooks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📈 SUMMARY:');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  if (successful.length > 0) {
    console.log('   Orders:', successful.map(r => r.order_id).join(', '));
  }
  
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  if (failed.length > 0) {
    console.log('   Orders:', failed.map(r => r.order_id).join(', '));
  }
  
  // Verify in database
  if (successful.length > 0) {
    await verifyOrdersCreated(successful.map(r => r.order_id));
  }
  
  console.log('\n✨ Test complete!');
}

// Run the test
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });