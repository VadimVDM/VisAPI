# WhatsApp Message Tracking Services

**[Level 4 Doc]** Core services for WhatsApp message lifecycle tracking and ID correlation

**Parent:** `libs/backend/core-whatsapp/` | **Related:** `apps/backend/src/webhooks/whatsapp/`

---

## 1. Purpose

Provides critical infrastructure for tracking WhatsApp messages through their lifecycle:

- **Message ID Correlation:** Map temporary IDs to real Meta WAMIDs using CBB's phone-based system
- **Status Tracking:** Update message status (sent → delivered → read → failed)
- **Time-Window Matching:** Find messages by phone number within 5-minute windows

**Critical Component:** This service solves the CBB correlation issue where `{"c":"phone"}` format requires phone-based matching instead of order ID tracking.

---

## 2. MessageIdUpdaterService

**File:** `libs/backend/src/lib/services/message-id-updater.service.ts`

**Purpose:** Correlates temporary message IDs with real Meta WAMIDs using webhook data

---

### Key Methods

#### `parseCorrelationData(bizOpaqueCallbackData: string)`

**Purpose:** Parse CBB's correlation data from webhook events

**CBB Format (Current):**

```json
{
  "c": "972509400505"
}
```

**Implementation:**

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

**Returns:**

```typescript
interface CorrelationData {
  contactId: string; // Phone number (E.164)
}
```

**Note:** This used to support delimited format (`orderId:contactId:messageType:tempId`) but was simplified on Nov 10, 2025 to handle only CBB's JSON format. No legacy support needed - CBB always uses JSON.

---

#### `updateMessageId(tempMessageId: string, realMessageId: string, correlationData: CorrelationData)`

**Purpose:** Update database record from temp ID to real Meta WAMID

**Strategy:**

1. **Query by phone number** - Use `correlationData.contactId` to find message
2. **Filter by temp ID** - Only messages with `message_id LIKE 'temp_%'`
3. **Time window** - Last 5 minutes only (avoids wrong matches)
4. **Most recent first** - `ORDER BY created_at DESC LIMIT 1`
5. **Update both fields** - Set `message_id` AND `meta_message_id`

**Implementation:**

```typescript
async updateMessageId(
  tempMessageId: string,
  realMessageId: string,
  correlationData: CorrelationData
): Promise<UpdateResult> {
  // CBB only provides phone number in correlation data
  // Find the most recent message sent to this phone number with a temp ID
  // Use 5-minute time window to avoid matching old messages
  if (!correlationData.contactId) {
    return {
      success: false,
      newMessageId: realMessageId,
      error: 'No contact ID in correlation data'
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

  const { data: existingMessages, error: fetchError } = await query;

  if (fetchError) {
    return {
      success: false,
      newMessageId: realMessageId,
      error: `Database query failed: ${fetchError.message}`
    };
  }

  if (!existingMessages || existingMessages.length === 0) {
    return {
      success: false,
      newMessageId: realMessageId,
      error: 'No matching message found in 5-minute window'
    };
  }

  const message = existingMessages[0];

  // Update the message with the real WAMID
  const { error: updateError } = await this.supabase
    .from('whatsapp_messages')
    .update({
      message_id: realMessageId,
      meta_message_id: realMessageId,
      updated_at: new Date().toISOString()
    })
    .eq('message_id', message.message_id);

  if (updateError) {
    return {
      success: false,
      newMessageId: realMessageId,
      error: `Database update failed: ${updateError.message}`
    };
  }

  return {
    success: true,
    previousMessageId: message.message_id,
    newMessageId: realMessageId,
    orderId: message.order_id
  };
}
```

**Returns:**

```typescript
interface UpdateResult {
  success: boolean;
  previousMessageId?: string; // Old temp ID (e.g., 'temp_...')
  newMessageId: string; // New real WAMID (e.g., 'wamid.HBg...')
  orderId?: string; // Associated order ID
  error?: string; // If success = false
}
```

**Edge Cases Handled:**

1. **No phone number in correlation data**
   - CBB should always send `{"c":"phone"}`, but gracefully fail if missing
   - Returns `error: 'No contact ID'`

2. **No message found in time window**
   - Message might be >5 minutes old
   - Message might not exist (webhook arrived before message created)
   - Returns `error: 'No matching message found'`

3. **Multiple messages to same phone**
   - Takes most recent (`ORDER BY created_at DESC`)
   - 5-minute window reduces collision risk
   - Still possible if customer gets 2+ messages within 5 minutes

4. **Database errors**
   - Network issues, permission errors, etc.
   - Returns detailed error message for debugging

---

#### `createCorrelationData(orderId, contactId, messageType, tempMessageId)`

**Purpose:** Generate correlation string to send with outbound messages

**Implementation:**

