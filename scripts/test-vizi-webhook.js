#!/usr/bin/env node

/**
 * Test Vizi Webhook Endpoint
 * Tests that the webhook creates orders correctly
 */

const API_URL = 'https://visapi.up.railway.app/api/v1/webhooks/vizi/orders';

// Test payload mimicking real Vizi webhook
const testPayload = {
  order_id: 'TEST250821IN3',
  form_id: 'frm_test_webhook',
  branch: 'IL', // Will be normalized to lowercase
  domain: 'test.visanet.app',
  payment_processor: 'stripe',
  payment_id: 'pay_test_' + Date.now(),
  amount: 150.00,
  currency: 'USD',
  order_status: 'active',
  client_name: 'Test Webhook Client',
  client_email: 'webhook.test@example.com',
  client_phone: '9876543210',
  whatsapp_alerts_enabled: true,
  product_name: 'India Tourist Visa',
  product_country: 'india',
  product_doc_type: 'tourist',
  product_doc_name: 'Test Document',
  visa_quantity: 1,
  urgency: 'standard',
  file_transfer_method: 'email'
};

async function testWebhook() {
  console.log('🔧 Testing Vizi webhook endpoint...');
  console.log('📍 URL:', API_URL);
  console.log('📦 Test Order ID:', testPayload.order_id);
  
  try {
    // Note: Using the API key that was last used successfully
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.VIZI_API_KEY || 'YOUR_VIZI_API_KEY_HERE'
      },
      body: JSON.stringify(testPayload)
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    console.log('\n📡 Response Status:', response.status);
    console.log('📄 Response:', responseData);
    
    if (response.ok) {
      console.log('\n✅ Webhook test successful!');
      
      // Check if order was created in database
      console.log('\n🔍 Checking if order was created in database...');
      
      const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pangdzwamawwgmvxnwkk.supabase.co';
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';
      
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?order_id=eq.${testPayload.order_id}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );
      
      const orders = await checkResponse.json();
      
      if (orders && orders.length > 0) {
        console.log('✅ Order successfully created in database!');
        console.log('📊 Order details:', {
          id: orders[0].id,
          order_id: orders[0].order_id,
          branch: orders[0].branch,
          client_name: orders[0].client_name,
          product_country: orders[0].product_country,
          created_at: orders[0].created_at
        });
      } else {
        console.log('⚠️ Order was not found in database');
      }
    } else {
      console.log('\n❌ Webhook test failed');
      console.log('💡 This might be due to:');
      console.log('   - Invalid or missing API key');
      console.log('   - Validation errors in the payload');
      console.log('   - Backend service not running');
    }
  } catch (error) {
    console.error('\n❌ Error testing webhook:', error.message);
  }
}

// Run the test
testWebhook()
  .then(() => {
    console.log('\n✨ Test complete');
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });