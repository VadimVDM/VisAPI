import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueryBus } from '@nestjs/cqrs';
import { CacheService } from '@visapi/backend-cache';
import { GetOrderStatsQuery } from '../orders/queries/get-order-stats.query';
import { GetOrdersQuery } from '../orders/queries/get-orders.query';

/**
 * Cache Warming Service
 * Pre-loads frequently accessed data into cache to improve response times
 */
@Injectable()
export class CacheWarmingService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmingService.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly cacheService: CacheService,
  ) {}

  async onModuleInit() {
    // Warm cache on startup (delayed to avoid startup bottleneck)
    setTimeout(() => {
      this.warmCache().catch(error => {
        this.logger.error('Failed to warm cache on startup', error);
      });
    }, 5000);
  }

  /**
   * Warm cache every 30 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCacheWarming() {
    await this.warmCache();
  }

  /**
   * Warm cache with critical data
   */
  private async warmCache(): Promise<void> {
    this.logger.log('Starting cache warming...');
    const startTime = Date.now();

    try {
      // Warm up frequently accessed data
      await Promise.all([
        this.warmOrderStats(),
        this.warmRecentOrders(),
        this.warmOrdersByBranch(),
      ]);

      const duration = Date.now() - startTime;
      this.logger.log(`Cache warming completed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Cache warming failed', error);
    }
  }

  /**
   * Pre-load order statistics
   */
  private async warmOrderStats(): Promise<void> {
    try {
      // Warm today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await this.queryBus.execute(
        new GetOrderStatsQuery('day', undefined, today, tomorrow),
      );

      // Warm this week's stats
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      
      await this.queryBus.execute(
        new GetOrderStatsQuery('week', undefined, weekStart, tomorrow),
      );

      // Warm this month's stats
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      await this.queryBus.execute(
        new GetOrderStatsQuery('month', undefined, monthStart, tomorrow),
      );

      this.logger.debug('Order statistics cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm order stats cache', error);
    }
  }

  /**
   * Pre-load recent orders
   */
  private async warmRecentOrders(): Promise<void> {
    try {
      // Warm first page of recent orders
      await this.queryBus.execute(
        new GetOrdersQuery({}, { page: 1, limit: 20, sortBy: 'created_at', sortOrder: 'desc' }),
      );

      // Warm pending orders
      await this.queryBus.execute(
        new GetOrdersQuery({ status: 'pending' }, { page: 1, limit: 20 }),
      );

      // Warm unprocessed orders
      await this.queryBus.execute(
        new GetOrdersQuery({ status: 'unprocessed' }, { page: 1, limit: 20 }),
      );

      this.logger.debug('Recent orders cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm recent orders cache', error);
    }
  }

  /**
   * Pre-load orders by branch
   */
  private async warmOrdersByBranch(): Promise<void> {
    try {
      const branches = ['IL', 'US', 'UK']; // Main branches

      await Promise.all(
        branches.map(branch =>
          this.queryBus.execute(
            new GetOrdersQuery({ branch }, { page: 1, limit: 10 }),
          ),
        ),
      );

      this.logger.debug('Orders by branch cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm orders by branch cache', error);
    }
  }

  /**
   * Clear stale cache entries
   */
  @Cron(CronExpression.EVERY_HOUR)
  async clearStaleCache() {
    try {
      // Clear old statistics cache
      await this.cacheService.deleteByPattern('stats:orders:*');
      
      // Clear old query cache
      await this.cacheService.deleteByPattern('GetOrders:*');
      
      this.logger.debug('Stale cache entries cleared');
    } catch (error) {
      this.logger.error('Failed to clear stale cache', error);
    }
  }

  /**
   * Force refresh specific cache entries
   */
  async refreshCache(pattern?: string): Promise<void> {
    if (pattern) {
      await this.cacheService.deleteByPattern(pattern);
      this.logger.log(`Cache refreshed for pattern: ${pattern}`);
    } else {
      // Clear all cache by deleting everything
      await this.cacheService.deleteByPattern('*');
      this.logger.log('All cache cleared');
    }
    
    // Re-warm cache after clearing
    await this.warmCache();
  }
}