```typescript
createCorrelationData(
  orderId: string,
  contactId: string,
  messageType: string,
  tempMessageId: string
): string {
  // CBB will ignore this, but we send it anyway for logging/debugging
  return `${orderId}:${contactId}:${messageType}:${tempMessageId}`;
}
```

**Note:** CBB ignores this completely and replaces with `{"c":"phone"}`. We still send it for:

- Debugging (appears in CBB dashboard)
- Future CBB updates (they might fix this)
- Documentation (shows original intent)

**Example Output:**

```
"IL251109IN4:972509400505:order_confirmation:temp_IL251109IN4_1699999999"
```

---

## 3. Why 5-Minute Time Window?

**Problem:** Multiple messages to same customer

**Scenario:**

```
09:00:00 - Order IL001 → temp_001 → Send to 972509400505
09:00:30 - Order IL002 → temp_002 → Send to 972509400505
09:00:35 - Webhook arrives for temp_002 with real WAMID
```

**Without time window:**

- Query finds temp_001 (oldest first)
- Correlates temp_001 with temp_002's real WAMID
- **Wrong match!**

**With 5-minute window + DESC order:**

- Query finds temp_002 (most recent within 5 min)
- Correlates temp_002 with correct real WAMID
- ✅ **Correct match!**

**Why 5 minutes?**

- Messages typically send in < 10 seconds
- Webhooks arrive in < 30 seconds
- 5 minutes = safe buffer
- Longer window = higher collision risk

**Collision Risk:**

- Low: Most customers get 1 message per day
- Medium: Order confirmation + visa approval = 2 messages, minutes apart
- Acceptable: 5-minute window handles this well

---

## 4. Database Schema

### `whatsapp_messages` Table

**Key Fields:**

```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR NOT NULL,        -- Temp: 'temp_*', Real: 'wamid.*'
  meta_message_id VARCHAR,            -- Always real WAMID after correlation
  phone_number VARCHAR NOT NULL,      -- E.164 format (no +)
  order_id VARCHAR,                   -- Associated order
  status VARCHAR NOT NULL,            -- pending|queued|sent|delivered|read|failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for correlation
  INDEX idx_whatsapp_messages_phone_created (phone_number, created_at DESC)
    WHERE message_id LIKE 'temp_%',
  INDEX idx_whatsapp_messages_meta_message_id (meta_message_id)
    WHERE meta_message_id IS NOT NULL
);
```

**Lifecycle:**

| Stage       | `message_id`     | `meta_message_id` | `status`    |
| ----------- | ---------------- | ----------------- | ----------- |
| Created     | `temp_IL001_123` | `NULL`            | `pending`   |
| Queued      | `temp_IL001_123` | `NULL`            | `queued`    |
| Sent        | `temp_IL001_123` | `NULL`            | `sent`      |
| Correlation | `wamid.HBg...`   | `wamid.HBg...`    | `sent`      |
| Delivered   | `wamid.HBg...`   | `wamid.HBg...`    | `delivered` |
| Read        | `wamid.HBg...`   | `wamid.HBg...`    | `read`      |

---

## 5. Usage Examples

### Example 1: Normal Flow (Happy Path)

**Step 1: Message Created**

```typescript
// OrdersService creates message
const message = await db.insert({
  message_id: 'temp_IL251109IN4_1699999999',
  phone_number: '972509400505',
  status: 'pending',
  created_at: '2025-11-10T09:00:00Z',
});
```

**Step 2: Message Sent via CBB**

```typescript
// CBB API called, status updated
await db
  .update({ status: 'sent' })
  .where({ message_id: 'temp_IL251109IN4_1699999999' });
```

**Step 3: Webhook Arrives (10 seconds later)**

```json
{
  "statuses": [
    {
      "id": "wamid.HBgMOTcyNTA5NDAwNTA1FQIAERgSNjc0RjM5RUNBNTA1MEJFQTgxAA==",
      "status": "sent",
      "biz_opaque_callback_data": "{\"c\":\"972509400505\"}"
    }
  ]
}
```

**Step 4: Correlation (MessageIdUpdaterService)**

```typescript
// Parse correlation data
const correlationData = messageIdUpdater.parseCorrelationData(
  '{"c":"972509400505"}',
);
// → { contactId: '972509400505' }

// Update message ID
const result = await messageIdUpdater.updateMessageId(
  'temp_IL251109IN4_1699999999', // Ignored (we query by phone)
  'wamid.HBgMOTcyNTA5NDAwNTA1FQIAERgSNjc0RjM5RUNBNTA1MEJFQTgxAA==',
  correlationData,
);
// → { success: true, previousMessageId: 'temp_...', newMessageId: 'wamid...' }
```

**Step 5: Status Update**

