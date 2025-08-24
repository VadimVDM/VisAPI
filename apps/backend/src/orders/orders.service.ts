import { Injectable, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ViziWebhookDto } from '@visapi/visanet-types';
import { OrderRecord } from '@visapi/backend-repositories';
import { CreateOrderCommand } from './commands/create-order.command';
import { SyncOrderToCBBCommand } from './commands/sync-order-to-cbb.command';
import { UpdateOrderProcessingCommand } from './commands/update-order-processing.command';
import { GetOrderByIdQuery } from './queries/get-order-by-id.query';
import { GetOrdersQuery } from './queries/get-orders.query';
import { GetOrderStatsQuery } from './queries/get-order-stats.query';

export interface OrderStats {
  totalOrders: number;
  totalAmount: number;
  averageAmount: number;
  statusCounts: Record<string, number>;
  branchCounts: Record<string, number>;
  countryCounts: Record<string, number>;
  period: string;
  [key: string]: unknown;
}

/**
 * OrdersService - Main service for order management
 * Now uses CQRS pattern for clean separation of commands and queries
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Create a new order from Vizi webhook data
   * Delegates to CreateOrderCommand via CQRS
   */
  async createOrder(webhookData: ViziWebhookDto, correlationId?: string): Promise<string> {
    const command = new CreateOrderCommand(webhookData, correlationId);
    return await this.commandBus.execute(command);
  }

  /**
   * Sync an order to CBB system
   * Delegates to SyncOrderToCBBCommand via CQRS
   */
  async syncOrderToCBB(
    orderId: string,
    branch: string,
    whatsappAlertsEnabled: boolean,
    correlationId?: string,
  ): Promise<void> {
    const command = new SyncOrderToCBBCommand(
      orderId,
      branch,
      whatsappAlertsEnabled,
      correlationId,
    );
    return await this.commandBus.execute(command);
  }

  /**
   * Get an order by ID
   * Delegates to GetOrderByIdQuery via CQRS
   */
  async getOrderById(orderId: string, includeRelations = false): Promise<OrderRecord | null> {
    const query = new GetOrderByIdQuery(orderId, includeRelations);
    return await this.queryBus.execute(query);
  }

  /**
   * Get multiple orders with filtering and pagination
   * Delegates to GetOrdersQuery via CQRS
   */
  async getOrders(
    filters?: {
      branch?: string;
      orderStatus?: string;
      startDate?: string;
      endDate?: string;
      clientEmail?: string;
      whatsappEnabled?: boolean;
    },
    pagination?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ data: OrderRecord[]; total: number }> {
    const query = new GetOrdersQuery(filters, pagination);
    return await this.queryBus.execute(query);
  }

  /**
   * Get order statistics
   * Delegates to GetOrderStatsQuery via CQRS
   */
  async getOrderStats(
    period: 'day' | 'week' | 'month' | 'year',
    branch?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<OrderStats> {
    const query = new GetOrderStatsQuery(
      period,
      branch,
      startDate?.toISOString(),
      endDate?.toISOString(),
    );
    return await this.queryBus.execute(query);
  }

  /**
   * Update order processing status
   * Delegates to UpdateOrderProcessingCommand via CQRS
   */
  async updateOrderProcessing(
    orderId: string,
    workflowId?: string,
    jobId?: string,
    correlationId?: string,
  ): Promise<void> {
    const command = new UpdateOrderProcessingCommand(
      orderId,
      workflowId,
      jobId,
      correlationId,
    );
    return await this.commandBus.execute(command);
  }

  /**
   * Get order by order_id
   * Uses GetOrderByIdQuery
   */
  async getOrderByOrderId(orderId: string): Promise<OrderRecord | null> {
    return this.getOrderById(orderId);
  }

  /**
   * Query orders with legacy filter format
   * Transforms to use GetOrdersQuery
   */
  async queryOrders(filters: {
    limit?: number;
    offset?: number;
    country?: string;
    status?: string;
    from_date?: string;
    to_date?: string;
  } = {}): Promise<OrderRecord[]> {
    const queryFilters: {
      orderStatus?: string;
      startDate?: string;
      endDate?: string;
    } = {};
    
    if (filters.status) {
      queryFilters.orderStatus = filters.status;
    }
    
    if (filters.from_date || filters.to_date) {
      queryFilters.startDate = filters.from_date || undefined;
      queryFilters.endDate = filters.to_date || undefined;
    }

    const pagination = {
      page: filters.offset ? Math.floor(filters.offset / (filters.limit || 100)) + 1 : 1,
      limit: filters.limit || 100,
    };

    const result = await this.getOrders(queryFilters, pagination);
    return result.data;
  }

  /**
   * Get orders by client email
   * Uses GetOrdersQuery with email filter
   */
  async getOrdersByClientEmail(email: string): Promise<OrderRecord[]> {
    const result = await this.getOrders({ clientEmail: email });
    return result.data;
  }

  /**
   * Get orders by branch
   * Uses GetOrdersQuery with branch filter
   */
  async getOrdersByBranch(branch: string, limit = 100, offset = 0): Promise<OrderRecord[]> {
    const pagination = {
      page: Math.floor(offset / limit) + 1,
      limit,
    };
    const result = await this.getOrders({ branch }, pagination);
    return result.data;
  }
}