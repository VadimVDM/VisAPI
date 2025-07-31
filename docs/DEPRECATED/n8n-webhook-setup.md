# n8n Webhook Setup Guide (DEPRECATED)

> **⚠️ DEPRECATION NOTICE**: As of July 31, 2025, the n8n webhook integration has been deprecated and replaced by the Vizi webhook integration. This document is maintained for historical reference only. Please refer to [vizi-webhook-setup.md](./vizi-webhook-setup.md) for current webhook implementation.

## Overview

The n8n webhook endpoint was used to receive visa order data from n8n.visanet.app. This integration has been replaced by the Vizi webhook system which provides:

- Direct integration with Visanet's Vizi app
- Exact type matching with Visanet's type system
- Improved API key security with `vizi_` prefix
- Better validation with discriminated unions

## Migration Guide

If you were using the n8n webhook endpoint, please migrate to the new Vizi webhook:

1. **Old Endpoint**: `POST /api/v1/webhooks/n8n/orders` ❌
2. **New Endpoint**: `POST /api/v1/webhooks/vizi/orders` ✅

### Key Changes

- API keys now use `vizi_` prefix instead of `n8n_`
- New scope: `webhook:vizi` instead of `webhook:n8n`
- Exact Visanet types from `@visapi/visanet-types`
- Improved validation with class-validator DTOs

### Migration Steps

1. Generate new Vizi API key:

   ```bash
   node apps/backend/src/scripts/seed-vizi-api-key.ts
   ```

2. Update webhook configuration in your Vizi app:
   - URL: `https://api.visanet.app/api/v1/webhooks/vizi/orders`
   - API Key: Use the new `vizi_` prefixed key

3. Test the new endpoint:
   ```bash
   curl -X POST https://api.visanet.app/api/v1/webhooks/vizi/orders \
     -H "Content-Type: application/json" \
     -H "X-API-Key: vizi_YOUR_KEY_HERE" \
     -d @sample-vizi-order.json
   ```

## Historical Reference

The original n8n integration supported:

- Multiple visa types (Russia, India, Korea)
- Flexible JSON structure with optional fields
- JSONB storage for complex nested data
- Raw data backup in orders table

All these features are maintained and improved in the Vizi webhook integration.

## Support

For questions about migrating from n8n to Vizi webhooks, please contact the VisAPI development team.

---

**Last Updated**: July 31, 2025  
**Status**: DEPRECATED - Use Vizi webhooks instead