```sql
-- Database now has:
message_id: wamid.HBgMOTcyNTA5NDAwNTA1FQIAERgSNjc0RjM5RUNBNTA1MEJFQTgxAA==
meta_message_id: wamid.HBgMOTcyNTA5NDAwNTA1FQIAERgSNjc0RjM5RUNBNTA1MEJFQTgxAA==
status: sent
```

**Step 6: Delivery Webhook (30 seconds later)**

```json
{
  "statuses": [
    {
      "id": "wamid.HBgMOTcyNTA5NDAwNTA1FQIAERgSNjc0RjM5RUNBNTA1MEJFQTgxAA==",
      "status": "delivered"
    }
  ]
}
```

**Step 7: Final Status**

```sql
-- Database updated:
status: delivered
delivered_at: 2025-11-10T09:00:40Z
```

✅ **Success!** Message fully tracked from creation → sent → delivered

---

### Example 2: Race Condition (Status Before Correlation)

**Problem:** Delivery webhook arrives BEFORE sent webhook

**Timeline:**

```
09:00:00 - Message sent (temp_001)
09:00:05 - Delivered webhook arrives (wamid.XXX) ← Too fast!
09:00:10 - Sent webhook arrives (wamid.XXX) ← Should be first!
```

**Webhook Controller Handles This:**

```typescript
// Strategy 1: Try by meta_message_id (after correlation)
let { data, error } = await db.update(updates).eq('meta_message_id', status.id); // wamid.XXX

// Strategy 2: Fallback to message_id if no match (handles temp IDs)
if (!data || data.length === 0) {
  const result = await db.update(updates).eq('message_id', status.id); // Still temp_001? Try again
}
```

**Result:** Status update succeeds even if correlation hasn't completed yet

---

## 6. Error Scenarios & Recovery

### Scenario 1: No Webhook Received

**Symptoms:**

- Message stuck in "sent" status
- `message_id` still has `temp_*` prefix
- `meta_message_id` is `NULL`

**Causes:**

- Network issue between Meta and our backend
- Webhook signature validation failed
- Message actually failed to send

**Recovery:**

```sql
-- Mark old stuck messages as failed
UPDATE whatsapp_messages
SET status = 'failed',
    failed_at = NOW(),
    failure_reason = 'No webhook received - likely failed to send'
WHERE status = 'sent'
  AND message_id LIKE 'temp_%'
  AND created_at < NOW() - INTERVAL '12 hours';
```

---

### Scenario 2: Wrong Phone Number Matched

**Symptoms:**

- Message correlated to wrong order
- Customer A receives message about Customer B's order

**Causes:**

- Two messages to same phone within 5-minute window
- Created_at timestamps very close
- DESC order picked wrong one

**Prevention:**

