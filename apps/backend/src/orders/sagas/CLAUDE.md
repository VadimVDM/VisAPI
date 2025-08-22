# Order Sagas

CQRS sagas for handling order-related events and orchestrating async processes.

## OrderSyncSaga

Listens to order creation events and automatically triggers CBB synchronization for IL branch orders.

### Event Flow

1. **Order Creation**: `CreateOrderHandler` creates order and publishes `OrderCreatedForSync` event
2. **Saga Listener**: `OrderSyncSaga` catches the event via RxJS observable stream
3. **Command Dispatch**: Saga dispatches `SyncOrderToCBBCommand` to trigger sync
4. **CBB Sync**: Command handler queues CBB sync job for processing
5. **WhatsApp Queue**: After successful CBB sync, WhatsApp confirmation is queued

### Implementation Details

```typescript
// Event structure
interface OrderCreatedForSyncEvent {
  type: 'OrderCreatedForSync';
  orderId: string;
  branch: string;
  whatsappEnabled: boolean;
  correlationId?: string;
}
```

### Key Features

- **Automatic Triggering**: No manual intervention needed for IL branch orders
- **Event-Driven**: Loose coupling between order creation and sync processes
- **Branch Filtering**: Only IL branch orders trigger CBB sync
- **WhatsApp Integration**: Automatic order confirmation messages when enabled

## Usage

The saga is automatically registered in `OrdersModule` and starts listening when the application boots. No additional configuration required.

Last Updated: August 23, 2025