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

### Core Processors
- `WhatsAppMessageProcessor` (273 lines): Sends WhatsApp Business templates via CBB API
- `CBBSyncProcessor` (138 lines): Orchestrates order-to-CBB contact synchronization
- `WorkflowProcessor`: Executes workflow steps
- `WebhookProcessor`: Handles webhook payloads
- `CronProcessor`: Manages scheduled jobs

### Supporting Services (Updated August 25, 2025)
- `WhatsAppTranslationService` (323 lines): Hebrew translations with database-driven processing times
- `WhatsAppTemplateService` (130 lines): Template building and formatting
- `CBBFieldMapperService` (301 lines): Maps order data to CBB contact fields including `order_days`
- `CBBSyncOrchestratorService` (328 lines): Handles sync workflow logic

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

## Business Rules Engine

Processing times are now database-driven (August 25, 2025):
- **Database Function**: `calculate_processing_days()` in PostgreSQL
- **Automatic Trigger**: Calculates on order insert/update
- **Configuration Table**: `processing_rules` with JSON conditions/actions
- **Audit Trail**: `processing_rules_audit` tracks all changes
- **Default Rules**:
  - Standard: 3 business days (all countries)
  - Morocco: 5 business days
  - Vietnam: 7 business days
  - Urgent: 1 business day (overrides country)
- **CBB Integration**: Maps to `order_days` field (ID: 271948)
- **Fallback Logic**: Service includes hardcoded fallback when DB unavailable

Last Updated: August 25, 2025