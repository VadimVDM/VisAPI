import { Injectable } from '@nestjs/common';
import { Saga, ICommand } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { SyncOrderToCBBCommand } from '../commands/sync-order-to-cbb.command';

/**
 * Event emitted when an order is created and needs sync
 */
interface OrderCreatedForSyncEvent {
  type: 'OrderCreatedForSync';
  orderId: string;
  branch: string;
  whatsappEnabled: boolean;
  correlationId?: string;
}

/**
 * OrderSyncSaga - Listens to order events and triggers sync processes
 * Handles the automatic CBB synchronization after order creation
 */
@Injectable()
export class OrderSyncSaga {
  /**
   * Listen for OrderCreatedForSync events and trigger CBB sync
   */
  @Saga()
  orderCreatedForSync = (
    events$: Observable<OrderCreatedForSyncEvent>,
  ): Observable<ICommand> => {
    return events$.pipe(
      filter(
        (event): event is OrderCreatedForSyncEvent =>
          event?.type === 'OrderCreatedForSync',
      ),
      map(
        (event) =>
          new SyncOrderToCBBCommand(
            event.orderId,
            event.branch,
            event.whatsappEnabled,
            event.correlationId,
          ),
      ),
    );
  };
}
