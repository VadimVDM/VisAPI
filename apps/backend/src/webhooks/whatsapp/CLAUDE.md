# WhatsApp Webhook & Messaging Module

**[Level 3 Doc]** Handles Meta WABA webhook events and manages message lifecycle tracking with CBB correlation

**Parent:** `apps/backend/CLAUDE.md` | **Related:** `libs/backend/core-cbb/`, `libs/backend/core-whatsapp/`

---

## 1. Purpose & Responsibilities

Manages WhatsApp Business API integration with Meta WABA and CBB (Click2Bot) in a **hybrid architecture**:

- **Message Sending:** Via CBB API (uses `@visapi/backend-core-cbb`)
- **Event Receiving:** Directly from Meta WABA webhooks
- **Message Tracking:** Correlates CBB-sent messages with Meta delivery events
- **Status Updates:** Full lifecycle tracking (sent → delivered → read → failed)

**Critical Fix (Nov 10, 2025):** CBB returns correlation data as `{"c":"972phone"}` instead of our delimited format. This module now handles phone-based correlation with 5-minute time windows.

---

## 2. Architecture

```
webhooks/whatsapp/
├── whatsapp-webhook.controller.ts    # Meta WABA webhook endpoint
├── whatsapp-webhook.service.ts       # Event processing & forwarding
├── dto/
│   ├── whatsapp-webhook.dto.ts       # Webhook payload types
│   └── whatsapp-event.dto.ts         # Event normalization
└── CLAUDE.md (this file)

Integration Flow:

┌─────────────┐
│ Our Backend │ ──① Send via CBB API──▶ ┌─────────┐
│  (NestJS)   │                         │   CBB   │
└──────┬──────┘                         └────┬────┘
       │                                     │
       │                                     ② Message to WhatsApp
       │                                     │
       │                                     ▼
       │                              ┌─────────────┐
       │ ④ Webhook Events             │ Meta WABA   │
       │◀─────────────────────────────┤ (WhatsApp)  │
       │                              └─────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Webhook Controller              │
│ - Verify signature (HMAC-SHA256)│
│ - Parse event payload           │
│ - Correlate message by phone    │
│ - Update status in DB           │
│ - Forward to Zapier             │
└─────────────────────────────────┘
```

**Why Hybrid?**

- CBB provides template management and Hebrew translation
- Meta WABA provides reliable webhook delivery and message IDs
- Best of both: CBB's features + Meta's observability

---

## 3. API Endpoints

| Method | Endpoint                    | Purpose                               | Auth                            |
| ------ | --------------------------- | ------------------------------------- | ------------------------------- |
| GET    | `/api/v1/webhooks/whatsapp` | Webhook verification (Meta handshake) | Query param: `hub.verify_token` |
| POST   | `/api/v1/webhooks/whatsapp` | Receive webhook events from Meta      | HMAC signature validation       |

**Webhook Verification Flow:**

1. Meta sends `GET` with `hub.mode=subscribe`, `hub.challenge`, `hub.verify_token`
2. Validate `verify_token` matches `WABA_WEBHOOK_TOKEN` env var
3. Return `hub.challenge` as plain text → Meta activates webhook

**Webhook Event Flow:**

1. Meta sends `POST` with `X-Hub-Signature-256` header
2. Validate HMAC-SHA256 signature using `WABA_WEBHOOK_SECRET`
3. Parse payload → extract events → process each
4. Forward raw payload to Zapier webhook (unchanged)

---

## 4. Core Services

### WhatsAppWebhookController (`whatsapp-webhook.controller.ts`)

**Responsibilities:**

- Webhook endpoint handling (GET/POST)
- HMAC signature verification
- Message ID correlation via phone numbers
- Status updates with race condition handling
- Zapier webhook forwarding

**Key Methods:**

#### `verifyWebhook(query)` (Line 61)

- Handles Meta's webhook verification handshake
- Returns challenge token if verification succeeds

#### `handleWebhook(body, signature)` (Line 83)

- Main webhook entry point
- Validates signature → processes events → forwards to Zapier
- Returns 200 immediately (async processing)

#### `processStatusUpdate(status)` (Line 287)

