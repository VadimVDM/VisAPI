import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetOrderStatsQuery } from './get-order-stats.query';
import { OrdersRepository, OrderRecord } from '@visapi/backend-repositories';
import { CacheService } from '@visapi/backend-cache';

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByBranch: Record<string, number>;
  ordersByStatus: Record<string, number>;
  ordersByVisaType: Record<string, number>;
  timeSeries: TimeSeriesPoint[];
  whatsappEnabled: number;
  processingTimeStats: ProcessingTimeStats;
}

interface TimeSeriesPoint {
  date: string;
  count: number;
}

interface ProcessingTimeStats {
  average: number;
  min: number;
  max: number;
}

interface WhereClause {
  branch?: string;
  created_at?: {
    $gte?: string;
    $lte?: string;
  };
}

/**
 * Handler for GetOrderStatsQuery
 * Calculates and returns aggregated order statistics
 */
@QueryHandler(GetOrderStatsQuery)
export class GetOrderStatsHandler implements IQueryHandler<GetOrderStatsQuery> {
  private readonly logger = new Logger(GetOrderStatsHandler.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: GetOrderStatsQuery): Promise<OrderStats> {
    const { period, branch, startDate, endDate } = query;

    // Build cache key
    const cacheKey = `stats:orders:${period}:${branch || 'all'}:${startDate || 'start'}:${endDate || 'end'}`;

    // Check cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for order statistics');
      return cached as OrderStats;
    }

    // Build where clause
    const where: WhereClause = {};

    if (branch) {
      where.branch = branch;
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.$gte = startDate;
      }
      if (endDate) {
        where.created_at.$lte = endDate;
      }
    }

    // Get all orders for aggregation
    const orders = await this.ordersRepository.findMany({ where });

    // Calculate statistics
    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.amount || 0), 0),
      averageOrderValue:
        orders.length > 0
          ? orders.reduce((sum, order) => sum + (order.amount || 0), 0) /
            orders.length
          : 0,
      ordersByBranch: this.groupByBranch(orders),
      ordersByStatus: this.groupByStatus(orders),
      ordersByVisaType: this.groupByVisaType(orders),
      timeSeries: this.generateTimeSeries(orders, period),
      whatsappEnabled: orders.filter((o) => o.whatsapp_alerts_enabled).length,
      processingTimeStats: this.calculateProcessingTimeStats(orders),
    };

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, stats, 3600);

    return stats;
  }

  private groupByBranch(orders: OrderRecord[]): Record<string, number> {
    return orders.reduce(
      (acc, order) => {
        acc[order.branch] = (acc[order.branch] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private groupByStatus(orders: OrderRecord[]): Record<string, number> {
    return orders.reduce(
      (acc, order) => {
        const status = order.order_status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private groupByVisaType(orders: OrderRecord[]): Record<string, number> {
    return orders.reduce(
      (acc, order) => {
        const visaType = order.product_doc_type || 'unknown';
        acc[visaType] = (acc[visaType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private generateTimeSeries(
    orders: OrderRecord[],
    period: string,
  ): TimeSeriesPoint[] {
    // Group orders by time period
    const grouped: Record<string, number> = {};

    orders.forEach((order) => {
      const date = new Date(order.created_at);
      let key: string;

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split('T')[0]; // Default to day format
          break;
      }

      grouped[key] = (grouped[key] || 0) + 1;
    });

    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateProcessingTimeStats(
    orders: OrderRecord[],
  ): ProcessingTimeStats {
    const processedOrders = orders.filter((o) => o.processed_at);

    if (processedOrders.length === 0) {
      return { average: 0, min: 0, max: 0 };
    }

    const processingTimes = processedOrders
      .filter((order) => order.processed_at)
      .map((order) => {
        const created = new Date(order.created_at).getTime();
        const processed = new Date(order.processed_at!).getTime();
        return (processed - created) / 1000 / 60; // Convert to minutes
      });

    return {
      average:
        processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length,
      min: Math.min(...processingTimes),
      max: Math.max(...processingTimes),
    };
  }
}
