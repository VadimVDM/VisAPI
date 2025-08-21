#!/usr/bin/env node

/**
 * Test Exact Webhook Replay
 * Replicates the IL250821IN1 webhook with same data but different order ID
 * to verify webhook processing works correctly
 */

const API_URL = 'https://visapi.up.railway.app/api/v1/webhooks/vizi/orders';
const API_KEY = process.env.VIZI_API_KEY || 'YOUR_VIZI_API_KEY_HERE';

// Exact replica of IL250821IN1 with different order ID
const testWebhook = {
  form: {
    id: 'frm_wy2NmM1IlvVw',  // Same form ID from original
    country: 'india',
    client: {
      name: 'Test Client IL250821IN1',
      email: 'test.il250821in1@visanet.app',
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
      docName: 'Tourist Visa',
      price: {
        USD: 150,
        INR: 12500
      }
    },
    quantity: 1,
    urgency: 'standard',
    termsAgreed: true,
    orderId: null,
    meta: {
      url: 'https://visanet.app/india',
      branch: 'il',  // Will be normalized to lowercase
      domain: 'visanet.app',
      referrer: 'https://visanet.app',
      step: 10,
      completion: 100,
      resumed: false,
      timestamp: Date.now(),
      clientIp: '127.0.0.1',
      revision: 1
    },
    entry: {
      date: '2025-09-15',
      port: 'Delhi Airport',
      crossing: {
        type: 'air',
        flight: 'AI302'
      }
    },
    business: {
      name: 'Test Business',
      sector: 'Tourism',
      phone: {
        code: '+91',
        number: '1234567890'
      },
      address: {
        line: '123 Test Street',
        city: 'Mumbai',
        country: 'IN',
        postalCode: '400001'
      }
    },
    applicants: [
      {
        id: 'app_001',
        passport: {
          nationality: 'IL',
          firstName: 'Test',
          lastName: 'Applicant',
          sex: 'm',
          dateOfBirth: '1990-01-01',
          countryOfBirth: 'IL',
          number: 'A12345678',
          dateOfIssue: '2020-01-01',
          dateOfExpiry: '2030-01-01',
          placeOfIssue: 'IL'
        },
        extraNationality: {
          status: 'none'
        },
        idNumber: '123456789',
        address: {
          line: '456 Test Ave',
          city: 'Tel Aviv',
          country: 'IL',
          postalCode: '61000'
        },
        religion: 'other',
        crime: 'none',
        family: {
          father: {
            name: 'Father Test',
            countryOfBirth: 'IL'
          },
          mother: {
            name: 'Mother Test',
            countryOfBirth: 'IL'
          },
          marital: {
            status: 'single',
            spouse: {
              name: '',
              countryOfBirth: 'IL'
            }
          }
        },
        occupation: {
          education: 'academic',
          status: 'employee',
          name: 'Software Developer',
          seniority: '6-10',
          phone: {
            code: '+972',
            number: '501234567'
          },
          address: {
            line: '789 Work St',
            city: 'Tel Aviv',
            country: 'IL',
            postalCode: '61001'
          }
        },
        military: {
          served: true,
          role: 'support',
          rank: 'sergeant'
        },
        pastTravels: {
          pastVisit: {
            visited: false,
            pastVisa: {
              number: '',
              dateOfIssue: '2020-01-01'
            }
          },
          rejection: 'none',
          SAARC: {
            visited: false,
            countries: [],
            year: 2020
          }
        },
        files: {}
      }
    ],
    fileTransferMethod: 'email'
  },
  order: {
    id: 'TEST_IL250821IN1_REPLAY',  // Changed order ID
    form_id: 'frm_wy2NmM1IlvVw',
    branch: 'il',  // lowercase
    domain: 'visanet.app',
    payment_processor: 'stripe',
    payment_id: 'pay_test_' + Date.now(),
    amount: 150.00,
    currency: 'USD',
    coupon: null,
    status: 'active'
  }
};

async function runTest() {
  console.log('🔬 Testing Exact Webhook Replay');
  console.log('📍 URL:', API_URL);
  console.log('📦 Original Order ID: IL250821IN1');
  console.log('🆕 Test Order ID:', testWebhook.order.id);
  console.log('📝 Form ID:', testWebhook.form.id);
  console.log('');
  
  try {
    console.log('📤 Sending webhook with nested form/order structure...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Correlation-Id': 'test-replay-' + Date.now(),
        'X-Idempotency-Key': 'replay-' + testWebhook.order.id
      },
      body: JSON.stringify(testWebhook)
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    console.log('📡 Response Status:', response.status);
    console.log('📄 Response:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Webhook processed successfully!');
      
      // Check if order was created in database
      console.log('\n🔍 Verifying order creation in database...');
      
      const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pangdzwamawwgmvxnwkk.supabase.co';
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';
      
      // Wait a moment for database to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?order_id=eq.${testWebhook.order.id}&select=*`,
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
        console.log('\n📊 Order details:');
        console.log('  Database ID:', orders[0].id);
        console.log('  Order ID:', orders[0].order_id);
        console.log('  Branch:', orders[0].branch);
        console.log('  Client Name:', orders[0].client_name);
        console.log('  Product Country:', orders[0].product_country);
        console.log('  Status:', orders[0].order_status);
        console.log('  Created At:', orders[0].created_at);
        console.log('  Workflow ID:', orders[0].workflow_id || 'Not yet processed');
        console.log('  Job ID:', orders[0].job_id || 'Not yet queued');
        
        console.log('\n🎉 SUCCESS: Webhook endpoint is working correctly!');
        console.log('💡 The webhook successfully:');
        console.log('   1. Accepted the nested form/order structure');
        console.log('   2. Validated the payload');
        console.log('   3. Created the order in the database');
        console.log('   4. Would trigger workflow processing (if configured)');
      } else {
        console.log('⚠️ Order was not found in database');
        console.log('This might indicate an issue with the order creation logic');
      }
    } else {
      console.log('\n❌ Webhook test failed');
      console.log('Status:', response.status, response.statusText);
      
      if (response.status === 400) {
        console.log('\n💡 Bad Request - likely validation error');
        console.log('Check that all required fields are present');
      } else if (response.status === 401) {
        console.log('\n💡 Unauthorized - API key issue');
      } else if (response.status === 403) {
        console.log('\n💡 Forbidden - insufficient permissions');
      }
    }
  } catch (error) {
    console.error('\n❌ Error testing webhook:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

// Run the test
runTest()
  .then(() => {
    console.log('\n✨ Test complete');
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });