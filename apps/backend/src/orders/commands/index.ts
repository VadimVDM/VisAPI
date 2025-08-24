export * from './create-order.command';
export * from './create-order.handler';
export * from './sync-order-to-cbb.command';
export * from './sync-order-to-cbb.handler';
export * from './update-order-processing.command';
export * from './update-order-processing.handler';
export * from './resync-cbb-contact.command';
export * from './resync-cbb-contact.handler';

import { CreateOrderHandler } from './create-order.handler';
import { SyncOrderToCBBHandler } from './sync-order-to-cbb.handler';
import { UpdateOrderProcessingHandler } from './update-order-processing.handler';
import { ResyncCBBContactHandler } from './resync-cbb-contact.handler';

export const CommandHandlers = [
  CreateOrderHandler,
  SyncOrderToCBBHandler,
  UpdateOrderProcessingHandler,
  ResyncCBBContactHandler,
];
