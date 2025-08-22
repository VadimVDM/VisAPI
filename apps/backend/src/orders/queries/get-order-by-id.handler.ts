import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetOrderByIdQuery } from './get-order-by-id.query';
import { OrdersRepository } from '@visapi/backend-repositories';
import { CacheService } from '@visapi/backend-cache';

/**
 * Handler for GetOrderByIdQuery
 * Retrieves order with optional caching
 */
@QueryHandler(GetOrderByIdQuery)
export class GetOrderByIdHandler implements IQueryHandler<GetOrderByIdQuery> {
  private readonly logger = new Logger(GetOrderByIdHandler.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: GetOrderByIdQuery): Promise<any> {
    const { orderId, includeRelations } = query;
    
    // Try to get from cache first
    const cacheKey = `order:${orderId}:${includeRelations ? 'full' : 'basic'}`;
    const cached = await this.cacheService.get(cacheKey);
    
    if (cached) {
      this.logger.debug(`Cache hit for order ${orderId}`);
      return cached;
    }

    // Fetch from repository
    const order = await this.ordersRepository.findOne({
      where: { order_id: orderId },
      include: includeRelations ? ['workflow_executions'] : undefined,
    });

    if (!order) {
      return null;
    }

    // Cache the result
    await this.cacheService.set(cacheKey, order, 300); // 5 minutes TTL
    
    return order;
  }
}