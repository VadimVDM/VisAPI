#!/bin/bash
# Resend failed WhatsApp messages from past 24h
# Payment issue is now fixed, so these should succeed

API_KEY="$1"

if [ -z "$API_KEY" ]; then
  echo "Usage: ./resend-failed-messages.sh <ADMIN_API_KEY>"
  echo ""
  echo "Get your admin key by running: pnpm create-admin-key"
  exit 1
fi

echo "🔄 Resending 13 failed WhatsApp messages..."
echo ""

# Array of order IDs to resend
ORDER_IDS=(
  "IL251109IN4"
  "IL251109US5"
  "IL251109IN7"
  "IL251109MA8"
  "IL251109VN9"
  "IL251109MA11"
  "IL251109MA12"
  "IL251109IN13"
  "IL251109VN14"
  "IL251105IN6"
  "IL251103VN5"
  "IL251104IN5"
  "IL251109GB16"
)

SUCCESS=0
FAILED=0

for ORDER_ID in "${ORDER_IDS[@]}"; do
  echo "📤 Resending: $ORDER_ID"

  RESPONSE=$(curl -s -X POST https://api.visanet.app/api/v1/webhooks/vizi/retrigger-whatsapp \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{\"orderId\": \"$ORDER_ID\", \"force\": true}")

  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "   ✅ Success"
    ((SUCCESS++))
  else
    echo "   ❌ Failed: $RESPONSE"
    ((FAILED++))
  fi

  # Small delay to avoid rate limiting
  sleep 1
done

echo ""
echo "📊 Results:"
echo "   ✅ Success: $SUCCESS"
echo "   ❌ Failed: $FAILED"
echo ""
echo "✨ Done! Check messages in database to verify delivery status."
