# Vizi Webhook Setup Guide

This guide explains how to set up and use the Vizi webhook endpoint for receiving visa order data from Visanet's Vizi application.

## Overview

The Vizi webhook endpoint allows the Vizi app to send visa order data directly to VisAPI. The integration uses exact Visanet types with comprehensive validation and automated workflow triggering.

**Endpoint:** `POST /api/v1/webhooks/vizi/orders`

## Features

- **Type-Safe Integration**: Uses exact Visanet types from `@visapi/visanet-types`
- **Discriminated Unions**: Handles complex types like `ExtraNationality` and `Occupation`
- **Country-Specific Forms**: Supports all Visanet countries with proper type checking
- **Automatic Workflow Triggering**: Routes orders to appropriate workflows based on country
- **Comprehensive Validation**: DTOs with class-validator for robust input validation
- **Secure API Keys**: Custom `vizi_` prefix with scoped permissions

## API Key Setup

### Step 1: Generate Vizi API Key

```bash
# Run the standalone script to create a new Vizi API key
node scripts/create-vizi-api-key.js
```

This will:

- Create a new API key with `vizi_` prefix
- Assign required scopes: `webhook:vizi`, `triggers:create`, `logs:write`
- Properly hash the secret with bcrypt for secure storage
- Output the full API key for configuration

### Step 2: Configure Vizi App

In your Vizi application, configure the webhook:

- **URL:** `https://api.visanet.app/api/v1/webhooks/vizi/orders`
- **Method:** POST
- **Headers:**
  - `X-API-Key`: Your full API key (e.g., `vizi_xxx.yyy`)
  - `Content-Type`: `application/json`
  - `X-Idempotency-Key`: (Optional) Unique key for idempotent requests
  - `X-Correlation-ID`: (Optional) Request correlation ID for tracing

## Data Structure

The webhook expects the exact Visanet types structure:

```typescript
interface ViziWebhookDto {
  form: VisaForm; // Country-specific visa form
  order: Order; // Order details with payment info
}
```

### Country-Specific Forms

The system supports all Visanet countries with proper type discrimination:

```typescript
// India example
interface IndiaVisaForm extends BaseVisaForm {
  entry: Entry;
  business: Business;
  applicants: IndiaApplicant[];
  fileTransferMethod: FileTransferMethod;
}

// Korea example
interface KoreaVisaForm extends BaseVisaForm {
  departure: Departure;
  applicants: KoreaApplicant[];
}
```

### Complex Types with Discriminated Unions

```typescript
// ExtraNationality with proper discrimination
type ExtraNationality =
  | { status: 'none' }
  | { status: 'past'; country: string; from: string; until: string }
  | { status: 'present'; country: string; acquiry: string };

// Occupation types
type Occupation =
  | { status: 'employed' /* employment fields */ }
  | { status: 'self_employed' /* business fields */ }
  | { status: 'student' /* education fields */ }
  | { status: 'retired' }
  | { status: 'unemployed' };
```

## Testing

### Local Testing

```bash
# Start the backend locally
pnpm dev:backend

# Test with curl using sample data
curl -X POST http://localhost:3000/api/v1/webhooks/vizi/orders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: vizi_YOUR_KEY_HERE" \
  -d '{
    "form": {
      "id": "test-form-id",
      "country": "india",
      "client": {
        "name": "Test Client",
        "email": "test@visanet.com",
        "phone": { "code": "+972", "number": "501234567" }
      },
      "product": {
        "name": "India Business Visa",
        "country": "india"
      },
      "applicants": [
        {
          "passport": {
            "firstName": "John",
            "lastName": "Doe",
            "number": "A12345678"
          }
        }
      ]
    },
    "order": {
      "id": "test-order-id",
      "form_id": "test-form-id",
      "status": "paid",
      "amount": 100,
      "currency": "USD"
    }
  }'
```

### Production Testing

```bash
# Test against production
curl -X POST https://api.visanet.app/api/v1/webhooks/vizi/orders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: vizi_YOUR_KEY_HERE" \
  -H "X-Idempotency-Key: unique-request-id" \
  -d @sample-vizi-order.json
```

## Workflow Integration

The webhook automatically triggers workflows based on:

1. **Country Matching**: Looks for workflows with trigger key `vizi_{country}`
2. **Priority Routing**: Uses `urgency` field to determine queue priority
   - `few_hours` → critical queue
   - Other values → default queue
