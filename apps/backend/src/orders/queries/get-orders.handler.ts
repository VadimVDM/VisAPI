import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetOrdersQuery } from './get-orders.query';
import { OrdersRepository } from '@visapi/backend-repositories';
import { CacheService } from '@visapi/backend-cache';

/**
 * Handler for GetOrdersQuery
 * Retrieves filtered and paginated orders with intelligent caching
 */
@QueryHandler(GetOrdersQuery)
export class GetOrdersHandler implements IQueryHandler<GetOrdersQuery> {
  private readonly logger = new Logger(GetOrdersHandler.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: GetOrdersQuery): Promise<{ data: any[]; total: number }> {
    const { filters = {}, pagination = {} } = query;
    
    // Generate cache key based on query parameters
    const cacheKey = this.cacheService.generateKey('GetOrders', [filters, pagination]);
    
    // Try to get from cache first
    const cached = await this.cacheService.get<{ data: any[]; total: number }>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for orders query: ${cacheKey}`);
      return cached;
    }
    
    // Build where clause from filters
    const where: any = {};
    
    if (filters.branch) {
      where.branch = filters.branch;
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.clientEmail) {
      where.client_email = filters.clientEmail;
    }
    
    if (filters.whatsappEnabled !== undefined) {
      where.whatsapp_alerts_enabled = filters.whatsappEnabled;
    }
    
    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) {
        where.created_at.$gte = filters.startDate;
      }
      if (filters.endDate) {
        where.created_at.$lte = filters.endDate;
      }
    }

    // Apply pagination
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = pagination.sortBy || 'created_at';
    const sortOrder = pagination.sortOrder || 'desc';

    // Execute query
    const [data, total] = await Promise.all([
      this.ordersRepository.findMany({
        where,
        limit,
        offset,
        orderBy: sortBy,
        orderDirection: sortOrder,
      }),
      this.ordersRepository.count(where),
    ]);

    const result = { data, total };
    
    // Cache the result for 60 seconds (short TTL for frequently changing data)
    await this.cacheService.set(cacheKey, result, 60);
    
    this.logger.debug(`Retrieved ${data.length} orders out of ${total} total (cached)`);

    return result;
  }
}