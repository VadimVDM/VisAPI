export * from './get-order-by-id.query';
export * from './get-order-by-id.handler';
export * from './get-orders.query';
export * from './get-orders.handler';
export * from './get-order-stats.query';
export * from './get-order-stats.handler';

import { GetOrderByIdHandler } from './get-order-by-id.handler';
import { GetOrdersHandler } from './get-orders.handler';
import { GetOrderStatsHandler } from './get-order-stats.handler';

export const QueryHandlers = [
  GetOrderByIdHandler,
  GetOrdersHandler,
  GetOrderStatsHandler,
];
