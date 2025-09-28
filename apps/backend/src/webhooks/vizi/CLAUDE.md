# Vizi Webhooks Module

Handles incoming webhooks from Vizi application and provides admin operations for order and CBB sync management.

## Endpoints

### Order Processing

- `POST /api/v1/webhooks/vizi/orders` - Receive and process Vizi order webhooks
  - Validates and normalizes incoming data
  - Creates order in database
  - Triggers CBB sync for IL branch orders
  - Queues WhatsApp notifications

### Admin Operations (Require Admin API Key)

#### Order Retrigger

- `POST /api/v1/webhooks/vizi/retrigger` - Retrigger order creation from stored webhook data
  - Modes: single order or bulk
  - Recovery tool for failed order processing
  - Supports date range filtering

#### CBB Contact Resync

- `POST /api/v1/webhooks/vizi/resync-cbb` - Manually resync CBB contact
  - Find orders by: phone number, order ID, or Vizi order ID
  - Uses same sync logic as automatic processing
  - Returns sync status and WhatsApp availability

#### WhatsApp Notification Retrigger

- `POST /api/v1/webhooks/vizi/retrigger-whatsapp` - Manually retrigger WhatsApp order confirmation
  - Find orders by: phone number, order ID, or Vizi order ID
  - Validates CBB sync status before sending
  - Force flag to override already-sent checks
  - Uses exact same message flow as automatic processing

## Security

All endpoints require API key authentication with appropriate scopes:

- Order webhook: `webhook:vizi` + `logs:write`
- Admin operations: `webhook:vizi` + `admin`

## Architecture

- CQRS pattern with commands for sync operations
- Repository pattern for database access
- Services split by responsibility:
  - `ViziOrderWebhookService` — request validation + idempotency handling
  - `ViziOrderWorkflowService` — workflow dispatch & logging
  - `ViziOrderRetriggerService` — historical webhook replay
  - `ViziCbbResyncService` — targeted CBB contact sync
  - `ViziWhatsAppRetriggerService` — WhatsApp queue orchestration
- Full audit logging with correlation IDs
- Idempotency support via headers

**Last Updated**: September 28, 2025
