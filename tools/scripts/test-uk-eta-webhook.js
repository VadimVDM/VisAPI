#!/usr/bin/env node

/**
 * Test script for n8n webhook endpoint with UK ETA order
 * Usage: node tools/scripts/test-uk-eta-webhook.js <api-key>
 */

const axios = require('axios');

// Get API key from command line argument
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Usage: node tools/scripts/test-uk-eta-webhook.js <api-key>');
  console.error('Example: node tools/scripts/test-uk-eta-webhook.js n8n_xxx.yyy');
  process.exit(1);
}

// Test data - UK ETA order
const testData = {
  "form": {
    "_id": "688b30c8fab002d7ab09ec22",
    "id": "frm_0UsXuuTFxEHU",
    "applicants": [
      {
        "id": "apl_nFP6aagKhps2",
        "passport": {
          "firstName": "meshulam",
          "lastName": "meiri"
        },
        "address": {
          "line": "שד האקליפטוס 28",
          "city": "בוסתן הגליל",
          "country": "ISR"
        },
        "occupation": {
          "education": "highschool",
          "status": "retired",
          "name": "",
          "seniority": "2-5",
          "phone": {
            "code": "972",
            "number": ""
          },
          "address": {
            "line": "",
            "city": "",
            "country": "ISR"
          }
        },
        "extraNationality": {
          "status": "none"
        },
        "crime": "",
        "files": {
          "face": "",
          "passport": "",
          "card": "",
          "invitation": "",
          "return_ticket": "",
          "booking": "",
          "bank": "",
          "address_proof": "",
          "occupation": "",
          "travel_ticket": ""
        }
      },
      {
        "id": "apl__zXU8tp53jNB",
        "passport": {
          "firstName": "gila",
          "lastName": "lapidot"
        },
        "address": {
          "line": "שד האקליפטוס 28",
          "city": "בוסתן הגליל",
          "country": "ISR",
          "setBy": 1791
        },
        "occupation": {
          "education": "highschool",
          "status": "retired",
          "name": "",
          "seniority": "2-5",
          "phone": {
            "code": "972",
            "number": ""
          },
          "address": {
            "line": "",
            "city": "",
            "country": "ISR"
          }
        },
        "extraNationality": {
          "status": "none"
        },
        "crime": "",
        "files": {
          "face": "",
          "passport": "",
          "card": "",
          "invitation": "",
          "return_ticket": "",
          "booking": "",
          "bank": "",
          "address_proof": "",
          "occupation": "",
          "travel_ticket": ""
        }
      }
    ],
    "client": {
      "name": "משולם מאירי",
      "email": "msulam@walla.com",
      "phone": {
        "code": "972",
        "number": "525836601"
      },
      "whatsappAlertsEnabled": true
    },
    "country": "uk",
    "created_at": "2025-07-31T09:00:56.280Z",
    "fileTransferMethod": "whatsapp",
    "meta": {
      "url": "https://visanet.co.il/uk",
      "branch": "il",
      "domain": "visanet.co.il",
      "referrer": "https://visanet.co.il/",
      "step": 4,
      "completion": 1,
      "resumed": false,
      "timestamp": 1753952385688,
      "clientIp": "87.70.66.189",
      "revision": 6
    },
    "orderId": null,
    "product": {
      "name": "uk_2_years",
      "country": "uk",
      "docType": "eta",
      "docName": "UK-ETA",
      "intent": "tourism",
      "entries": "multiple",
      "validity": "2_years",
      "valid_since": "entry",
      "wait": 3,
      "price": {
        "ils": 179,
        "usd": 49,
        "rub": 4990,
        "sek": 449,
        "kzt": 29990
      },
      "instructions": [
        "dont_print"
      ],
      "urgencies": [
        {
          "speed": "few_hours",
          "fee": {
            "ils": 99,
            "usd": 25,
            "rub": 1990,
            "sek": 290,
            "kzt": 11990
          }
        }
      ],
      "stay_limit": 180,
      "days_to_use": 180,
      "photo_types": [
        "face",
        "passport"
      ]
    },
    "quantity": 2,
    "termsAgreed": true,
    "updated_at": "2025-07-31T09:33:10.288Z",
    "urgency": "none"
  },
  "order": {
    "id": "IL250731GB3",
    "form_id": "frm_0UsXuuTFxEHU",
    "payment_id": "pi_3RqsrKC1lB0qvw9G0ZOL04oI",
    "payment_processor": "stripe",
    "amount": 358,
    "currency": "ILS",
    "coupon": null,
    "status": "active",
    "branch": "il",
    "domain": "visanet.co.il"
  }
};

async function testWebhook() {
  const url = 'http://localhost:3000/api/v1/webhooks/n8n/orders';
  
  console.log('Testing n8n webhook with UK ETA order...');
  console.log(`URL: ${url}`);
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`Country: ${testData.form.country} (${testData.form.product.docName})`);
  console.log(`Applicants: ${testData.form.applicants.length}`);
  console.log(`Unique features:`);
  console.log(`  - Minimal passport data (only firstName/lastName)`);
  console.log(`  - Address with setBy field`);
  console.log(`  - Product with days_to_use: ${testData.form.product.days_to_use}`);
  console.log(`  - Payment via Stripe`);
  console.log(`  - Empty file URLs`);
  console.log('');

  try {
    const response = await axios.post(url, testData, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-Source': 'n8n.visanet.app',
      },
    });

    console.log('✅ Success!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.response?.status || error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testWebhook();