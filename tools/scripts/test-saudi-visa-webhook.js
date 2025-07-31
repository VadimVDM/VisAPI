#!/usr/bin/env node

/**
 * Test script for n8n webhook endpoint with Saudi Arabia visa order
 * Usage: node tools/scripts/test-saudi-visa-webhook.js <api-key>
 */

const axios = require('axios');

// Get API key from command line argument
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Usage: node tools/scripts/test-saudi-visa-webhook.js <api-key>');
  console.error('Example: node tools/scripts/test-saudi-visa-webhook.js n8n_xxx.yyy');
  process.exit(1);
}

// Test data - Saudi Arabia eVisa order
const testData = {
  "form": {
    "_id": "68874236fab002d7ab099858",
    "id": "frm_UgvbsosnDR39",
    "applicants": [
      {
        "id": "apl_0iAn_QUMbGjj",
        "passport": {
          "nationality": "RUS",
          "firstName": "Dzhamaldin ",
          "lastName": "Kulchimaev ",
          "sex": "m",
          "dateOfBirth": "1995-11-05",
          "countryOfBirth": "RUS",
          "number": "772332384",
          "dateOfIssue": "2024-01-29",
          "dateOfExpiry": "2034-01-29",
          "placeOfIssue": "RUS"
        },
        "address": {
          "line": "Чеченская республика, Шелковской район ",
          "city": "Сары-Су",
          "country": "RUS"
        },
        "maritalStatus": "married",
        "religion": "islam",
        "files": {
          "face": "https://storage.googleapis.com/veezee-86fc0.appspot.com/photos/frm_UgvbsosnDR39/apl_0iAn_QUMbGjj-face?GoogleAccessId=veezee-email-bot%40veezee-86fc0.iam.gserviceaccount.com&Expires=1785444062&Signature=fggEtJDm8lxq%2BbjAkcVZSVA%2Biort2rSCbjLhsI7N%2FY3Qz3A1AbXy6Y0oXf%2FuNpwyrnwy%2Bc9Aqjkm0kDcj38ahG4yyA2k%2FDycoHocg96y9IhQahJeeb4oPh6WSjRBafVCAb7LIxDDGK7a%2F5rHm%2BvjZuLz2rRCrlMppZVBhlekqZDRVNn6ejzs8hxh0aG%2BjgsEuOaiad2Pdb6%2BLyFHUaJTjnrWs%2BHqGKayqkZzf3b1tfR1APe1PRYyNKyf8FWcr78K3Y0a0U71YcznrBBneaPWik1MMNdI6ApoE4natzoPPJVS1CJGcD1Mo0FA15MGziUZpgjsXs6nslOCplLVHhuuXA%3D%3D",
          "passport": "https://storage.googleapis.com/veezee-86fc0.appspot.com/photos/frm_UgvbsosnDR39/apl_0iAn_QUMbGjj-passport?GoogleAccessId=veezee-email-bot%40veezee-86fc0.iam.gserviceaccount.com&Expires=1785444062&Signature=N43CkfGkLZAhG0KGUC5MnQhyHiC7pC%2B4u1wG7k0u%2BT70et3WB%2BQ3oG%2BHrprNP29QbUIwzPwfVNKFSmw0wxlerYWp%2FEW3WR5sJJhlCOl82pEHAX%2FKIGstlMa0sa7OlUlhtkrkJbbVggNNYN3idSpgRdXCkjfnq1OxVy5sQlz60Cz%2Bo0F6Rg%2FaAZNNZo%2FIk7DERDamdAuYOqt%2B78zT3eCvCGjDWhhghl0HIalP38QoHtYqssxqt1pqgjRSu5hfQqK1ymvTMmtJfPibC0DZSE3AG4QnVpo8GI%2FXfJ9ikg%2BiEzCPc1sPQvVWDLoxdGHnOOTlTJHyeHYG%2FrmOldZyB6iW%2Fw%3D%3D",
          "card": "",
          "invitation": "",
          "return_ticket": "",
          "booking": "",
          "bank": "",
          "address_proof": "",
          "occupation": "",
          "travel_ticket": ""
        },
        "occupation": "employee",
        "guardianPassport": ""
      }
    ],
    "client": {
      "name": "Джамалдин Кульчимаев",
      "email": "kulchimaevdm@mail.ru",
      "phone": {
        "code": "7",
        "number": "9237848401"
      },
      "whatsappAlertsEnabled": false
    },
    "country": "saudi_arabia",
    "created_at": "2025-07-28T09:26:14.155Z",
    "entry": {
      "date": "2025-08-20",
      "port": null
    },
    "fileTransferMethod": "form",
    "meta": {
      "url": "https://visanet.ru/saudi-arabia",
      "branch": "ru",
      "domain": "visanet.ru",
      "referrer": "",
      "step": 5,
      "completion": 1,
      "resumed": false,
      "timestamp": 1753694720135,
      "clientIp": "178.176.219.188",
      "revision": 6
    },
    "orderId": null,
    "product": {
      "name": "saudi_arabia_6_months",
      "country": "saudi_arabia",
      "docType": "evisa",
      "docName": "eVisa",
      "intent": "tourism",
      "entries": "multiple",
      "validity": "6_months",
      "valid_since": "approval",
      "wait": 3,
      "price": {
        "ils": 549,
        "usd": 149,
        "rub": 12990,
        "sek": 1490,
        "kzt": 89990
      },
      "instructions": [
        "print",
        "return_ticket_and_accommodation"
      ],
      "urgencies": [
        {
          "speed": "next_day",
          "fee": {
            "ils": 99,
            "usd": 25,
            "rub": 1990,
            "sek": 290,
            "kzt": 11990
          }
        }
      ],
      "stay_limit": 90,
      "photo_types": [
        "face",
        "passport"
      ],
      "variations": [
        {
          "type": "validity",
          "validity": "6_months",
          "dependency": "nationality",
          "nationalities": [
            "ALB",
            "AZE",
            "BHS",
            "BRB",
            "GEO",
            "GRD",
            "KAZ",
            "KGZ",
            "MDV",
            "MUS",
            "PAN",
            "RUS",
            "KNA",
            "SYC",
            "ZAF",
            "TJK",
            "TUR",
            "UZB"
          ],
          "name": "validity_6_months_by_nationality"
        },
        {
          "type": "fee",
          "fee": {
            "usd": 59,
            "ils": 180,
            "sek": 590,
            "rub": 4990,
            "kzt": 29990
          },
          "dependency": "min_age",
          "age": 60,
          "name": "fee_60_plus"
        }
      ],
      "replacement": {
        "active": true
      }
    },
    "quantity": 1,
    "termsAgreed": true,
    "updated_at": "2025-07-30T14:51:51.411Z",
    "urgency": "none"
  },
  "order": {
    "id": "RU250730SA4",
    "form_id": "frm_UgvbsosnDR39",
    "payment_id": "6771417697",
    "payment_processor": "tbank",
    "amount": 12990,
    "currency": "RUB",
    "coupon": null,
    "status": "active",
    "branch": "ru",
    "domain": "visanet.ru"
  }
};

async function testWebhook() {
  const url = 'http://localhost:3000/api/v1/webhooks/n8n/orders';
  
  console.log('Testing n8n webhook with Saudi Arabia visa order...');
  console.log(`URL: ${url}`);
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`Country: ${testData.form.country} (${testData.form.product.docName})`);
  console.log(`Applicants: ${testData.form.applicants.length}`);
  console.log(`Unique fields: maritalStatus, religion, occupation (simple), guardianPassport`);
  console.log(`Product features: 6-month validity, age-based pricing, replacement option`);
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