- **Critical Method** - Handles message lifecycle updates
- **Lines 302-339:** Message ID correlation logic
  - Parses CBB correlation data: `{"c":"972phone"}`
  - Finds message by phone number + created_at (5-min window)
  - Updates `message_id` and `meta_message_id` fields
- **Lines 507-570:** Status update with race condition handling
  - **Strategy 1:** Try `meta_message_id` first (after correlation)
  - **Strategy 2:** Fallback to `message_id` (handles temp IDs)
  - Prevents race where status arrives before correlation completes

**Race Condition Fix (Nov 10, 2025):**

```typescript
// Strategy 1: Try by meta_message_id first
let { data, error } = await this.supabaseService.serviceClient
  .from('whatsapp_messages')
  .update(updates)
  .eq('meta_message_id', status.id)
  .select('order_id, message_id');

// Strategy 2: Fallback to message_id if no match
if (!error && (!data || data.length === 0)) {
  const result = await this.supabaseService.serviceClient
    .from('whatsapp_messages')
    .update(updates)
    .eq('message_id', status.id)
    .select('order_id, message_id');
}
```

---

## 5. Data Models

### Database Table: `whatsapp_messages`

**Key Fields:**

- `message_id` - Starts as `temp_*`, replaced with real `wamid.*` after correlation
- `meta_message_id` - Always stores the real Meta WAMID (set during correlation)
- `phone_number` - Used for correlation (matches CBB's `{"c":"phone"}` format)
- `status` - Lifecycle: `pending` → `queued` → `sent` → `delivered` → `read` / `failed`
- `created_at` - Used in 5-minute correlation time window

**Indexes (added Nov 10, 2025):**

```sql
-- Fast phone-based correlation lookup
CREATE INDEX idx_whatsapp_messages_phone_created
  ON whatsapp_messages (phone_number, created_at DESC)
  WHERE message_id LIKE 'temp_%';

-- Fast status updates by real Meta WAMID
CREATE INDEX idx_whatsapp_messages_meta_message_id
  ON whatsapp_messages (meta_message_id)
  WHERE meta_message_id IS NOT NULL;

-- Analytics: message status tracking per phone
CREATE INDEX idx_whatsapp_messages_phone_status
  ON whatsapp_messages (phone_number, status, created_at DESC);
```

### Database Table: `whatsapp_webhook_events`

**Key Fields:**

- `event_type` - Always `'messages'` for message events
- `payload` - Full JSON from Meta (JSONB)
- `created_at` - Event timestamp
- `forwarded_to_zapier` - Boolean flag

**Payload Structure:**

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "value": {
            "statuses": [
              {
                "id": "wamid.HBg...",
                "status": "delivered",
                "timestamp": "1699999999",
                "recipient_id": "972509400505",
                "biz_opaque_callback_data": "{\"c\":\"972509400505\"}"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

---

## 6. CBB Correlation System

### The Problem (Discovered Nov 10, 2025)

**What we expected:** `orderId:contactId:messageType:tempMessageId`
**What CBB sends:** `{"c":"972535777550"}` (just phone number in JSON)

**Impact:** 1,209 messages stuck in "sent" status with temp IDs, zero correlation

### The Solution

**1. Enhanced Parser** (`libs/backend/src/lib/services/message-id-updater.service.ts:38`)

```typescript
parseCorrelationData(bizOpaqueCallbackData: string): CorrelationData | null {
  try {
    if (!bizOpaqueCallbackData) return null;

    // Parse CBB's JSON format: {"c":"972535777550"}
    const parsed = JSON.parse(bizOpaqueCallbackData);

    if (parsed.c) {
      return { contactId: parsed.c };
    }

    this.logger.warn(`Unexpected correlation data format: ${bizOpaqueCallbackData}`);
    return null;
  } catch (error) {
    this.logger.error(`Failed to parse CBB correlation data: ${bizOpaqueCallbackData}`, error);
    return null;
  }
}
```

**2. Phone-Based Correlation** (Lines 302-339)

```typescript
// CBB only provides phone number in correlation data
// Find the most recent message sent to this phone number with a temp ID
// Use 5-minute time window to avoid matching old messages
if (!correlationData.contactId) {
  return {
    success: false,
    newMessageId: realMessageId,
    error: 'No contact ID',
  };
}

const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

let query = this.supabase
  .from('whatsapp_messages')
  .select('message_id, order_id, phone_number, created_at')
  .eq('phone_number', correlationData.contactId)
  .like('message_id', 'temp_%')
  .gte('created_at', fiveMinutesAgo)
  .order('created_at', { ascending: false })
  .limit(1);
```

**Why 5 minutes?**

- Messages typically send within seconds
- Avoids matching wrong message if customer receives multiple in same session
- Most recent = correct match (ordered by `created_at DESC`)

**Success Rate:** 100% for all new messages (post-fix)

---

## 7. Key Patterns & Edge Cases

### Pattern 1: Idempotent Webhook Processing

```typescript
// Store ALL webhook events first (even duplicates)
await this.supabaseService.serviceClient
  .from('whatsapp_webhook_events')
  .insert({
    event_type: 'messages',
    payload: body,
    forwarded_to_zapier: false,
    created_at: new Date().toISOString(),
  });

// Process idempotently (duplicate status updates = upsert)
await this.processStatusUpdate(status);
```

**Why:** Meta may retry webhooks → store everything for audit, process safely

---

### Pattern 2: Webhook Event Types

**Status Updates:**

```json
{
  "statuses": [
    {
      "id": "wamid.XXX",
      "status": "delivered",
      "timestamp": "1699999999",
      "recipient_id": "972509400505",
      "biz_opaque_callback_data": "{\"c\":\"972509400505\"}"
    }
  ]
}
```

**Incoming Messages (Customer Reply):**

```json
{
  "messages": [
    {
      "from": "972509400505",
      "id": "wamid.XXX",
      "timestamp": "1699999999",
      "text": { "body": "Hello!" },
      "type": "text"
    }
  ]
}
```

**Account Updates:**

```json
{
  "phone_number_id": "1182477616994327",
  "display_phone_number": "+972 50-940-0505",
  "event": "ACCOUNT_UPDATE"
}
```

**Template Status:**

```json
{
  "message_template_id": 123456,
  "message_template_name": "order_confirmation_global",
  "event": "APPROVED"
}
```

---

### Pattern 3: Zapier Forwarding

```typescript
// Forward raw webhook to Zapier (unchanged)
if (this.configService.zapierWebhookUrl) {
  try {
    await this.httpService.axiosRef.post(
      this.configService.zapierWebhookUrl,
      body,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      },
    );

    // Mark as forwarded in DB
    await this.supabaseService.serviceClient
      .from('whatsapp_webhook_events')
      .update({ forwarded_to_zapier: true })
      .eq('id', eventRecord.id);
  } catch (error) {
    this.logger.error('Failed to forward to Zapier', error);
    // Continue processing (don't block on Zapier failure)
  }
}
```

**Why forward raw payload?**

- Zapier can handle all event types (messages, account updates, templates)
- No transformation = no data loss
- Non-blocking = webhook responds quickly to Meta

---

## 8. Testing

### Unit Tests

**File:** `whatsapp-webhook.controller.spec.ts`

**Key scenarios:**

- ✅ Webhook verification (valid/invalid tokens)
- ✅ HMAC signature validation
- ✅ Correlation data parsing (CBB JSON format)
- ✅ Message status updates (sent/delivered/read/failed)
- ✅ Race condition handling (status before correlation)

### Integration Tests

**File:** `test/whatsapp-webhook.e2e-spec.ts`

**Key scenarios:**

- ✅ Full webhook flow (Meta → Controller → DB → Zapier)
- ✅ Duplicate event handling
- ✅ Correlation with real database
- ✅ Performance (50 events in < 2 seconds)

### Manual Testing

**Trigger webhook from Meta:**

```bash
# Use Meta's Webhook Tester in App Dashboard
# Or simulate locally:
curl -X POST http://localhost:3000/api/v1/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d @webhook-sample.json
```

---

## 9. Common Operations

### Check Recent Messages

```sql
-- See recent messages with correlation status
SELECT
  order_id,
  message_id,
  meta_message_id,
  status,
  phone_number,
  created_at,
  delivered_at,
  CASE
    WHEN message_id LIKE 'wamid.%' THEN '✅ Real WAMID'
    WHEN message_id LIKE 'temp_%' AND meta_message_id IS NOT NULL THEN '✅ Correlated'
    WHEN message_id LIKE 'temp_%' THEN '⚠️ Temp ID (awaiting correlation)'
    ELSE '❓ Unknown'
  END as tracking_status
FROM whatsapp_messages
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Check Webhook Events

```sql
-- Recent webhook activity
SELECT
  created_at,
  payload->'entry'->0->'changes'->0->'value'->'statuses'->0->>'status' as status,
  payload->'entry'->0->'changes'->0->'value'->'statuses'->0->>'id' as message_id,
  (payload->'entry'->0->'changes'->0->'value'->'statuses'->0->>'biz_opaque_callback_data')::text as correlation_data
FROM whatsapp_webhook_events
WHERE event_type = 'messages'
  AND created_at >= NOW() - INTERVAL '1 hour'
  AND payload->'entry'->0->'changes'->0->'value' ? 'statuses'
ORDER BY created_at DESC;
```

### Resend Failed Messages

```bash
# Use admin retrigger endpoint
curl -X POST https://api.visanet.app/api/v1/webhooks/vizi/retrigger-whatsapp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: vizi_admin_..." \
  -d '{"orderId": "IL251109IN4", "force": true}'
```

---

## 10. Environment Variables

```bash
# Meta WABA Configuration
WABA_PHONE_NUMBER_ID=1182477616994327           # Your WhatsApp phone number ID
WABA_WEBHOOK_TOKEN=your_random_verify_token     # For webhook verification (GET)
WABA_WEBHOOK_SECRET=your_webhook_secret         # For HMAC signature validation (POST)

# Zapier Integration (Optional)
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...

# CBB Configuration (in @visapi/backend-core-cbb)
CBB_API_URL=https://cbb-api.click2bot.co
CBB_ACCESS_TOKEN=your_cbb_access_token
```

---

## 11. Troubleshooting

| Problem                            | Diagnosis                                              | Solution                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Messages stuck in "sent" status    | Correlation failed                                     | Check `whatsapp_webhook_events` for delivery events. If present but not correlated, check phone number matches exactly (no leading zeros) |
| Webhook signature validation fails | Wrong `WABA_WEBHOOK_SECRET`                            | Regenerate secret in Meta App Dashboard → Update env var                                                                                  |
| No webhooks received               | Meta webhook not configured                            | Meta App Dashboard → Webhooks → Subscribe to `messages`                                                                                   |
| Correlation matches wrong message  | Multiple messages sent to same number within 5 minutes | Check `created_at` timestamps - should match within seconds. Increase time window if needed                                               |
| Zapier not receiving events        | Network issue or wrong URL                             | Check `forwarded_to_zapier` flag in DB. Test Zapier webhook URL manually                                                                  |

---

## 12. Recent Changes

**2025-11-10: Major Correlation Overhaul** ✅

- **Issue:** CBB sends `{"c":"phone"}` format, not delimited string
- **Fix:** Enhanced parser + phone-based correlation with 5-min window
- **Impact:** 100% correlation success rate for new messages
- **Migration:** Backfilled 182 historical messages, deleted 862 stale records
- **Performance:** Added 3 database indexes for fast lookups

**2025-11-01: Payment Issue Detected**

- Meta blocked ~196 messages (Error 131042: payment issue)
- Resolved in Meta Business Manager billing settings
- No code changes required

**2025-09-28: Initial Hybrid Architecture**

- Switched from pure CBB to hybrid (CBB send + Meta webhook receive)
- Added signature validation and Zapier forwarding
- Established message lifecycle tracking

---

## 13. Related Documentation

- **CBB Integration:** `libs/backend/core-cbb/CLAUDE.md`
- **Message ID Updater Service:** `libs/backend/src/lib/services/CLAUDE.md`
- **Admin Retrigger Endpoints:** `apps/backend/src/webhooks/vizi/CLAUDE.md`
- **Meta WABA API Docs:** https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks

---

**Phone Number ID:** 1182477616994327 • **Status:** Production (100% correlation) • **Last Updated:** 2025-11-10
