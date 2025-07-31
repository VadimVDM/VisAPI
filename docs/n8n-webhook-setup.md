# n8n Webhook Setup Guide

This guide explains how to set up and use the n8n webhook endpoint for receiving visa order data.

## Overview

The n8n webhook endpoint allows n8n.visanet.app to send visa order data to VisAPI. The data is stored in the database and can trigger automated workflows.

**Endpoint:** `POST /api/v1/webhooks/n8n/orders`

## Database Schema

The webhook stores data in the following tables:
- `orders` - Main order information
- `applicants` - Individual applicant details
- `form_metadata` - Form and product information
- `webhook_logs` - Request logging for debugging

## API Key Setup

### Step 1: Generate API Key Values

```bash
node tools/scripts/generate-api-key-values.js
```

This will output:
- Full API key (e.g., `n8n_xxx.yyy`)
- SQL insert statement

### Step 2: Insert API Key in Supabase

1. Copy the SQL insert statement from the script output
2. Go to your Supabase dashboard
3. Navigate to SQL Editor
4. Paste and run the SQL statement
5. Save the full API key securely

### Step 3: Configure n8n

In your n8n webhook node, configure:
- **URL:** `https://api.visanet.app/api/v1/webhooks/n8n/orders`
- **Method:** POST
- **Headers:**
  - `X-API-Key`: Your full API key (e.g., `n8n_xxx.yyy`)
  - `Content-Type`: `application/json`

## Testing

### Local Testing

```bash
# Start the backend locally
pnpm dev:backend

# Test with the provided script
node tools/scripts/test-n8n-webhook.js YOUR_API_KEY

# Or test with curl
curl -X POST http://localhost:3000/api/v1/webhooks/n8n/orders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d @tools/scripts/sample-order.json
```

### Production Testing

```bash
# Test against production
curl -X POST https://api.visanet.app/api/v1/webhooks/n8n/orders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"form": {...}, "order": {...}}'
```

## Supported Visa Types

The webhook handles multiple visa types with different data structures:

1. **Israeli visa to Russia** - Basic structure with passport, address, occupation
2. **Israeli visa to India** - Includes military service, national ID, business info
3. **Korean K-ETA** - Includes last travel, city of birth, stay address

## Data Structure

The webhook expects the following JSON structure (fields may vary by visa type):

```json
{
  "form": {
    "_id": "string",
    "id": "string",
    "applicants": [{
      "id": "string",
      "passport": {
        "nationality": "string",
        "firstName": "string",
        "lastName": "string",
        "sex": "string",
        "dateOfBirth": "YYYY-MM-DD",
        "countryOfBirth": "string",
        "number": "string",
        "dateOfIssue": "YYYY-MM-DD",
        "dateOfExpiry": "YYYY-MM-DD"
      },
      "pastVisit": {
        "visited": boolean,
        "year": "string"
      },
      "address": {
        "line": "string",
        "city": "string",
        "country": "string"
      },
      "occupation": {
        "education": "string",
        "status": "string",
        "name": "string",
        "seniority": "string",
        "phone": {
          "code": "string",
          "number": "string"
        },
        "address": {
          "line": "string",
          "city": "string",
          "country": "string"
        }
      },
      "extraNationality": {
        "status": "string"
      },
      "family": {
        "father": {
          "name": "string",
          "countryOfBirth": "string"
        },
        "mother": {
          "name": "string",
          "countryOfBirth": "string"
        },
        "marital": {
          "status": "string",
          "spouse": {
            "name": "string",
            "countryOfBirth": "string"
          }
        }
      },
      "files": {
        "face": "string",
        "passport": "string",
        "card": "string",
        "invitation": "string",
        "return_ticket": "string",
        "booking": "string",
        "bank": "string",
        "address_proof": "string",
        "occupation": "string",
        "travel_ticket": "string"
      }
    }],
    "client": {
      "name": "string",
      "email": "string",
      "phone": {
        "code": "string",
        "number": "string"
      },
      "whatsappAlertsEnabled": boolean
    },
    "country": "string",
    "created_at": "ISO 8601 datetime",
    "entry": {
      "date": "YYYY-MM-DD",
      "port": "string or null"
    },
    "fileTransferMethod": "string",
    "meta": {
      "url": "string",
      "branch": "string",
      "domain": "string",
      "referrer": "string",
      "step": number,
      "completion": number,
      "resumed": boolean,
      "timestamp": number,
      "clientIp": "string",
      "revision": number
    },
    "orderId": "string or null",
    "product": {
      "name": "string",
      "country": "string",
      "docType": "string",
      "docName": "string",
      "intent": "string",
      "entries": "string",
      "validity": "string",
      "valid_since": "string",
      "wait": number,
      "price": {
        "currency": amount
      },
      "instructions": ["string"],
      "urgencies": [{
        "speed": "string",
        "fee": {
          "currency": amount
        }
      }],
      "stay_limit": number,
      "photo_types": ["string"]
    },
    "quantity": number,
    "termsAgreed": boolean,
    "updated_at": "ISO 8601 datetime",
    "urgency": "string"
  },
  "order": {
    "id": "string",
    "form_id": "string",
    "payment_id": "string",
    "payment_processor": "string",
    "amount": number,
    "currency": "string",
    "coupon": "string or null",
    "status": "string",
    "branch": "string",
    "domain": "string"
  }
}
```

## Security

- API keys have specific scopes: `webhook:n8n` and `orders:write`
- Keys expire after 1 year by default
- All webhook requests are logged in `webhook_logs` table
- Failed requests return appropriate HTTP status codes

## Monitoring

- Check `webhook_logs` table for incoming requests
- Monitor `orders` table for successfully processed orders
- Use the admin dashboard to view order data

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check API key is correct
   - Ensure key hasn't expired
   - Verify key has correct scopes

2. **400 Bad Request**
   - Validate JSON structure
   - Ensure required fields are present
   - Check date formats (YYYY-MM-DD)

3. **500 Internal Server Error**
   - Check backend logs
   - Verify database connection
   - Check `webhook_logs` for error details

### Schema Flexibility

The webhook is designed to handle variations in data structure across different visa types:

- **Optional fields**: Many fields are optional to accommodate different visa requirements
- **JSONB storage**: Complex nested data is stored as JSONB for flexibility
- **Raw data backup**: Complete webhook payload is stored in `orders.raw_data`
- **Backward compatibility**: Handles both old and new field formats

### Debug Commands

```bash
# Check if order was created
SELECT * FROM orders WHERE order_id = 'RU250731IL1';

# View recent webhook logs
SELECT * FROM webhook_logs 
WHERE source = 'n8n.visanet.app' 
ORDER BY created_at DESC 
LIMIT 10;

# Check for errors
SELECT * FROM webhook_logs 
WHERE error IS NOT NULL 
ORDER BY created_at DESC;

# View multi-applicant orders
SELECT o.order_id, o.status, COUNT(a.id) as applicant_count
FROM orders o
JOIN applicants a ON a.order_id = o.id
GROUP BY o.id, o.order_id, o.status
HAVING COUNT(a.id) > 1;

# Check Korean visa orders
SELECT * FROM form_metadata 
WHERE country = 'korea' 
AND stay_address IS NOT NULL;
```