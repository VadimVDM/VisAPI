# CBB (Click2Bot) Integration Library

**[Level 3 Doc]** Click2Bot API client for sending WhatsApp template messages with Hebrew translation and contact management

**Parent:** `apps/backend/CLAUDE.md` | **Related:** `apps/backend/src/webhooks/whatsapp/`

---

## 1. Purpose & Responsibilities

Handles all **outbound WhatsApp messaging** via Click2Bot (CBB) API:

- **Template Messaging:** Send WhatsApp Business templates (order confirmations, visa approvals, etc.)
- **Contact Management:** Sync customer data to CBB contacts
- **Hebrew Translation:** Built-in field mapping for Hebrew-speaking customers
- **Correlation Data:** Attach metadata for message tracking (though CBB returns only phone numbers)

**Critical Note:** CBB is **send-only** in our architecture. We receive webhook events directly from Meta WABA, not from CBB.

---

## 2. Architecture

```
libs/backend/core-cbb/
├── src/
│   └── lib/
│       ├── cbb-client.service.ts         # Main CBB API client
│       ├── contact-resolver.service.ts   # Phone number resolution
│       ├── template.service.ts           # Template builders
│       ├── whatsapp.processor.ts         # Queue processor
│       └── cbb.module.ts                 # NestJS module
└── CLAUDE.md (this file)

Integration Flow:

┌─────────────────┐
│ OrdersService   │
│   or other      │──① Create order/event
│   services      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ WhatsAppService │──② Prepare template data
│  (backend-core- │     + correlation metadata
│   whatsapp)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CBB Client     │──③ POST to CBB API
│  Service        │     with X-ACCESS-TOKEN
│  (this library) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   CBB API       │──④ Sends to WhatsApp
│ (Click2Bot SaaS)│     (returns temp ID)
└────────┬────────┘
         │
         ⑤ Message delivered
         │
         ▼
┌─────────────────┐
│  Meta WABA      │──⑥ Webhook to our backend
│  (WhatsApp)     │     with real WAMID
└─────────────────┘
```

**Why CBB?**

- Template approval and management
- Hebrew translation support (built-in field mapping)
- Contact deduplication
- Message history dashboard

---

## 3. Core Services

### CbbClientService (`cbb-client.service.ts`)

**Responsibilities:**

- CBB API HTTP client with retry logic
- Contact CRUD operations
- Template message sending
- Error handling and logging

**Key Methods:**

#### `sendWhatsAppTemplate(contactId, templateName, languageCode, parameters, correlationData?)`

**Purpose:** Send WhatsApp Business template message

**Parameters:**

- `contactId` - Phone number in E.164 format (e.g., `'972509400505'`)
- `templateName` - Approved template name (e.g., `'order_confirmation_global'`)
- `languageCode` - Template language (`'he'` for Hebrew, `'en'` for English)
- `parameters` - Array of template variable values (strings)
- `correlationData` - Optional tracking metadata (CBB ignores this - see § 6)

**Example:**

```typescript
await cbbClient.sendWhatsAppTemplate(
  '972509400505',
  'order_confirmation_global',
  'he',
  ['John Doe', 'Israel', '🇮🇱', 'IL251109IN4', 'Tourism', '1', '150', '3'],
  'IL251109IN4:uuid:order_confirmation:temp_123', // Ignored by CBB!
);
```

**Returns:**

```typescript
{
  success: true,
  messageId: 'temp_IL251109IN4_order_confirmation_1699999999',
  timestamp: '2025-11-10T12:34:56.789Z'
}
```

---

#### `createContactWithFields(contactData)`

**Purpose:** Create or update CBB contact with custom fields

**Parameters:**

```typescript
interface ContactData {
  id: string; // Phone number (E.164)
  phone: string; // Same as id
  name?: string;
  email?: string;
  cufs?: {
    // Custom Fields
    customer_name?: string;
    visa_country?: string;
    OrderNumber?: string;
    order_days?: string;
    [key: string]: string;
  };
}
```

**Example:**

```typescript
await cbbClient.createContactWithFields({
  id: '972509400505',
  phone: '972509400505',
  name: 'John Doe',
  email: 'john@example.com',
  cufs: {
    customer_name: 'ישראל ישראלי',
    visa_country: 'בריטניה',
    OrderNumber: 'IL251109IN4',
    order_days: '3',
  },
});
```

