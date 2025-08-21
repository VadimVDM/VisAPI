#!/bin/bash

# Test the complete webhook flow with proper data
# This simulates a real Vizi webhook with correct structure

API_URL="https://api.visanet.app"
API_KEY="vizi_8goxcvyqvzgz53vqggdw8hykm7lqfemjz37zgyuvwx8rhvncvdzsgw"

# Create a test payload with proper structure
PAYLOAD='{
  "form": {
    "id": "frm_test_'$(date +%s)'",
    "meta": {
      "url": "https://visanet.app/india",
      "branch": "il",
      "domain": "visanet.app",
      "timestamp": '$(date +%s%3N)'
    },
    "entry": {
      "date": "2025-10-01",
      "port": "Ben Gurion Airport"
    },
    "client": {
      "name": "Real Test User",
      "email": "test@visanet.app",
      "phone": {
        "code": "972",
        "number": "502005240"
      },
      "whatsappAlertsEnabled": true
    },
    "country": "india",
    "product": {
      "name": "India Tourist Visa",
      "country": "india",
      "docType": "tourist"
    },
    "urgency": "standard",
    "quantity": 1,
    "applicants": [
      {
        "id": "app_001",
        "passport": {
          "sex": "m",
          "number": "IL12345678",
          "lastName": "TestUser",
          "firstName": "Real",
          "dateOfBirth": "1990-01-01",
          "nationality": "IL"
        }
      }
    ]
  },
  "order": {
    "id": "TEST_'$(date +%Y%m%d)'_'$(date +%H%M%S)'",
    "amount": 150,
    "branch": "il",
    "status": "active",
    "form_id": "frm_test_'$(date +%s)'",
    "currency": "USD",
    "payment_processor": "stripe"
  }
}'

echo "Testing webhook with order: TEST_$(date +%Y%m%d)_$(date +%H%M%S)"
echo "Phone: 972502005240 (formatted from code+number)"
echo "Branch: il (should map to Hebrew language)"
echo "Gender: m (should map to 'male' in CBB)"
echo ""

curl -X POST "${API_URL}/api/v1/webhooks/vizi/orders" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: test-$(date +%s)" \
  -d "$PAYLOAD" \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
