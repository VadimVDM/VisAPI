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
- `WhatsAppTemplateService` (141 lines): Template building with 'x' prefix for quantities
- `CBBFieldMapperService` (478 lines): Enhanced field mapping with units and timestamps
- `CBBSyncOrchestratorService` (428 lines): Handles sync workflow with improved logging

## Configuration

All processors include:

- Prometheus metrics for monitoring
- Structured logging with correlation IDs
- Retry logic with exponential backoff
- Dead Letter Queue (DLQ) support
- **Auto-Resume on Startup**: Queues automatically resume if found paused
- **Correct Queue Names**: Uses `QUEUE_NAMES` constants from shared types

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

## CBB Custom Fields Mapping (Enhanced August 25, 2025)

Complete mapping of order data to CBB contact fields:

- **customer_name**: Client name from order
- **visa_country**: Destination country
- **visa_type**: Document type (tourist, business, etc.)
- **OrderNumber**: Vizi order ID
- **visa_quantity**: Number of applicants (x prefix for display)
- **order_days**: Processing days (ID: 271948)
- **order_sum_ils**: Total payment amount (ID: 358366)
- **order_urgent**: Boolean urgency flag (1/0)
- **order_date**: Travel/entry date (Unix timestamp)
- **order_date_time**: Order creation timestamp (ID: 100644)
- **visa_intent**: Purpose of travel
- **visa_entries**: Single/multiple entry
- **visa_validity**: Validity with units ("30 days", "6 months", "1 year")
- **visa_flag**: Country flag emoji
- **Email**: Client email (system field ID: -12)

## Critical Fixes Applied (August 25, 2025)

### Queue Persistence Issue
- **Problem**: Queues remained paused after graceful shutdown
- **Root Cause**: Redis persisted pause state across restarts
- **Solution**: Auto-resume all queues in `onModuleInit()`

### WhatsApp Processor Registration
- **Problem**: Processor listening to literal string instead of constant
- **Fixed**: Changed from `'WHATSAPP_MESSAGES'` to `QUEUE_NAMES.WHATSAPP_MESSAGES`
- **Impact**: Restored WhatsApp message processing

### Fastify Compatibility
- **Problem**: `enableShutdownHooks()` incompatible with Node.js 22
- **Solution**: Disabled and implemented manual shutdown handlers
- **Result**: Clean shutdown without crashes

Last Updated: August 25, 2025