**Custom Field Mapping:**

All CBB custom fields are managed through the **Field Registry** with stable field IDs.

**See:** `libs/backend/core-cbb/src/lib/CLAUDE-FIELD-REGISTRY.md` for complete field list (22 fields)

**Key Fields:**

- `visa_validity` (ID: 816014) - Visa document validity
- `order_days` (ID: 271948) - Processing time in days
- `customer_name` (ID: 779770) - Customer full name
- `OrderNumber` (ID: 459752) - Vizi order ID

**Note:** CBB uses phone number for deduplication. Subsequent calls update the existing contact.

---

#### `sendOrderConfirmation(contactId, templateParams, correlationData?)`

**Purpose:** Convenience method for sending order confirmation template

**Parameters:**

```typescript
interface OrderConfirmationParams {
  customerName: string; // {{1}}
  country: string; // {{2}}
  countryFlag: string; // {{3}} (emoji)
  orderNumber: string; // {{4}}
  visaType: string; // {{5}}
  applicantCount: string; // {{6}}
  paymentAmount: string; // {{7}}
  processingDays: string; // {{8}}
}
```

**Example:**

```typescript
await cbbClient.sendOrderConfirmation(
  '972509400505',
  {
    customerName: 'ישראל ישראלי',
    country: 'בריטניה',
    countryFlag: '🇬🇧',
    orderNumber: 'IL251109IN4',
    visaType: 'תיירות שנה',
    applicantCount: '2',
    paymentAmount: '150',
    processingDays: '3',
  },
  'IL251109IN4:uuid:order_confirmation:temp_123',
);
```

---

### ContactResolverService (`contact-resolver.service.ts`)

**Responsibilities:**

- Phone number normalization
- E.164 format validation
- Leading zero removal (critical!)

**Key Methods:**

#### `resolvePhone(phoneInput)` → E.164 string

**Purpose:** Normalize phone number to E.164 format

**Examples:**

```typescript
resolvePhone('972 050-940-0505'); // → '972509400505'
resolvePhone('+972-50-940-0505'); // → '972509400505'
resolvePhone('9720509400505'); // → '972509400505' (removes leading 0)
resolvePhone('0509400505'); // ❌ Error: no country code
```

**Leading Zero Removal:**

```typescript
// BAD: Phone with leading zero after country code
'9720507247157'; // Creates duplicate contact!

// GOOD: Properly normalized
'972507247157';
```

**Why this matters:**

- CBB deduplicates contacts by phone number
- `9720507247157` and `972507247157` create **two separate contacts**
- Message correlation fails if phone numbers don't match exactly

---

### TemplateService (`template.service.ts`)

**Responsibilities:**

- Template parameter builders
- Parameter validation
- Template format helpers

**Available Templates:**

1. **`order_confirmation_global`** (Hebrew)
   - 8 parameters: name, country, flag, orderNum, visaType, count, amount, days
2. **`visa_approval_file_phone`** (Hebrew)
   - Sends visa file attachment + applicant details
3. **`visa_approval_file_multi_he`** (Hebrew)
   - Multi-applicant visa approval (2nd-10th applicant)

---

## 4. Template System

### WhatsApp Business Template Format

**Structure:**

```json
{
  "messages": [
    {
      "messaging_product": "whatsapp",
      "recipient_type": "individual",
      "to": "972509400505",
      "type": "template",
      "template": {
        "name": "order_confirmation_global",
        "language": { "code": "he" },
        "components": [
          {
            "type": "body",
            "parameters": [
              { "type": "text", "text": "Customer Name" },
              { "type": "text", "text": "Country" },
              { "type": "text", "text": "🇬🇧" },
              { "type": "text", "text": "ORD-123" },
              { "type": "text", "text": "Visa Type" },
              { "type": "text", "text": "2" },
              { "type": "text", "text": "99" },
              { "type": "text", "text": "3" }
            ]
          }
        ]
      }
    }
  ]
}
```

### Template Parameters (Index-Based)

**WhatsApp uses 1-based indexing:**

- `{{1}}` = First parameter
- `{{2}}` = Second parameter
- etc.

**Code mapping:**

```typescript
const parameters = [
  customerName, // {{1}}
  country, // {{2}}
  countryFlag, // {{3}}
  orderNumber, // {{4}}
  visaType, // {{5}}
  applicantCount, // {{6}}
  paymentAmount, // {{7}}
  processingDays, // {{8}}
];
```