- Most recent first (DESC) reduces risk
- 5-minute window is narrow
- Rare in practice (customers don't get 2 messages simultaneously)

**Recovery:**

- Manual correction in database
- Future: Add order_id to correlation query if CBB ever supports it

---

### Scenario 3: Database Update Fails

**Symptoms:**

- Webhook received and logged
- No database update
- Message still has temp ID

**Causes:**

- Database connection lost
- Permission error
- Constraint violation

**Recovery:**

```typescript
// MessageIdUpdaterService returns detailed error
const result = await messageIdUpdater.updateMessageId(...);

if (!result.success) {
  this.logger.error(`Correlation failed: ${result.error}`);
  // Retry in background job
  await this.retryQueue.add('correlation-retry', {
    tempId,
    realId,
    correlationData,
    attemptCount: 1
  });
}
```

---

## 7. Testing

### Unit Tests

**Test File:** `message-id-updater.service.spec.ts`

**Key Test Cases:**

#### Parse CBB JSON Format

```typescript
it('should parse CBB correlation data', () => {
  const result = service.parseCorrelationData('{"c":"972509400505"}');

  expect(result).toEqual({ contactId: '972509400505' });
});

it('should return null for invalid JSON', () => {
  const result = service.parseCorrelationData('not-json');

  expect(result).toBeNull();
});
```

#### Update Message ID (Mocked DB)

```typescript
it('should update message ID by phone number', async () => {
  mockSupabase.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        like: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [
                  {
                    message_id: 'temp_001',
                    order_id: 'IL001',
                    phone_number: '972509400505',
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    }),
  });

  const result = await service.updateMessageId('temp_001', 'wamid.XXX', {
    contactId: '972509400505',
  });

  expect(result.success).toBe(true);
  expect(result.newMessageId).toBe('wamid.XXX');
});
```

---

### Integration Tests

**Test with real database:**

```typescript
describe('MessageIdUpdaterService (Integration)', () => {
  beforeEach(async () => {
    // Create test message
    await db.insert('whatsapp_messages', {
      message_id: 'temp_test_123',
      phone_number: '972509400505',
      status: 'sent',
      created_at: new Date(),
    });
  });

  it('should correlate message by phone number', async () => {
    const result = await service.updateMessageId(
      'temp_test_123',
      'wamid.TEST',
      { contactId: '972509400505' },
    );

    expect(result.success).toBe(true);

    // Verify database
    const message = await db.findOne('whatsapp_messages', {
      meta_message_id: 'wamid.TEST',
    });

    expect(message.message_id).toBe('wamid.TEST');
    expect(message.meta_message_id).toBe('wamid.TEST');
  });

  it('should not match messages older than 5 minutes', async () => {
    // Create old message (10 minutes ago)
    await db.insert('whatsapp_messages', {
      message_id: 'temp_old_123',
      phone_number: '972509400505',
      status: 'sent',
      created_at: new Date(Date.now() - 10 * 60 * 1000),
    });

    const result = await service.updateMessageId('temp_old_123', 'wamid.TEST', {
      contactId: '972509400505',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No matching message found');
  });
});
```

---

## 8. Monitoring & Alerting

### Metrics to Track

**Correlation Success Rate:**

```sql
-- Daily correlation stats
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE message_id LIKE 'wamid.%') as correlated,
  COUNT(*) FILTER (WHERE message_id LIKE 'temp_%') as not_correlated,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE message_id LIKE 'wamid.%') / COUNT(*),
    2
  ) as success_rate
FROM whatsapp_messages
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Expected:** >99% success rate (100% post-fix)

**Correlation Delay:**

```sql
-- Time between sent and correlated
SELECT
  AVG(
    EXTRACT(EPOCH FROM (updated_at - created_at))
  ) as avg_delay_seconds,
  MAX(
    EXTRACT(EPOCH FROM (updated_at - created_at))
  ) as max_delay_seconds
FROM whatsapp_messages
WHERE meta_message_id IS NOT NULL
  AND created_at >= NOW() - INTERVAL '24 hours';
```

**Expected:** <30 seconds average, <2 minutes max

---

### Alerts

**Alert 1: Low Correlation Rate**

```
IF (correlation_success_rate < 95% in past 1 hour)
THEN alert("WhatsApp: Correlation failing - check CBB/Meta webhooks")
```

**Alert 2: High Correlation Delay**

```
IF (avg_correlation_delay > 60 seconds)
THEN alert("WhatsApp: Slow correlation - check webhook processing")
```

**Alert 3: Stuck Messages**

```
IF (COUNT messages with temp_ IDs > 5 AND created > 1 hour ago)
THEN alert("WhatsApp: Messages stuck without correlation")
```

---

## 9. Performance Considerations

### Database Query Optimization

**Indexed Query:**

```sql
-- Fast! Uses idx_whatsapp_messages_phone_created
SELECT message_id, order_id
FROM whatsapp_messages
WHERE phone_number = '972509400505'
  AND message_id LIKE 'temp_%'
  AND created_at >= '2025-11-10T09:00:00Z'
ORDER BY created_at DESC
LIMIT 1;
```

**Query Plan:**

```
Index Scan using idx_whatsapp_messages_phone_created
  Index Cond: (phone_number = '972509400505'
               AND created_at >= '2025-11-10T09:00:00Z')
  Filter: message_id LIKE 'temp_%'
  Rows: 1
```

**Performance:** <5ms per query

---

### Concurrency Handling

**Problem:** Multiple webhooks for same message arrive simultaneously

**Solution:** Postgres row-level locking

```sql
-- Update with FOR UPDATE lock
BEGIN;

SELECT * FROM whatsapp_messages
WHERE message_id = 'temp_001'
FOR UPDATE;  -- Locks this row

UPDATE whatsapp_messages
SET message_id = 'wamid.XXX',
    meta_message_id = 'wamid.XXX'
WHERE message_id = 'temp_001';

COMMIT;
```

**Result:** Only one webhook wins, others see already-updated record

---

## 10. Recent Changes

**2025-11-10: Phone-Based Correlation System**

- **Change:** Complete rewrite of correlation logic
- **Reason:** CBB returns `{"c":"phone"}` instead of custom correlation data
- **Impact:** 100% correlation success (was 0% before)
- **Approach:** Phone number + 5-minute time window
- **Files:** `message-id-updater.service.ts`, `whatsapp-webhook.controller.ts`

**2025-11-10: Removed Legacy Code**

- Deleted delimited format parsing (`orderId:contactId:messageType:tempId`)
- Simplified to single code path (CBB JSON only)
- No backward compatibility needed (CBB always used JSON)

**2025-09-28: Initial Implementation**

- Created MessageIdUpdaterService
- Implemented delimited format parsing (later removed)
- Basic correlation logic

---

**Last Updated:** 2025-11-10
