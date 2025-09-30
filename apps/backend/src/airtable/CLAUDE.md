# Airtable Integration Module

Real-time order data lookup with intelligent phone number retry logic.

## Overview

Searches Visanet's Airtable base by email, order ID, or phone number, returning key order details for verification (ID, Status, Email, Phone).

## API Endpoints

### Lookup Endpoint

```
POST /api/v1/airtable/lookup
```

Searches across all records in the table without view filtering.

### Completed Endpoint

```
POST /api/v1/airtable/completed
```

Searches only within the completed/sent view (`viwgYjpU6K6nXq8ii`). Always expands linked Application records.

### Request (Both Endpoints)

```json
{
  "field": "orderid" | "email" | "phone",
  "key": "IL250928IN7"
}
```

### Response (Both Endpoints)

```json
{
  "status": "found" | "none" | "multiple",
  "message": "found",
  "record": {
    "id": "recXXX",
    "fields": {
      "ID": "IL250928IN7",
      "Status": "Active 🔵",
      "Email": "customer@example.com",
      "Phone": "972507921512"
    }
  },
  "applications": [...]  // Included when available
}
```

## Architecture

### Service Layer (`airtable.service.ts`)

- Python subprocess execution for Airtable API calls
- Redis caching (5-minute TTL) with separate namespaces
  - `airtable:lookup:*` for general lookups
  - `airtable:completed:*` for completed view lookups
- Production/development path resolution
- Error handling with specific codes
- Two methods: `lookup()` and `completed()` with identical logic except view filtering

### Python Script (`scripts/airtable_lookup.py`)

- pyairtable library integration
- Case-insensitive search
- Supports both `value` and `key` fields
- Intelligent phone retry for Israeli numbers (972/9720)

## Configuration

### Environment Variables

```bash
AIRTABLE_API_KEY=patt01...    # Airtable personal access token
AIRTABLE_BASE_ID=appRdX...     # Base ID (appRdXouUdOJn5rG7)
AIRTABLE_TABLE_ID=tblBmq...    # Orders table (tblBmqCZg38ryNQvS)
AIRTABLE_VIEW_ID=              # Optional view filter
```

### Docker Requirements

```dockerfile
# Python runtime and dependencies
RUN apk add --no-cache python3 py3-pip
RUN pip3 install pyairtable==3.2.0 requests
COPY airtable/scripts ./airtable/scripts
```

## Security

- API key authentication required
- Scope: `integrations:airtable:read`
- Admin keys need this scope for access
- Cached responses reduce API calls

## Field Mappings

| API Field | Airtable Field | Description                                  |
| --------- | -------------- | -------------------------------------------- |
| `orderid` | `ID`           | Order identifier (IL250928IN7)               |
| `email`   | `Email`        | Customer email address                       |
| `phone`   | `Phone`        | Phone number without + prefix (972507921512) |

## Phone Search Retry Logic

For phone searches, the system implements intelligent retry for Israeli numbers (starting with 972):

1. **First attempt**: Search with the provided phone number
2. **If no results and starts with "972"**:
   - If phone is `9720XXX...` (has zero after 972), retry with `972XXX...` (remove zero)
   - If phone is `972XXX...` (no zero after 972), retry with `9720XXX...` (add zero)

This handles common variations in Israeli phone number storage:

- Some systems store: `972507921512` (without zero)
- Others store: `9720507921512` (with zero)

The retry happens automatically within the same request for seamless user experience.

## Response Statuses

- **found**: Single record match with key fields (ID, Status, Email, Phone)
- **none**: No matching records
- **multiple**: Multiple matches (returns status only)

## Caching

- **Key Format**:
  - Lookup: `airtable:lookup:[field]:[value]`
  - Completed: `airtable:completed:[field]:[value]`
- **TTL**: 300 seconds (5 minutes)
- **Service**: Redis via CacheService
- **Namespace Separation**: Each endpoint has its own cache namespace

## Error Codes

