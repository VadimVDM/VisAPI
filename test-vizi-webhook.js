const fetch = require('node-fetch');

// Test webhook payload matching the actual Vizi webhook structure
const testPayload = {
  order: {
    id: 'IL250821TEST01',
    form_id: 'frm_test_123',
    branch: 'IL',
    domain: 'visanet.app',
    payment_processor: 'stripe',
    payment_id: 'test_payment_123',
    amount: 100,
    currency: 'USD',
    status: 'active',
    coupon: null
  },
  form: {
    id: 'frm_test_123',
    country: 'india',
    client: {
      name: 'Test User',
      email: 'test@example.com',
      phone: {
        code: '+91',
        number: '9876543210'
      },
      whatsappAlertsEnabled: true
    },
    product: {
      name: 'India Tourist Visa',
      country: 'india',
      docType: 'tourist',
      docName: 'India Tourist Visa'
    },
    quantity: 1,
    urgency: 'standard',
    termsAgreed: true,
    orderId: 'IL250821TEST01',
    applicants: [
      {
        passport: {
          number: 'TEST123456',
          country: 'IL',
          expiry: '2030-01-01'
        },
        files: {
          face: 'https://example.com/test-face.jpg',
          passport: 'https://example.com/test-passport.jpg'
        }
      }
    ]
  }
};

async function testWebhook() {
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  const apiKey = process.env.VIZI_API_KEY;

  if (!apiKey) {
    console.error('Please set VIZI_API_KEY environment variable');
    console.log('You can find or create one using: node scripts/create-vizi-api-key.js');
    process.exit(1);
  }

  console.log('Testing Vizi webhook endpoint...');
  console.log(`URL: ${apiUrl}/api/v1/webhooks/vizi/orders`);
  console.log(`Order ID: ${testPayload.order.id}`);

  try {
    const response = await fetch(`${apiUrl}/api/v1/webhooks/vizi/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-Correlation-Id': `test-${Date.now()}`,
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    
    console.log(`\nResponse Status: ${response.status} ${response.statusText}`);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (responseText) {
      try {
        const responseData = JSON.parse(responseText);
        console.log('\nResponse Body:', JSON.stringify(responseData, null, 2));
      } catch {
        console.log('\nResponse Body (text):', responseText);
      }
    }

    if (response.ok) {
      console.log('\n✅ Webhook test successful!');
      console.log('Check the database for order:', testPayload.order.id);
    } else {
      console.log('\n❌ Webhook test failed!');
      console.log('Check backend logs for error details');
    }

  } catch (error) {
    console.error('\n❌ Error testing webhook:', error.message);
    console.error('Stack:', error.stack);
  }
}

testWebhook();