---

## 5. API Integration

### Authentication

**Method:** Custom header `X-ACCESS-TOKEN` (NOT Bearer token!)

```typescript
const headers = {
  'Content-Type': 'application/json',
  'X-ACCESS-TOKEN': process.env.CBB_ACCESS_TOKEN,
};
```

**Environment Variables:**

```bash
CBB_API_URL=https://cbb-api.click2bot.co
CBB_ACCESS_TOKEN=your_access_token_here
```

---

### API Endpoints

#### `POST /api/v1/messages/template`

**Request:**

```json
{
  "phone": "972509400505",
  "templateName": "order_confirmation_global",
  "languageCode": "he",
  "parameters": ["John", "Israel", "🇮🇱", "ORD123", "Tourism", "1", "150", "3"],
  "biz_opaque_callback_data": "tracking_data_here"
}
```

**Response:**

```json
{
  "success": true,
  "messageId": "temp_ORD123_order_confirmation_1699999999",
  "timestamp": "2025-11-10T12:34:56Z"
}
```

#### `POST /api/v1/contacts/sync`

**Request:**

```json
{
  "id": "972509400505",
  "phone": "972509400505",
  "name": "John Doe",
  "email": "john@example.com",
  "cufs": {
    "customer_name": "ישראל ישראלי",
    "visa_country": "בריטניה",
    "OrderNumber": "IL251109IN4"
  }
}
```

**Response:**

```json
{
  "success": true,
  "contactId": "972509400505",
  "created": false // false = updated existing
}
```

---

## 6. Correlation Data Issue (Critical Discovery)

### The Problem

**What we send to CBB:**

```typescript
biz_opaque_callback_data: 'IL251109IN4:uuid:order_confirmation:temp_123';
```

**What CBB returns in webhooks:**

```json
{
  "biz_opaque_callback_data": "{\"c\":\"972509400505\"}"
}
```

**Root Cause:**

- CBB **ignores** our custom correlation string entirely
- CBB **replaces** it with JSON containing only phone number: `{"c":"phone"}`
- This breaks our original correlation system that relied on order IDs

**Impact (Pre-Fix):**

- 1,209 messages stuck in "sent" status
- Zero correlation between temp IDs and real Meta WAMIDs
- No delivery/read tracking

---

### The Solution (Nov 10, 2025)

**Strategy:** Phone-based correlation with time windows

**Implementation:** See `apps/backend/src/webhooks/whatsapp/CLAUDE.md` § 6

**Key Changes:**

1. **Accept CBB's limitation** - Can't change how CBB works
2. **Parse `{"c":"phone"}` format** - Updated correlation parser
3. **Match by phone + timestamp** - 5-minute time window
4. **Take most recent** - If multiple matches, newest wins

**Result:** 100% correlation success rate for new messages

**Recommendation:** Still include correlation data in API calls for future CBB updates, but don't rely on it for tracking.

---

## 7. Phone Number Normalization

### E.164 Format (Required by CBB)

**Format:** `[country code][subscriber number]` (no +, spaces, dashes)

**Valid Examples:**

- ✅ `972509400505` (Israel)
- ✅ `972525773080` (Israel)
- ✅ `12025551234` (US)

**Invalid Examples:**

- ❌ `+972509400505` (has + prefix)
- ❌ `972 50-940-0505` (has spaces/dashes)
- ❌ `0509400505` (missing country code)
- ❌ `9720509400505` (leading zero after country code)

### Leading Zero Removal (Critical)

**Problem:** Airtable data may have leading zeros after country code

**Example:**

```
Airtable:     972 050-7247157
Parse naive:  9720507247157     ❌ Wrong! Extra 0
Correct:      972507247157      ✅ Right!
```

**Solution in `ContactResolverService`:**

```typescript
function normalizePhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');

  // Remove leading zero after Israeli country code
  if (digitsOnly.startsWith('9720')) {
    return '972' + digitsOnly.slice(4); // Skip '9720', take rest
  }

  return digitsOnly;
}
```

**Why it matters:**

- `9720507247157` vs `972507247157` = **duplicate contacts in CBB**
- Correlation fails if phone numbers don't match exactly
- Customer receives duplicate messages

---

## 8. Error Handling

### Common Errors

