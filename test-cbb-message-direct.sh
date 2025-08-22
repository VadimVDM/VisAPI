#!/bin/bash

# Direct test of CBB WhatsApp message sending with corrected format
# Tests the Dynamic Content format as per CBB documentation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CBB_API_URL="${CBB_API_URL:-https://api.chatgptbuilder.io/api}"
CBB_API_KEY="${CBB_API_KEY}"
TEST_CONTACT_ID="${1:-972507758758}"  # Pass phone as first argument or use default

if [ -z "$CBB_API_KEY" ]; then
  echo -e "${RED}Error: CBB_API_KEY environment variable is required${NC}"
  echo "Usage: CBB_API_KEY=your_key ./test-cbb-message-direct.sh [phone_number]"
  exit 1
fi

echo -e "${YELLOW}=== CBB WhatsApp Message Test ===${NC}"
echo "API URL: $CBB_API_URL"
echo "Contact ID: $TEST_CONTACT_ID"
echo ""

# Test message
MESSAGE="שלום! זו הודעת בדיקה של מערכת WhatsApp דרך CBB 🎯

זמן: $(date '+%Y-%m-%d %H:%M:%S')
סטטוס: הודעה נשלחה בהצלחה ✅

*מערכת VisAPI* 🛂"

# Test 1: Dynamic Content Format (Primary method)
echo -e "${YELLOW}Test 1: Dynamic Content Format (Primary)${NC}"

PAYLOAD=$(cat <<EOF
{
  "messages": [
    {
      "message": {
        "text": "$MESSAGE",
        "quick_replies": []
      }
    }
  ],
  "actions": [
    {
      "action": "set_field_value",
      "field_name": "last_test",
      "value": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }
  ]
}
EOF
)

RESPONSE=$(curl -s -X POST \
  "${CBB_API_URL}/contacts/${TEST_CONTACT_ID}/send_content" \
  -H "Content-Type: application/json" \
  -H "X-ACCESS-TOKEN: ${CBB_API_KEY}" \
  -d "$PAYLOAD")

if echo "$RESPONSE" | grep -q '"success":true\|message_id'; then
  echo -e "${GREEN}✅ Success! Message sent with Dynamic Content format${NC}"
  echo "Response: $RESPONSE"
else
  echo -e "${RED}❌ Failed with Dynamic Content format${NC}"
  echo "Response: $RESPONSE"
  
  # Try alternative format
  echo ""
  echo -e "${YELLOW}Test 2: WhatsApp-Specific Format (Fallback)${NC}"
  
  PAYLOAD_ALT=$(cat <<EOF
{
  "messages": [
    {
      "messaging_product": "WhatsApp",
      "recipient_type": "individual",
      "to": null,
      "type": "interactive",
      "interactive": {
        "type": "button",
        "body": {
          "text": "$MESSAGE"
        },
        "action": {
          "buttons": []
        }
      }
    }
  ],
  "actions": [
    {
      "action": "set_field_value",
      "field_name": "last_test",
      "value": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }
  ]
}
EOF
)
  
  RESPONSE_ALT=$(curl -s -X POST \
    "${CBB_API_URL}/contacts/${TEST_CONTACT_ID}/send_content" \
    -H "Content-Type: application/json" \
    -H "X-ACCESS-TOKEN: ${CBB_API_KEY}" \
    -d "$PAYLOAD_ALT")
  
  if echo "$RESPONSE_ALT" | grep -q '"success":true\|message_id'; then
    echo -e "${GREEN}✅ Success! Message sent with WhatsApp-specific format${NC}"
    echo "Response: $RESPONSE_ALT"
  else
    echo -e "${RED}❌ Failed with WhatsApp-specific format${NC}"
    echo "Response: $RESPONSE_ALT"
  fi
fi

echo ""
echo -e "${YELLOW}=== Test Complete ===${NC}"
echo "Check WhatsApp for the test message on: $TEST_CONTACT_ID"