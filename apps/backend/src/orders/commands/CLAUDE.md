# Order Commands

CQRS command handlers for order operations.

## Commands

### CreateOrderCommand / CreateOrderHandler

- Creates new order from Vizi webhook data
- Validates and transforms input
- Publishes `OrderCreatedForSync` event for saga processing

### SyncOrderToCBBCommand / SyncOrderToCBBHandler

- Triggers CBB contact synchronization
- Queues sync job with retry logic
- Optionally queues WhatsApp confirmation

### UpdateOrderProcessingCommand / UpdateOrderProcessingHandler

- Updates order processing metadata
- Tracks sync status and timestamps

### ResyncCBBContactCommand / ResyncCBBContactHandler

- Admin operation for manual CBB resync
- Validates order exists
- Uses same sync orchestrator as automatic sync
- Full audit logging

## Usage

Commands are dispatched via CommandBus:

```typescript
await this.commandBus.execute(
  new ResyncCBBContactCommand(orderId, correlationId),
);
```

All handlers are registered in `index.ts` exports.

Last Updated: August 24, 2025