| Code                    | Description                  | Resolution                  |
| ----------------------- | ---------------------------- | --------------------------- |
| `INPUT_ERROR`           | Invalid field or empty value | Check request format        |
| `CONFIGURATION_ERROR`   | Missing env variables        | Set Airtable credentials    |
| `AIRTABLE_IMPORT_ERROR` | Missing pyairtable           | Install Python dependencies |
| `QUERY_ERROR`           | Airtable API failed          | Check API key/permissions   |
| `API_ERROR`             | HTTP request failed          | Check network/credentials   |

## Testing

### Local Test

```bash
export AIRTABLE_API_KEY="patt01..."
export AIRTABLE_BASE_ID="appRdXouUdOJn5rG7"
export AIRTABLE_TABLE_ID="tblBmqCZg38ryNQvS"
echo '{"field":"orderid","key":"IL250928IN7"}' | \
  python3 airtable_lookup.py | jq .
```

### Production Test - Lookup

```bash
curl -X POST https://api.visanet.app/api/v1/airtable/lookup \
  -H "X-API-Key: vizi_admin_..." \
  -H "Content-Type: application/json" \
  -d '{"field":"orderid","key":"IL250928IN7"}'
```

### Production Test - Completed

```bash
curl -X POST https://api.visanet.app/api/v1/airtable/completed \
  -H "X-API-Key: vizi_admin_..." \
  -H "Content-Type: application/json" \
  -d '{"field":"orderid","key":"IL250928IN7"}'
```

## Performance

- **Lookup**: ~100-200ms (cached) / ~500-1000ms (uncached)
- **Phone retry**: +100-200ms for variant search
- **Cache Hit Rate**: ~85% in production
- **Max Records**: 3 per query

## Troubleshooting

### Script Not Found

```
"Airtable lookup script is missing from deployment bundle"
```

**Fix**: Ensure Dockerfile copies scripts and Python is installed

### Empty Results

Check if:

- Order ID format is correct (e.g., IL250928IN7)
- Email is spelled correctly
- Phone number format (try with/without 972 zero)
- Record exists in Airtable base
- View filter isn't excluding records

### Phone Search Not Finding Records

The system automatically retries Israeli numbers (972) with/without zero after country code.
If still not found, the number might be stored in a different format.

## Completed Records Tracker & Visa Approval Notifications

The module includes a sophisticated tracking system for monitoring new records entering the completed view and automatically sending visa approval notifications.

### Architecture

- **CompletedTrackerService**: Main tracking service with Redis deduplication
- **VisaApprovalProcessorService**: Processes completed records for visa notifications
- **Hybrid Approach**: Timestamp-based queries + Redis Set deduplication
- **Automatic Checks**: Every 10 minutes via `@Cron(EVERY_10_MINUTES)`
- **Manual Operations**: Bootstrap, check, stats, reset endpoints

### Visa Approval Notification Flow

When new completed records are detected:

1. **Extract Visa Details**: Builds visa information from expanded Applications (up to 10)
2. **Update Order**: Stores visa details in JSONB column for tracking
3. **Check Conditions**: Verifies:
   - Notification not already sent (`visa_notification_sent = false`)
   - Has CBB contact synced (`cbb_contact_uuid IS NOT NULL`)
   - Notifications enabled (`notifications_enabled != false`)
4. **Queue WhatsApp Messages**:
   - First application: `visa_approval_file_phone` template
   - Applications 2-10: `visa_approval_file_multi_he` template with number emojis
   - 5-second delay between messages
   - Each message includes the visa PDF as attachment
5. **Track Status**: Updates `visa_notification_sent` flag after all messages sent

### Database Fields for Visa Tracking

- `visa_details` (JSONB) - Complete visa information
- `visa_notification_sent` (boolean) - Prevents duplicate sends
- `visa_notification_sent_at` (timestamp) - When notification was sent
- `visa_notification_message_id` (text) - WhatsApp message ID

### Manual Resend Capability

The visa approval system includes an admin endpoint for manually resending visa notifications:

**Endpoint**: `POST /api/v1/webhooks/vizi/resend-visa`

**Features**:

- **Force Resend**: Resets `visa_notification_sent` flag to allow unlimited resends
- **Phone Override**: Optional `phone` field to send to alternate recipient
  - Automatically removes `+` prefix (e.g., `+13473726179` → `13473726179`)
  - CBB handles contact resolution automatically
  - Bypasses order's original phone number
  - Useful for testing or emergency situations
