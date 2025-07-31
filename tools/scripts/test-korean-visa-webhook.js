#!/usr/bin/env node

/**
 * Test script for n8n webhook endpoint with Korean visa order
 * Usage: node tools/scripts/test-korean-visa-webhook.js <api-key>
 */

const axios = require('axios');

// Get API key from command line argument
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Usage: node tools/scripts/test-korean-visa-webhook.js <api-key>');
  console.error('Example: node tools/scripts/test-korean-visa-webhook.js n8n_xxx.yyy');
  process.exit(1);
}

// Test data - Korean K-ETA order
const testData = {
  "form": {
    "_id": "688a6a51fab002d7ab09e2b6",
    "id": "frm_N97bn8JFawCh",
    "applicants": [
      {
        "id": "apl_691IGtLWdk7e",
        "visited": false,
        "passport": {
          "nationality": "RUS",
          "firstName": "NIKOLAI",
          "lastName": "MIAKOTIN",
          "sex": "m",
          "dateOfBirth": "1979-05-29",
          "countryOfBirth": "RUS",
          "number": "765788862",
          "dateOfExpiry": "2031-10-21"
        },
        "lastTravel": {
          "traveled": true,
          "country": "ITA",
          "from": "2025-05-21",
          "until": "2025-05-31"
        },
        "address": {
          "line": "ул.Братьев Коростелевых дом.236 кв.2А",
          "city": "Самара",
          "country": "RUS"
        },
        "cityOfBirth": "Куйбышева",
        "occupation": {
          "education": "highschool",
          "status": "employee",
          "name": "ООО \"Эра\"",
          "seniority": "2-5",
          "phone": {
            "code": "7",
            "number": "9277500500"
          },
          "address": {
            "line": "",
            "city": "",
            "country": "RUS"
          }
        },
        "crime": "",
        "extraNationality": {
          "status": "none"
        },
        "files": {
          "face": "https://storage.googleapis.com/veezee-86fc0.appspot.com/photos/frm_N97bn8JFawCh/apl_691IGtLWdk7e-face?GoogleAccessId=veezee-email-bot%40veezee-86fc0.iam.gserviceaccount.com&Expires=1785460359&Signature=itt5Rk%2F41sgPoco7Bcdt5f18hQZ9bG3%2Ba7dUXWESchFFoE9ABr3s5dVlAyjtOMHpzPLO4aNNjxEJuBL0tQyF1sIazMkJAAHwS56JfoNrZe4EVsK%2FYJyseUlu4%2FtXoF5%2B7iy1UfT9v6BPtMJNbO7%2BUQhDDqGk6JSxfeiUrTNCBg%2BiiiFijm2suuGkcC5qjGf22Z%2Fz5Q%2FOU842puMmzv%2F0OkgD6P7qp82m%2FW9bSK5%2FM4va7fcS7UoHFvohAhk%2Fd6uA7FoLSGSFQZulub%2BmObqBUysDnLtUHsZZN7Vbw4k2gtus%2BO9%2F7ID2P4HNNeLHuOJP5lJczCgNXFHrlZr0vFVIeg%3D%3D",
          "passport": "https://storage.googleapis.com/veezee-86fc0.appspot.com/photos/frm_N97bn8JFawCh/apl_691IGtLWdk7e-passport?GoogleAccessId=veezee-email-bot%40veezee-86fc0.iam.gserviceaccount.com&Expires=1785460359&Signature=OeDpgacp7wQz2l1A%2FXJsANPKFMaYGJj61U9nFLqdRXaCD9qQiMSqb01MrHRwSV6NV%2Fl%2FX4vtxjcV2veJQU8oXKcS2b5C%2Bp8KXM5EJoGuF3NRfBZT3lxJyneBMIRtSYoR5neZjvzDhtmHLkS4OqK8wZP1kMCcd07B3DF%2BM5XkA7NfE6NQ1zDS95ccv4Nyo0K0PH5EE2qwrlL89ZCk8s0ITU17d6pzqtI%2FH22FKqeu2uQ%2BWvqoCv4StZNHs4FQsMdBFdpOqcu3K%2FPw351gUenYo1cvnxZRqCWDDvgveHIyiwoLQWXJpeQF0QRiyd7Qg8h8A%2FszWpXxIj2mNcCLrB0MUg%3D%3D",
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
    "children": [],
    "client": {
      "name": "Николай Мякотин",
      "email": "nn500@mail.ru",
      "phone": {
        "code": "7",
        "number": "9277500500"
      },
      "whatsappAlertsEnabled": true
    },
    "country": "korea",
    "created_at": "2025-07-30T18:54:09.187Z",
    "entry": {
      "date": "2025-08-10",
      "port": null
    },
    "fileTransferMethod": "form",
    "meta": {
      "url": "https://visanet.ru/korea",
      "branch": "ru",
      "domain": "visanet.ru",
      "referrer": "",
      "step": 5,
      "completion": 1,
      "resumed": false,
      "timestamp": 1753900941696,
      "clientIp": "178.18.5.15",
      "revision": 5
    },
    "orderId": null,
    "product": {
      "name": "korea_3_years",
      "country": "korea",
      "docType": "eta",
      "docName": "K-ETA",
      "intent": "general",
      "entries": "multiple",
      "validity": "3_years",
      "valid_since": "approval",
      "wait": 3,
      "price": {
        "ils": 99,
        "usd": 29,
        "rub": 2990,
        "sek": 299,
        "kzt": 19990
      },
      "instructions": [
        "print",
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
      "stay_limit": 60,
      "photo_types": [
        "face",
        "passport"
      ],
      "variations": [
        {
          "type": "stay_limit",
          "limit": 30,
          "dependency": "nationality",
          "nationalities": [
            "ALB",
            "AND",
            "BHR",
            "BIH",
            "BRN",
            "CYP",
            "SWZ",
            "FJI",
            "GUY",
            "VAT",
            "HND",
            "KAZ",
            "KIR",
            "MHL",
            "MUS",
            "FSM",
            "MCO",
            "MNE",
            "NRU",
            "NCL",
            "OMN",
            "PLW",
            "PRY",
            "WSM",
            "SMR",
            "SAU",
            "SYC",
            "SLB",
            "ZAF",
            "TON",
            "TUN",
            "TUV"
          ],
          "name": "stay_limit_by_nationality"
        },
        {
          "type": "validity",
          "validity": "2_years",
          "dependency": "nationality",
          "nationalities": [
            "ISR"
          ],
          "name": "validity_2_years_by_nationality"
        }
      ]
    },
    "quantity": 1,
    "stayAddress": "28, Mareunnae-ro, Jung-gu, 04555",
    "termsAgreed": true,
    "updated_at": "2025-07-30T19:23:27.978Z",
    "urgency": "none"
  },
  "order": {
    "id": "RU250730KR7",
    "form_id": "frm_N97bn8JFawCh",
    "payment_id": "6772692399",
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
  
  console.log('Testing n8n webhook with Korean visa order...');
  console.log(`URL: ${url}`);
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`Country: ${testData.form.country} (${testData.form.product.docName})`);
  console.log(`Applicants: ${testData.form.applicants.length}`);
  console.log(`Stay Address: ${testData.form.stayAddress}`);
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