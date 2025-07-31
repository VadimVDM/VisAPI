#!/usr/bin/env node

/**
 * Test script for n8n webhook endpoint with multi-applicant order
 * Usage: node tools/scripts/test-multi-applicant-webhook.js <api-key>
 */

const axios = require('axios');

// Get API key from command line argument
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Usage: node tools/scripts/test-multi-applicant-webhook.js <api-key>');
  console.error('Example: node tools/scripts/test-multi-applicant-webhook.js n8n_xxx.yyy');
  process.exit(1);
}

// Test data - multi-applicant Israeli order
const testData = {
  "form": {
    "_id": "688b0d7efab002d7ab09ea81",
    "id": "frm_WbLvW8O-GdKN",
    "applicants": [
      {
        "id": "apl_Y6gyZjwq8RrQ",
        "passport": {
          "nationality": "ISR",
          "firstName": "gilhar",
          "lastName": "bandel",
          "sex": "m",
          "dateOfBirth": "1993-11-03",
          "countryOfBirth": "ISR",
          "number": "42261552",
          "dateOfIssue": "2025-07-14",
          "dateOfExpiry": "2035-07-13",
          "placeOfIssue": "ISR"
        },
        "idNumber": "308106616",
        "extraNationality": {
          "status": "none"
        },
        "crime": "",
        "religion": "judaism",
        "address": {
          "line": "מעפילי אגוז 27",
          "city": "תל אביב",
          "country": "ISR"
        },
        "family": {
          "father": {
            "name": "זאב",
            "countryOfBirth": "ISR"
          },
          "mother": {
            "name": "רונית",
            "countryOfBirth": "ISR"
          },
          "marital": {
            "status": "single",
            "spouse": {
              "name": "",
              "countryOfBirth": "ISR"
            }
          }
        },
        "occupation": {
          "education": "highschool",
          "status": "employee",
          "name": "4CHEF",
          "seniority": "2-5",
          "phone": {
            "code": "972",
            "number": ""
          },
          "address": {
            "line": "קרליבך 11 ",
            "city": "תל אביב",
            "country": "ISR"
          }
        },
        "military": {
          "served": true,
          "role": "support",
          "rank": "staff_sergeant"
        },
        "pastTravels": {
          "pastVisit": {
            "visited": false,
            "pastVisa": {
              "number": "",
              "dateOfIssue": ""
            }
          },
          "rejection": "",
          "SAARC": {
            "visited": false,
            "countries": [],
            "year": 2024
          }
        },
        "files": {
          "face": "",
          "passport": "https://storage.googleapis.com/veezee-86fc0.appspot.com/photos/frm_WbLvW8O-GdKN/apl_Y6gyZjwq8RrQ-passport?GoogleAccessId=veezee-email-bot%40veezee-86fc0.iam.gserviceaccount.com&Expires=1785500954&Signature=nP7TJxuyce93v7Gt612YlrKJHC1tM0m9a4mJaOLGFuw2LABkYOm1R%2B9WxABsl0gQ0SpnLWT5JVTWjfevKXbKvOU4xHsnZQXiZQ%2FqPNAvIArz0GZ3QwXaQP6y4VIBi%2Bu3rqZPRKMl2d5cKFEazSL%2BSWnzpaJL4P3%2Fjlj9qrpjufcMKDhuksv%2BpA6LY113fX4ZBEmNzDb11ZjHmeE3oNBuXVBMqCe5IQefcEBwAkOSYV%2BAS5%2FVthqY88lKzqlqBqUfx0UZ%2BO0GyQhBt%2FTeOW%2BXJHcq4i5x0xxZWAWRfxf1gemPvIxX6nh9CbfFZYjX9z0wYCJDyymT4cu65bcl9LsOIQ%3D%3D",
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
        "id": "apl_S0ERaVJgNEEj",
        "passport": {
          "nationality": "ISR",
          "firstName": "ziv",
          "lastName": "sheffer",
          "sex": "m",
          "dateOfBirth": "1994-04-02",
          "countryOfBirth": "ISR",
          "number": "40553298",
          "dateOfIssue": "2024-03-10",
          "dateOfExpiry": "2034-03-09",
          "placeOfIssue": "ISR"
        },
        "idNumber": "305133803",
        "extraNationality": {
          "status": "none"
        },
        "crime": "",
        "religion": "judaism",
        "address": {
          "line": "ראש פינה 7",
          "city": "פתח תקווה",
          "country": "ISR"
        },
        "family": {
          "father": {
            "name": "הילי",
            "countryOfBirth": "ISR"
          },
          "mother": {
            "name": "סיגל",
            "countryOfBirth": "ISR"
          },
          "marital": {
            "status": "single",
            "spouse": {
              "name": "",
              "countryOfBirth": "ISR"
            }
          }
        },
        "occupation": {
          "education": "academic",
          "status": "employee",
          "name": "בית ספר ברנר",
          "seniority": "2-5",
          "phone": {
            "code": "972",
            "number": ""
          },
          "address": {
            "line": "זאב גלר 2",
            "city": "כפר סבא",
            "country": "ISR"
          }
        },
        "military": {
          "served": true,
          "role": "office",
          "rank": "staff_sergeant"
        },
        "pastTravels": {
          "pastVisit": {
            "visited": false,
            "pastVisa": {
              "number": "",
              "dateOfIssue": ""
            }
          },
          "rejection": "",
          "SAARC": {
            "visited": false,
            "countries": [],
            "year": 2024
          }
        },
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
    "business": {
      "name": "",
      "sector": "",
      "website": "",
      "address": {
        "line": "",
        "city": "",
        "country": "ISR"
      },
      "phone": {
        "code": "972",
        "number": ""
      }
    },
    "client": {
      "name": "גילהר בנדל",
      "email": "gilharbandel180@gmail.com",
      "phone": {
        "code": "972",
        "number": "0545371593"
      },
      "whatsappAlertsEnabled": true
    },
    "country": "india",
    "created_at": "2025-07-31T06:30:22.223Z",
    "entry": {
      "date": "2025-10-01",
      "port": "Delhi"
    },
    "fileTransferMethod": "whatsapp",
    "meta": {
      "url": "https://visanet.co.il/india",
      "branch": "il",
      "domain": "visanet.co.il",
      "referrer": "https://www.google.com/",
      "step": 5,
      "completion": 1,
      "resumed": false,
      "timestamp": 1753942476532,
      "clientIp": "79.181.150.187",
      "revision": 4
    },
    "orderId": null,
    "product": {
      "name": "india_tourist_year",
      "country": "india",
      "docType": "evisa",
      "docName": "eVisa",
      "intent": "tourism",
      "entries": "multiple",
      "validity": "year",
      "valid_since": "approval",
      "wait": 3,
      "price": {
        "ils": 249,
        "usd": 69,
        "rub": 6990,
        "sek": 699,
        "kzt": 42990
      },
      "instructions": [
        "stay_reset",
        "print",
        "2_passport_pages",
        "return_ticket"
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
      "calendar_stay_limit": 180,
      "photo_types": [
        "face",
        "passport"
      ]
    },
    "quantity": 2,
    "termsAgreed": true,
    "updated_at": "2025-07-31T06:40:03.721Z",
    "urgency": "none"
  },
  "order": {
    "id": "IL250731IN2",
    "form_id": "frm_WbLvW8O-GdKN",
    "payment_id": "pi_3Rqq9oC1lB0qvw9G1gBFfH1k",
    "payment_processor": "stripe",
    "amount": 498,
    "currency": "ILS",
    "coupon": null,
    "status": "active",
    "branch": "il",
    "domain": "visanet.co.il"
  }
};

async function testWebhook() {
  const url = 'http://localhost:3000/api/v1/webhooks/n8n/orders';
  
  console.log('Testing n8n webhook with multi-applicant order...');
  console.log(`URL: ${url}`);
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`Applicants: ${testData.form.applicants.length}`);
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