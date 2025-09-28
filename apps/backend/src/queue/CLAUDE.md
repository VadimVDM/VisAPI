# Queue Processing System

BullMQ-based job processing with Redis backing for async workflows.

## Queue Types

### WHATSAPP_MESSAGES

Handles WhatsApp Business messaging via CBB API:

- **Order Confirmations**: Uses `order_confirmation_global` template with 8 variables
- **Status Updates**: Visa processing status changes (template-based)
- **Document Ready**: Visa approval notifications (template-based)
- **Visa Approval**: Sends approved visa PDFs with `visa_approval_file_phone` template

Features:

- Atomic idempotency with INSERT ON CONFLICT (prevents duplicates)
- Message ID correlation via `biz_opaque_callback_data`
- Hebrew translations with RTL support and flag emojis
- Processing time calculations based on urgency
- Database tracking in `whatsapp_messages` table with temp/real IDs

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

### Backend App Processors

- `WhatsAppMessageProcessor`: Order confirmations with idempotency protection
- `CBBSyncProcessor`: Order-to-CBB contact synchronization

**CRITICAL**: All processors must use `@Processor(QUEUE_NAMES.QUEUE_NAME)` - never hardcode queue names!

### Service Architecture (Refactored September 28, 2025)

**Orchestration Layer**
- `CBBSyncOrchestratorService`: Main coordinator, delegates to specialized services

**Core Services**
- `CbbContactSyncService`: CBB contact creation/update with error recovery
- `CbbWhatsAppService`: WhatsApp message queueing with duplicate prevention
- `CBBFieldMapperService`: Order-to-CBB field mapping with translations

**Supporting Services**
- `WhatsAppTranslationService`: Hebrew translations with database-driven processing times
- `WhatsAppTemplateService`: Template building with 'x' prefix for quantities
- `CBBSyncMetricsService`: Prometheus metrics tracking

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

### Queue Name Constants
- **Issue**: CBB processor used hardcoded `'cbb-sync'` string
- **Fix**: Changed to `QUEUE_NAMES.CBB_SYNC` constant
- **Impact**: Workers now connect to correct queue names

### Idempotency Protection
- **Issue**: Messages sent multiple times on job retry
- **Fix**: Atomic INSERT ON CONFLICT for idempotency records
- **Impact**: Only one job can claim message sending

### Message ID Correlation
- **Issue**: CBB doesn't return Meta's message ID immediately
- **Fix**: Correlation data in `biz_opaque_callback_data`
- **Impact**: Automatic update from temp to real WAMIDs

### Queue Auto-Resume
- **Issue**: Queues remained paused in Redis after restart
- **Fix**: Force resume all queues in `onModuleInit()`
- **Impact**: Queues always active on startup

## Visa Approval Notifications (Added September 28, 2025)

### Integration with Airtable Completed Tracker
- Automatically processes new records from completed view
- Extracts visa details from expanded Application records
- Supports up to 10 applications per order
- Extracts full name (First + Last), passport number, and DOB
- Checks multiple conditions before sending
- Updates order with visa tracking information

### WhatsApp Templates

#### Primary Template: `visa_approval_file_phone`
- **Usage**: First application in order
- **Parameters**: `[name_hebrew, country]`
- **Attachment**: Visa PDF URL

#### Multi Template: `visa_approval_file_multi_he`
- **Usage**: Applications 2-10 in order
- **Parameters**: `[number_emoji, applicant_full_name]`
- **Format**: "{{1}} *קובץ הויזה של {{2}} מצורף* בחלקה העליון של הודעה זו 📎"
- **Attachment**: Individual visa PDF
- **Delay**: 5 seconds between messages
- **NOTE**: Template must be approved in WhatsApp Business to avoid rejection

### Duplicate Prevention
- Database flag: `visa_notification_sent`
- Timestamp tracking: `visa_notification_sent_at`
- Message ID storage: `visa_notification_message_id`
- Initial 767 orders marked as already sent

Last Updated: September 28, 2025