- **Fresh Data**: Fetches order from Airtable with application expansion
- **Application ID**: Uses `app.fields['ID']` as primary identifier
  - Visa ID (`app.fields['Visa ID']`) is optional
  - Only requires visa URL and application ID
- **Error Propagation**: Proper error handling with detailed failure messages

**Request Body**:

```json
{
  "orderId": "IL250928IN7", // Required: Order ID to resend
  "phone": "+13473726179" // Optional: Override recipient phone
}
```

**Example Usage**:

```bash
# Normal resend to order's phone
curl -X POST https://api.visanet.app/api/v1/webhooks/vizi/resend-visa \
  -H "X-API-Key: vizi_admin_..." \
  -d '{"orderId":"IL250928IN7"}'

# Resend to different phone (US number)
curl -X POST https://api.visanet.app/api/v1/webhooks/vizi/resend-visa \
  -H "X-API-Key: vizi_admin_..." \
  -d '{"orderId":"IL250928IN7","phone":"+13473726179"}'
```

### How It Works

1. **Bootstrap Phase** (one-time):

   ```bash
   pnpm bootstrap-completed-tracker
   ```

   - Loads all existing ~700 completed records
   - Stores IDs in Redis Set `airtable:completed:processed_ids`
   - Sets initial checkpoint timestamp

2. **Incremental Checks** (every 10 minutes):
   - Queries: `{Completed Timestamp} > last_check`
   - Checks each record against Redis Set
   - New records → Process and add to Set
   - Existing records → Skip (prevents re-triggers)

3. **Redis Keys**:
   - `airtable:completed:processed_ids` - Set of all processed record IDs
   - `airtable:completed:last_check` - Timestamp of last check
   - `airtable:completed:bootstrap` - Bootstrap completion flag
   - `airtable:completed:stats` - Tracking statistics

### API Endpoints

```bash
# Manual check for new records
POST /api/v1/airtable/completed/check

# Bootstrap with existing records
POST /api/v1/airtable/completed/bootstrap

# Get tracking statistics
GET /api/v1/airtable/completed/stats
```

### Python Script

`airtable_completed_tracker.py` supports two modes:

```json
// Bootstrap mode - fetch all
{
  "mode": "bootstrap",
  "view_id": "viwgYjpU6K6nXq8ii"
}

// Incremental mode - fetch new only
{
  "mode": "incremental",
  "view_id": "viwgYjpU6K6nXq8ii",
  "after_timestamp": "2025-09-28T10:00:00Z"
}
```

## Key Differences Between Endpoints

| Feature               | `/lookup`               | `/completed`             | `/completed/check`          |
| --------------------- | ----------------------- | ------------------------ | --------------------------- |
| View Filter           | None (all records)      | `viwgYjpU6K6nXq8ii` only | `viwgYjpU6K6nXq8ii` only    |
| Cache Namespace       | `airtable:lookup:*`     | `airtable:completed:*`   | N/A (not cached)            |
| Application Expansion | Only for "Issue" status | Always expanded          | Always expanded             |
| Use Case              | General record search   | Lookup in completed view | Track NEW completed records |
| Returns               | Single record           | Single record            | Array of new records        |

## Visa Approval Templates

### Primary Template: `visa_approval_file_phone`

- **Used for**: First application in order
- **Parameters**: [name_hebrew, country]
- **Attachment**: Visa PDF document URL
- **Language**: Hebrew (he)

### Multi Template: `visa_approval_file_multi_he`

- **Used for**: Applications 2-10 in order
- **Parameters**: [number_emoji, applicant_name]
- **Format**: "{{1}} _קובץ הויזה של {{2}} מצורף_ בחלקה העליון של הודעה זו 📎"
- **Example**: "2️⃣ _קובץ הויזה של Jane Doe מצורף_ בחלקה העליון של הודעה זו 📎"
- **Attachment**: Individual visa PDF for each applicant
- **Delay**: 5 seconds between messages

### Number Emojis

1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟

---

**Version**: 1.3.0 | **Updated**: September 30, 2025