| Error                 | Cause                        | Solution                                   |
| --------------------- | ---------------------------- | ------------------------------------------ |
| `TEMPLATE_NOT_FOUND`  | Template not approved in CBB | Check template status in CBB dashboard     |
| `INVALID_PHONE`       | Phone format wrong           | Ensure E.164 format (no +, spaces)         |
| `RATE_LIMIT_EXCEEDED` | Too many requests            | Implement backoff, use queue               |
| `UNAUTHORIZED`        | Invalid access token         | Check `CBB_ACCESS_TOKEN` env var           |
| `PARAMETER_MISMATCH`  | Wrong number of params       | Template has N placeholders, send N values |

### Retry Logic

```typescript
async sendWithRetry(params: SendParams, maxRetries = 3): Promise<Result> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.send(params);
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      this.logger.warn(`Retry ${attempt}/${maxRetries}`);
    }
  }
}
```

---

## 9. Testing

### Unit Tests

**Mock CBB responses:**

```typescript
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({
    data: {
      success: true,
      messageId: 'temp_test_123',
    },
  }),
}));
```

**Test files:**

- `cbb-client.service.spec.ts` - API client tests
- `contact-resolver.service.spec.ts` - Phone normalization
- `template.service.spec.ts` - Template builders

### Integration Tests

**Test with CBB staging:**

```bash
CBB_API_URL=https://cbb-staging.click2bot.co
CBB_ACCESS_TOKEN=staging_token
```

**Verify:**

- ✅ Message sent to test number
- ✅ Contact created/updated
- ✅ Webhook received (via Meta WABA)
- ✅ Message correlated correctly

---

## 10. Performance & Rate Limits

### CBB API Limits

- **Messages:** 100/second per WhatsApp Business Account
- **Contacts:** 1,000 syncs/minute
- **Retry:** 3 attempts with exponential backoff

### Our Implementation

**Queue-based processing:**

```typescript
// Queue: whatsapp-messages (BullMQ)
// Concurrency: 10 workers
// Retry: 3 attempts
// Delay: 1s, 2s, 4s (exponential backoff)
```

**Batch operations:**

```typescript
// Good: Parallel with queue
await Promise.all(
  orders.map((order) =>
    this.queueService.add('whatsapp-messages', {
      phone: order.phone,
      templateName: 'order_confirmation_global',
      parameters: buildParams(order),
    }),
  ),
);
```

---

## 11. Monitoring

### Key Metrics

**Message Success Rate:**

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as sent,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'delivered') / COUNT(*), 2) as rate
FROM whatsapp_messages
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Expected:** >95% delivery rate

**CBB API Errors:**

```sql
SELECT
  failure_reason,
  COUNT(*) as count
FROM whatsapp_messages
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY failure_reason
ORDER BY count DESC;
```

---

## 12. Security

### API Token

**Storage:**

- Railway environment variables (production)
- Never in git or logs
- Rotated quarterly

**Access:**

- Backend services only
- Frontend never calls CBB directly
- All messages via backend queue

### Data Privacy

**PII in messages:**

- ✅ Customer names (minimal, required)
- ✅ Phone numbers (required for delivery)
- ❌ Passport numbers (never in templates)
- ❌ Email addresses (use CBB contacts only)

---

## 13. Recent Changes

**2025-11-10: Correlation Issue Fixed**

- **Discovery:** CBB returns `{"c":"phone"}` instead of our correlation data
- **Fix:** Phone-based correlation with 5-minute window
- **Result:** 100% correlation success for new messages
- **Files changed:** webhook controller, message-id-updater service

**2025-09-28: Hebrew Translation**

- Added Hebrew custom field mapping
- Contact sync includes Hebrew order data
- Templates support RTL text

**2025-08-25: Initial CBB Integration**

- Replaced direct Meta WABA with CBB
- Template messaging via CBB API
- Contact management system

---

## 14. Related Documentation

- **WhatsApp Webhook Module:** `apps/backend/src/webhooks/whatsapp/CLAUDE.md`
- **Message ID Updater:** `libs/backend/src/lib/services/CLAUDE.md`
- **CBB API Docs:** Contact CBB support
- **Meta WABA Limits:** https://developers.facebook.com/docs/whatsapp/api/rate-limits

---

**API URL:** https://cbb-api.click2bot.co • **Status:** Production (100% send success) • **Last Updated:** 2025-11-10
