# Orders Module

Core domain module for visa order processing with streamlined architecture.

## Services

### OrdersService

Main service orchestrating order operations:
- Creates orders from Vizi webhooks with validation
- Triggers CBB sync directly for IL branch orders
- Handles duplicate orders gracefully
- Publishes domain events for audit trail

### OrderSyncService

Handles async sync operations:
- CBB contact synchronization via queue
- WhatsApp message queuing
- Workflow processing coordination

### OrderTransformerService

Transforms raw webhook data to domain models:
- **Phone normalization**: Strips leading zeros after country codes
- Maps Vizi fields to database schema
- Handles missing/malformed data gracefully
- Extracts document URLs and metadata

### OrderValidatorService

Validates order data against business rules.

### TranslationService

Provides Hebrew localization for client communications.

## Architecture

- Repository pattern for data access
- Event sourcing for audit trail
- Domain events for loose coupling
- Direct service calls (CQRS removed Sept 28, 2025)
- Automatic CBB sync triggered on order creation

## Phone Number Processing

Vizi sends phone as `{code: "972", number: "0507247157"}`.
OrderTransformerService removes the leading zero to produce `972507247157`.
This prevents duplicate CBB contacts with wrong formats.

Last Updated: September 28, 2025