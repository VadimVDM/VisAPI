# Queue Processing System

BullMQ-based job processing with Redis backing for async workflows.

## Queue Types

### WHATSAPP_MESSAGES
Handles WhatsApp Business messaging via CBB API:
- **Order Confirmations**: Uses `order_confirmation_global` template with 8 variables
- **Status Updates**: Visa processing status changes (template-based)
- **Document Ready**: Visa approval notifications (template-based)

Features:
- WhatsApp Business template messaging (required for delivery)
- Hebrew translations with RTL support and flag emojis
- Processing time calculations based on urgency
- Idempotency checking to prevent duplicates
- Database tracking of sent messages

### CBB_SYNC
Synchronizes Vizi orders with CBB contacts:
- Creates/updates CBB contacts with custom fields
- Validates WhatsApp availability
- Queues order confirmation messages
- Maps visa data to CBB custom fields

### WORKFLOW_EXECUTION
Runs automated workflows with various connectors.

### WEBHOOK_PROCESSING
Processes incoming webhooks with retry logic.

## Processors

- `WhatsAppMessageProcessor`: Sends WhatsApp Business templates via CBB API
- `CBBSyncProcessor`: Syncs orders to CBB contacts
- `WorkflowProcessor`: Executes workflow steps
- `WebhookProcessor`: Handles webhook payloads
- `CronProcessor`: Manages scheduled jobs

## Configuration

All processors include:
- Prometheus metrics for monitoring
- Structured logging with correlation IDs
- Retry logic with exponential backoff
- Dead Letter Queue (DLQ) support

## Hebrew Translations

WhatsApp processor includes complete Hebrew translations for:
- Country names (with flag emojis)
- Visa types (tourist, business, medical, etc.)
- Validity periods (month, year, etc.)
- Processing time messages

Last Updated: August 22, 2025