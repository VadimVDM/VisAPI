# Orders Module

Core domain module for visa order processing with CQRS architecture.

## Commands

### CreateOrderCommand

Creates new order from Vizi webhook data with validation and transformation.

### SyncOrderToCBBCommand

Triggers CBB contact synchronization for IL branch orders.

### UpdateOrderProcessingCommand

Updates order processing status and metadata.

### ResyncCBBContactCommand

Admin command to manually resync CBB contact for recovery operations.

## Services

### OrdersService

Main service orchestrating order operations with caching and validation.

### OrderSyncService

Handles async sync operations:

- CBB contact synchronization
- WhatsApp message queuing
- Workflow processing

### OrderTransformerService

Transforms raw webhook data to domain models.

### OrderValidatorService

Validates order data against business rules.

### TranslationService

Provides Hebrew localization for client communications.

## Sagas

### OrderSyncSaga

Event-driven listener that automatically triggers CBB sync when orders are created for IL branch.

## Architecture

- Repository pattern for data access
- Event sourcing for audit trail
- Domain events for loose coupling
- Automatic sync via sagas

Last Updated: August 24, 2025