3. **Context Enrichment**: Adds metadata for workflow processing

### Workflow Trigger Configuration

```json
{
  "triggers": [
    {
      "type": "webhook",
      "config": {
        "key": "vizi_india"
      }
    }
  ]
}
```

## Security

### API Key Scopes

Vizi API keys require the following scopes:

- `webhook:vizi` - Access to Vizi webhook endpoints
- `triggers:create` - Permission to trigger workflows
- `logs:write` - Permission to write processing logs

### Request Validation

- All requests are validated against DTOs with class-validator
- Invalid requests return 400 Bad Request with detailed error messages
- Type guards ensure runtime type safety

### Logging

All webhook requests are logged with:

- Correlation IDs for request tracing
- PII redaction for sensitive data
- Structured metadata for querying

## Monitoring

### Success Metrics

```sql
-- Check successful webhook processing
SELECT
  metadata->>'country' as country,
  COUNT(*) as order_count,
  DATE(created_at) as date
FROM logs
WHERE
  message = 'Vizi webhook processed successfully'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY metadata->>'country', DATE(created_at)
ORDER BY date DESC, country;
```

### Error Monitoring

```sql
-- Check webhook errors
SELECT
  metadata->>'error' as error,
  COUNT(*) as error_count,
  MAX(created_at) as last_error
FROM logs
WHERE
  message = 'Failed to process Vizi webhook'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY metadata->>'error'
ORDER BY error_count DESC;
```

### Workflow Execution

```sql
-- Check workflow execution from webhooks
SELECT
  w.name as workflow_name,
  COUNT(l.id) as execution_count,
  AVG(l.metadata->>'applicant_count')::numeric as avg_applicants
FROM logs l
JOIN workflows w ON w.id = l.workflow_id::uuid
WHERE
  l.message = 'Queued Vizi webhook for workflow processing'
  AND l.created_at > NOW() - INTERVAL '7 days'
GROUP BY w.name
ORDER BY execution_count DESC;
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Verify API key starts with `vizi_`
   - Check key has `webhook:vizi` scope
   - Ensure key hasn't expired

2. **400 Bad Request - Validation Error**
   - Check response body for specific validation errors
   - Ensure all required fields are present
   - Verify date formats (YYYY-MM-DD)
   - Check enum values match exactly

3. **No Workflow Found**
   - Ensure workflow exists with trigger key `vizi_{country}`
   - Verify workflow is enabled
   - Check workflow has webhook trigger type

### Debug Commands

```bash
# Check if API key exists and has correct scope
SELECT
  prefix,
  name,
  scopes,
  expires_at,
  created_at
FROM api_keys
WHERE prefix LIKE 'vizi_%'
ORDER BY created_at DESC;

# View recent Vizi webhook logs
SELECT
  created_at,
  metadata->>'order_id' as order_id,
  metadata->>'country' as country,
  metadata->>'workflow_name' as workflow,
  metadata->>'error' as error
FROM logs
WHERE metadata->>'webhook_type' = 'vizi_order'
ORDER BY created_at DESC
LIMIT 20;

# Check workflow triggers
SELECT
  name,
  enabled,
  schema->'triggers' as triggers
FROM workflows
WHERE schema::text LIKE '%vizi_%';
```

## Type Safety

The integration uses TypeScript type guards for runtime validation:

```typescript
// Country-specific form checking
import { isIndiaVisaForm } from '@visapi/visanet-types';

if (isIndiaVisaForm(form)) {
  // TypeScript knows this is IndiaVisaForm
  console.log(form.business.name);
}

// Discriminated union checking
import { isExtraNationalityPresent } from '@visapi/visanet-types';

if (isExtraNationalityPresent(applicant.extraNationality)) {
  // TypeScript knows status is 'present'
  console.log(applicant.extraNationality.country);
}
```

## Migration from n8n

If migrating from the old n8n webhook:

1. Generate new Vizi API key (see setup above)
2. Update webhook URL from `/webhooks/n8n/orders` to `/webhooks/vizi/orders`
3. Replace `n8n_` API key with new `vizi_` key
4. Test with sample payload to verify

Key improvements in Vizi webhook:

- Exact Visanet type matching
- Better validation with DTOs
- Discriminated unions for complex types
- Direct workflow integration
- Improved error messages

---

**Last Updated**: July 31, 2025  
**Version**: 1.0.0  
**Status**: Production Ready
