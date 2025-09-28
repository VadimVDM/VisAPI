# Airtable Integration Module

Real-time order data lookup with intelligent phone number retry logic.

## Overview

Searches Visanet's Airtable base by email, order ID, or phone number, returning key order details for verification (ID, Status, Email, Phone).

## API Endpoint

```
POST /api/v1/airtable/lookup
```

### Request
```json
{
  "field": "orderid" | "email" | "phone",
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
    "fields": {
      "ID": "IL250928IN7",
      "Status": "Active 🔵",
      "Email": "customer@example.com",
      "Phone": "972507921512"
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

| API Field | Airtable Field | Description |
|-----------|---------------|-------------|
| `orderid` | `ID` | Order identifier (IL250928IN7) |
| `email` | `Email` | Customer email address |
| `phone` | `Phone` | Phone number without + prefix (972507921512) |

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

---

**Version**: 1.0.0 | **Updated**: September 28, 2025