#!/usr/bin/env node

/**
 * Test script for n8n webhook endpoint with Morocco eVisa order
 * Usage: node tools/scripts/test-morocco-visa-webhook.js <api-key>
 */

const axios = require('axios');

// Get API key from command line argument
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Usage: node tools/scripts/test-morocco-visa-webhook.js <api-key>');
  console.error('Example: node tools/scripts/test-morocco-visa-webhook.js n8n_xxx.yyy');
  process.exit(1);
}

// Test data - Morocco eVisa order
const testData = {
  "form": {
    "_id": "68887f4afab002d7ab09cb2a",
    "id": "frm_CjV3H4U2FSKy",
    "applicants": [
      {
        "id": "apl_d_8V-w62GHu_",
        "passport": {
          "nationality": "ISR",
          "firstName": "RAMZI ",
          "lastName": "ABU DOGOSH ",
          "sex": "m",
          "dateOfBirth": "1983-06-01",
          "countryOfBirth": "ISR",
          "number": "39034454",
          "dateOfIssue": "2022-09-22",
          "dateOfExpiry": "2032-09-21"
        },
        "occupation": "self_employed",
        "files": {
          "face": "https://storage.googleapis.com/veezee-86fc0.appspot.com/photos/frm_CjV3H4U2FSKy/apl_d_8V-w62GHu_-face?GoogleAccessId=veezee-email-bot%40veezee-86fc0.iam.gserviceaccount.com&Expires=1785333216&Signature=S0HB0l7kHijOWrAbVbwhgxQcVWP%2BhAIsEDPg6czB1SCrk%2BlAeKHwMReyeYAVL1YTkdIn9kq6s38O%2FADfnfuXhD9dmcvMuHIMXnYY2wdIfTp5d5uXgdTZNetv5%2FVJHDl2Mc3q4yzVId3MfPEU5xCT%2F%2FDTb%2BCTIk1975eaWtsv%2B3xc4xYwO%2FqvycU7M6AFoMjEGJ4FABbPHFILYa5TS0y2Km40V3xzKG%2BCXXQfLsWw5f8tRqbS8Mqp4gUQ4NmPIofaMPlqLPiCRcAFI%2FSbU%2FWmCaqjik28umsXhfdNoc6zi9mEAiQIAPseY7y6i0BSLTxdu5GL2OCY1s3w13LujNczQw%3D%3D",
          "passport": "https://storage.googleapis.com/veezee-86fc0.appspot.com/photos/frm_CjV3H4U2FSKy/apl_d_8V-w62GHu_-passport?GoogleAccessId=veezee-email-bot%40veezee-86fc0.iam.gserviceaccount.com&Expires=1785333216&Signature=meq%2B9vjFGikNIR4NIbLY%2B%2BtEnScDLEwig2XMWUKXL5TqHMqhjA2VHcWuSlRFe0LVdcMiXRxlIz%2BtMtk9lakNak%2BXgBlK3SnQs17QtIw9yH9cYF37wtYryTL5mQjJUDZlKouiHvXn7z1W7NTIJgJs7qmda%2BALTh4jAoVIvFRbNAbRqpFPnUiUNY5jurKHRiqQGC10ofs8d%2F6yMWzp%2BVn%2BDUghNMfNFhGPbQZrltFyiKd7IyTK4SbouAzPydczvfmTkRvtpQunIZ81cniwOMG2Yazy%2F6wcI6CS%2FfAmklSi57Mcwmo9DDOtbJrrSdLac%2BqtqPXSIGaX6LVBncNEKeAQSg%3D%3D",
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
        "id": "apl_m7D7VCoil3RF",
        "passport": {
          "nationality": "ISR",
          "firstName": "SHATELA ",
          "lastName": "ABU DOGOSH",
          "sex": "f",
          "dateOfBirth": "1983-03-21",
          "countryOfBirth": "ISR",
          "number": "32151813",
          "dateOfIssue": "2018-03-08",
          "dateOfExpiry": "2028-03-07"
        },
        "occupation": "employee",
        "files": {
          "face": "https://storage.googleapis.com/veezee-86fc0.appspot.com/photos/frm_CjV3H4U2FSKy/apl_m7D7VCoil3RF-face?GoogleAccessId=veezee-email-bot%40veezee-86fc0.iam.gserviceaccount.com&Expires=1785333216&Signature=ijHwCJ8ITN2%2FDQfkQcXCvhcAabHeIbsyxUV0Wx8vr3AAd5%2BTeoa3H8tms11qQFDebJH8Uhyt5x4OE%2BxZyEClRpoNLj5%2ByN368BaL9Gwh%2BIHfi3qOLZudTvyfM7PCqIDGpEz2RoZYVtJHJdoXUjGZrrOe9RrEmE9ICZHObnqWRPltDIcVJZaohgssbI2lRG4IZuCAiN1QhDuNKKqqq%2FuTO82v1USbcZPe2xV9SWyHfxQf7bKTAgFa6JdWzi69Are5okJom92sEx6vHAuGzlSz7a%2BRg3NQWQoYIuvnMslEPT8GtGqTxfhuAzdZ6Y9QBkEjyJ9JD5SVlIJEzfl9S7t6fQ%3D%3D",
          "passport": "https://storage.googleapis.com/veezee-86fc0.appspot.com/photos/frm_CjV3H4U2FSKy/apl_m7D7VCoil3RF-passport?GoogleAccessId=veezee-email-bot%40veezee-86fc0.iam.gserviceaccount.com&Expires=1785333217&Signature=Z3pKm0LKShor%2FtGG9Uk8qfn0qE89vf%2FX8ihnlqhBoUpxuIjdKolBPuNNPU3lWR83Vubd0Yr3Jyex5kJEmzzgK1lvcVGBaBXby7pDOLVxs4%2BiyAsA0OUX2ZKRH%2FwVfqRIiwJpUiSJcTn0QIJmF2hQ9lk%2BXCU4Y58%2FvjlupjqdhDv9y%2FFv1B6D2ZXN0rPOYIlMUYSFy1w7Iy66KK55aij2SGFro8Zs7fjGt0X%2BxJr5%2F5ZVhOimb4cTstAW53raGE8cq15Ll1MTGjfVALnt63RGbYOFQ2JAYworSknNvKjXHTCKkPvHUpLG0hguj9vVBpmcttmfWaEqA9ZiaLSuzknRMw%3D%3D",
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
      "name": "ramzi abu dogosh ",
      "email": "aimer2430@gmail.com",
      "phone": {
        "code": "972",
        "number": "537511402"
      }
    },
    "country": "morocco",
    "created_at": "2025-07-29T07:59:06.247Z",
    "entry": {
      "date": "2025-08-07",
      "port": null
    },
    "fileTransferMethod": "form",
    "meta": {
      "url": "https://visanet.co/morocco?utm_source=chatgpt.com",
      "branch": "co",
      "domain": "visanet.co",
      "referrer": "https://chatgpt.com/",
      "step": 5,
      "completion": 1,
      "resumed": false,
      "timestamp": 1753775878629,
      "clientIp": "172.225.187.10",
      "revision": 4
    },
    "orderId": null,
    "product": {
      "name": "morocco_tourist_6_months",
      "country": "morocco",
      "docType": "evisa",
      "docName": "eVisa",
      "intent": "tourism",
      "entries": "single",
      "validity": "6_months",
      "valid_since": "approval",
      "wait": 3,
      "price": {
        "ils": 399,
        "usd": 99,
        "rub": 11990,
        "sek": 990,
        "kzt": 75990
      },
      "instructions": [
        "print",
        "travel_documents",
        "return_ticket"
      ],
      "urgencies": [
        {
          "speed": "next_day",
          "fee": {
            "ils": 199,
            "usd": 39,
            "rub": 3990,
            "sek": 499,
            "kzt": 19990
          }
        }
      ],
      "stay_limit": 30,
      "photo_types": [
        "face",
        "passport"
      ]
    },
    "quantity": 2,
    "termsAgreed": true,
    "updated_at": "2025-07-29T08:04:26.634Z",
    "urgency": "none"
  },
  "order": {
    "id": "CO250729MA1",
    "form_id": "frm_CjV3H4U2FSKy",
    "payment_id": "pi_3Rq8WNIquNYplK1V0CmUOyng",
    "payment_processor": "stripe",
    "amount": 198,
    "currency": "USD",
    "coupon": null,
    "status": "active",
    "branch": "co",
    "domain": "visanet.co"
  }
};

async function testWebhook() {
  const url = 'http://localhost:3000/api/v1/webhooks/n8n/orders';
  
  console.log('Testing n8n webhook with Morocco eVisa order...');
  console.log(`URL: ${url}`);
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`Country: ${testData.form.country} (${testData.form.product.docName})`);
  console.log(`Applicants: ${testData.form.applicants.length}`);
  console.log(`Unique features:`);
  console.log(`  - Extremely simplified structure`);
  console.log(`  - Occupation as simple string`);
  console.log(`  - No address, family, or nationality fields`);
  console.log(`  - Missing whatsappAlertsEnabled in client`);
  console.log(`  - Payment in USD via Stripe`);
  console.log(`  - UTM tracking in URL`);
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