# Airtable Integration Module

Real-time order data lookup with automatic linked record expansion.

## Overview

Searches Visanet's Airtable base by email or order ID, returning complete order details with expanded linked records (Applications, Applicants, Transactions).

## API Endpoint

```
POST /api/v1/airtable/lookup
```

### Request
```json
{
  "field": "orderid" | "email",
  "key": "IL250928IN7"
}
```

### Response
```json
{
  "status": "found" | "none" | "multiple",
  "message": "found",
  "record": {
    "id": "recXXX",
    "fields": { /* All order fields */ },
    "expanded": {
      "Applications_expanded": [ /* Full application records */ ],
      "Applicants_expanded": [ /* Full applicant records */ ],
      "Transactions_expanded": [ /* Full transaction records */ ]
    }
  }
}
```

## Architecture

### Service Layer (`airtable.service.ts`)
- Python subprocess execution for Airtable API calls
- Redis caching (5-minute TTL)
- Production/development path resolution
- Error handling with specific codes

### Python Script (`scripts/airtable_lookup.py`)
- pyairtable library integration
- Automatic linked record expansion
- Case-insensitive search
- Supports both `value` and `key` fields

### Linked Tables
```typescript
const LINKED_TABLES = {
  "Applications ↗": "tbl5llU1H1vvOJV34",
  "Applicants ↗": "tblG55wVI8OPM9nr6",
  "Transactions ↗": "tblremNCbcR0kUIDF"
}
```

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

| API Field | Airtable Field | Description |
|-----------|---------------|-------------|
| `orderid` | `ID` | Order identifier (IL250928IN7) |
| `email` | `Email` | Customer email address |

## Response Statuses

- **found**: Single record match with expanded data
- **none**: No matching records
- **multiple**: Multiple matches (no expansion)

## Caching

- **Key Format**: `airtable:lookup:[field]:[value]`
- **TTL**: 300 seconds (5 minutes)
- **Service**: Redis via CacheService

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `INPUT_ERROR` | Invalid field or empty value | Check request format |
| `CONFIGURATION_ERROR` | Missing env variables | Set Airtable credentials |
| `AIRTABLE_IMPORT_ERROR` | Missing pyairtable | Install Python dependencies |
| `QUERY_ERROR` | Airtable API failed | Check API key/permissions |
| `API_ERROR` | HTTP request failed | Check network/credentials |

## Testing

### Local Test
```bash
export AIRTABLE_API_KEY="patt01..."
export AIRTABLE_BASE_ID="appRdXouUdOJn5rG7"
export AIRTABLE_TABLE_ID="tblBmqCZg38ryNQvS"
echo '{"field":"orderid","key":"IL250928IN7"}' | \
  python3 airtable_lookup.py | jq .
```

### Production Test
```bash
curl -X POST https://api.visanet.app/api/v1/airtable/lookup \
  -H "X-API-Key: vizi_admin_..." \
  -H "Content-Type: application/json" \
  -d '{"field":"orderid","key":"IL250928IN7"}'
```

## Linked Record Expansion

When a single record is found, automatically fetches:

### Applications
- Full visa application details including all applicant data
- Assigned agent information
- Processing status and dates
- Personal info (names, birth date, nationality)
- Passport details (number, issue/expiry dates)
- Photo URLs (passport & face)
- Fix URL for admin corrections

### Transactions
- Payment amount and currency
- Transaction status
- Stripe payment ID
- Net amount after fees

**Note**: Applicants table is not separately expanded as Applications contains all relevant applicant data.

## Performance

- **Lookup**: ~100-200ms (cached) / ~500-1000ms (uncached)
- **Expansion**: +2-3 seconds for linked records
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
- Record exists in Airtable base
- View filter isn't excluding records

### No Expansion
Expansion only occurs when exactly 1 record matches

---

**Version**: 1.0.0 | **Updated**: September 28, 2025