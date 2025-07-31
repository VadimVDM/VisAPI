#!/usr/bin/env node

/**
 * Test script for n8n webhook endpoint
 * Usage: node tools/scripts/test-n8n-webhook.js <api-key>
 */

const axios = require('axios');

// Get API key from command line argument
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Usage: node tools/scripts/test-n8n-webhook.js <api-key>');
  console.error('Example: node tools/scripts/test-n8n-webhook.js n8n_xxx.yyy');
  process.exit(1);
}

// Test data - the example provided
const testData = {
  "form": {
    "_id": "688b2b16fab002d7ab09ebf2",
    "id": "frm_BkBxQi3f7eyX",
    "applicants": [
      {
        "id": "apl_0Yn9dStG1_Or",
        "passport": {
          "nationality": "RUS",
          "firstName": "KIRILL",
          "lastName": "KOLOSOV",
          "sex": "m",
          "dateOfBirth": "1990-12-14",
          "countryOfBirth": "RUS",
          "number": "756473623",
          "dateOfIssue": "2017-11-30",
          "dateOfExpiry": "2027-11-30"
        },
        "pastVisit": {
          "visited": false,
          "year": ""
        },
        "address": {
          "line": "",
          "city": "г. Екатеринбург",
          "country": "RUS"
        },
        "occupation": {
          "education": "highschool",
          "status": "self_employed",
          "name": "ИП Колосов Кирилл Андреевич",
          "seniority": "2-5",
          "phone": {
            "code": "7",
            "number": "9326032514"
          },
          "address": {
            "line": "",
            "city": "",
            "country": "RUS"
          }
        },
        "extraNationality": {
          "status": "none"
        },
        "family": {
          "father": {
            "name": "Андрей",
            "countryOfBirth": "RUS"
          },
          "mother": {
            "name": "Ирина",
            "countryOfBirth": "RUS"
          },
          "marital": {
            "status": "single",
            "spouse": {
              "name": "",
              "countryOfBirth": "RUS"
            }
          }
        },
        "files": {
          "face": "",
          "passport": "https://storage.googleapis.com/veezee-86fc0.appspot.com/photos/frm_BkBxQi3f7eyX/apl_0Yn9dStG1_Or-passport?GoogleAccessId=veezee-email-bot%40veezee-86fc0.iam.gserviceaccount.com&Expires=1785508337&Signature=ieZGgU3glEhfIi6WOkIVmjxBtOmXQmusxIGKSycafQFdw%2BBIWA6BJ91KS6qIn0P7Gl0d9TDa%2BIf5DqIAf3g0HJ9bm%2FQvmfyjW%2BIIifYFiHEpkBPD%2BzN%2Fnszey05fTEQTC8Z01PiOiRJWM%2Fy5m7EyARZaWDsMqY0Oxwg8ka4R%2Boe8NTCpQI%2BVbXEBDRG7LxV%2Fzl1wEm99loESX9%2BQnuBAGMN8iQ3pwkDbiXd2debApLV%2BnNcbB53ML62u4F%2FoXjoSo2djWcaRRQlew5tOFWrOnPxYB%2Be1tbxPb%2FpgB5pTu6uqkzOynjOr8ZZ9b7ityxHGNPLGTmU83ttOy%2Fv75bS1tQ%3D%3D",
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
      "name": "KIRILL KOLOSOV",
      "email": "kyryshakolosov@yandex.ru",
      "phone": {
        "code": "7",
        "number": "9326032514"
      },
      "whatsappAlertsEnabled": false
    },
    "country": "israel",
    "created_at": "2025-07-31T08:36:38.257Z",
    "entry": {
      "date": "2025-08-16",
      "port": null
    },
    "fileTransferMethod": "form",
    "meta": {
      "url": "https://visanet.ru/israel",
      "branch": "ru",
      "domain": "visanet.ru",
      "referrer": "",
      "step": 5,
      "completion": 1,
      "resumed": false,
      "timestamp": 1753950861672,
      "clientIp": "",
      "revision": 4
    },
    "orderId": null,
    "product": {
      "name": "israel_2_years",
      "country": "israel",
      "docType": "eta",
      "docName": "ETA-IL",
      "intent": "general",
      "entries": "multiple",
      "validity": "2_years",
      "valid_since": "approval",
      "wait": 3,
      "price": {
        "ils": 99,
        "usd": 29,
        "rub": 2990,
        "sek": 290,
        "kzt": 17990
      },
      "instructions": [
        "stay_reset"
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
        "passport"
      ]
    },
    "quantity": 1,
    "termsAgreed": true,
    "updated_at": "2025-07-31T08:43:05.920Z",
    "urgency": "none"
  },
  "order": {
    "id": "RU250731IL1",
    "form_id": "frm_BkBxQi3f7eyX",
    "payment_id": "6775055760",
    "payment_processor": "tbank",
    "amount": 2990,
    "currency": "RUB",
    "coupon": null,
    "status": "active",
    "branch": "ru",
    "domain": "visanet.ru"
  }
};

async function testWebhook() {
  const url = 'http://localhost:3000/api/v1/webhooks/n8n/orders';
  
  console.log('Testing n8n webhook...');
  console.log(`URL: ${url}`);
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
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