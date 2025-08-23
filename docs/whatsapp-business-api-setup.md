# WhatsApp Business API Setup Guide

## Meta/Facebook Setup Requirements

### Step 1: Create Meta App

1. Go to [https://developers.facebook.com](https://developers.facebook.com)
2. Create a new app or select existing app
3. Choose "Business" as the app type
4. Add WhatsApp Product to the app

### Step 2: Configure Webhook

Configure the following webhook URL in your Meta App:
```
https://api.visanet.app/api/v1/webhooks/whatsapp
```

### Step 3: Subscribe to Webhook Fields

Subscribe to the following webhook fields:
- `messages` - Incoming messages from users
- `messages.status` - Message delivery status updates
- `message_template_status_update` - Template approval status changes

### Step 4: Generate Permanent Access Token

1. Navigate to WhatsApp > API Setup
2. Generate a permanent access token (not temporary)
3. Store this token securely

### Step 5: Business Phone Number Verification

1. Add your business phone number in WhatsApp > Phone Numbers
2. Complete the verification process (SMS or voice call)
3. Note the Phone Number ID for configuration

## Required Environment Variables

Add these to your Railway backend environment:

```bash
# WhatsApp Business API Configuration
WABA_PHONE_NUMBER_ID=<from Meta App - WhatsApp > API Setup>
WABA_BUSINESS_ID=<from Meta App - WhatsApp > API Setup>
WABA_ACCESS_TOKEN=<permanent token from Meta>
WABA_WEBHOOK_SECRET=<generate a strong random secret>
WABA_APP_SECRET=<from Meta App Settings > Basic>
WABA_WEBHOOK_VERIFY_TOKEN=<any random string you choose>
```

## Meta App Values Location Guide

| Value | Location in Meta App |
|-------|---------------------|
| Phone Number ID | WhatsApp > API Setup > Phone Number ID |
| WhatsApp Business Account ID | WhatsApp > API Setup > WhatsApp Business Account ID |
| App Secret | App Settings > Basic > App Secret |
| Permanent Access Token | WhatsApp > API Setup > Access Token (Generate Permanent) |

## Message Template Approval

### Required Templates

1. **order_confirmation_global** - Order confirmation template
   - Variables: order_id, customer_name, visa_type, country, etc.
   - Languages: English, Hebrew
   - Category: Transactional

### Template Submission Process

1. Go to WhatsApp > Message Templates
2. Create new template
3. Choose category: "Transactional"
4. Add template content with variables:
   ```
   Hello {{1}}, your visa order {{2}} for {{3}} to {{4}} has been received. 
   Processing time: {{5}}. We'll notify you when ready.
   ```
5. Submit for Meta approval (24-48 hours typical)

## Webhook Security Implementation

### HMAC-SHA256 Signature Verification

The webhook endpoint implements signature verification to ensure requests come from Meta:

```typescript
// Signature verification process
const signature = req.headers['x-hub-signature-256'];
const expectedSignature = crypto
  .createHmac('sha256', WABA_APP_SECRET)
  .update(rawBody)
  .digest('hex');

if (signature !== `sha256=${expectedSignature}`) {
  throw new UnauthorizedException('Invalid webhook signature');
}
```

### Webhook Verification Challenge

Meta will send a GET request to verify your webhook:

```typescript
// Handle webhook verification
if (req.method === 'GET') {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === WABA_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  
  return res.status(403).send('Forbidden');
}
```

## Testing Your Integration

### 1. Webhook Verification

```bash
# Test webhook verification
curl -X GET "https://api.visanet.app/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test_challenge"
```

### 2. Send Test Message

```bash
# Send test message via API
curl -X POST https://graph.facebook.com/v17.0/PHONE_NUMBER_ID/messages \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "972501234567",
    "type": "template",
    "template": {
      "name": "order_confirmation_global",
      "language": { "code": "en" },
      "components": [{
        "type": "body",
        "parameters": [
          {"type": "text", "text": "John Doe"},
          {"type": "text", "text": "ORD-12345"},
          {"type": "text", "text": "Tourist Visa"},
          {"type": "text", "text": "USA"},
          {"type": "text", "text": "7-10 business days"}
        ]
      }]
    }
  }'
```

## Current Architecture

### Hybrid Implementation (As of August 2025)

- **Message Sending**: CBB API (production ready)
- **Webhook Receiving**: Direct Meta WhatsApp Business API (63% complete)
- **Dashboard**: CBB Dashboard (no custom UI required)

### Database Tables

```sql
-- Webhook events tracking
CREATE TABLE whatsapp_webhook_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(50),
  payload JSONB,
  signature VARCHAR(255),
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message status tracking
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE,
  phone_number VARCHAR(50),
  template_name VARCHAR(100),
  status VARCHAR(50),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT
);
```

## Production Checklist

- [ ] Meta App created and configured
- [ ] WhatsApp Product added to Meta App
- [ ] Webhook URL configured and verified
- [ ] Webhook fields subscribed
- [ ] Permanent access token generated
- [ ] Phone number verified
- [ ] Environment variables configured in Railway
- [ ] Message templates submitted for approval
- [ ] Templates approved by Meta
- [ ] Webhook signature verification implemented
- [ ] Test messages sent successfully
- [ ] Delivery status webhooks received
- [ ] Error handling implemented
- [ ] Monitoring and alerting configured

## Support and Resources

- [WhatsApp Business Platform Documentation](https://developers.facebook.com/docs/whatsapp)
- [Message Templates Best Practices](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Error Codes Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)

## Contact for Issues

For integration support, contact the VisAPI development team with:
- Meta App ID
- Error messages and codes
- Webhook payload samples
- Template rejection reasons (if applicable)