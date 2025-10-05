import { Injectable, Logger } from '@nestjs/common';
import { ViziWebhookDto } from '@visapi/visanet-types';
import {
  OrderRecord,
  OrdersRepository,
  OrderFilters,
} from '@visapi/backend-repositories';
import { OrderTransformerService } from './services/order-transformer.service';
import { OrderSyncService } from './services/order-sync.service';
import { EventBusService, OrderCreatedEvent } from '@visapi/backend-events';

export interface OrderStats {
  totalOrders: number;
  totalAmount: number;
  averageAmount: number;
  statusCounts: Record<string, number>;
  branchCounts: Record<string, number>;
  countryCounts: Record<string, number>;
  period: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderTransformerService: OrderTransformerService,
    private readonly orderSyncService: OrderSyncService,
    private readonly eventBusService: EventBusService,
  ) {}

  async createOrder(
    webhookData: ViziWebhookDto,
    correlationId?: string,
  ): Promise<string> {
    const orderData =
      this.orderTransformerService.transformWebhookToOrder(webhookData);

    try {
      const newOrder = await this.ordersRepository.create(orderData);

      // Publish domain event for audit trail
      await this.eventBusService.publish(
        new OrderCreatedEvent(
          newOrder.order_id,
          newOrder.client_email,
          newOrder.branch,
          newOrder.amount,
          correlationId,
          newOrder.id,
        ),
      );

      // Trigger CBB sync for IL branch orders (streamlined without CQRS)
      await this.orderSyncService.queueCBBSync({
        orderId: newOrder.order_id,
        branch: newOrder.branch,
        whatsappAlertsEnabled: newOrder.whatsapp_alerts_enabled,
      });

      this.logger.log(
        `Order ${newOrder.order_id} created successfully and queued for processing`,
      );

      return newOrder.id;
    } catch (error) {
      // Handle duplicate orders gracefully
      const isDuplicateError =
        error instanceof Error &&
        (('code' in error && error.code === '23505') ||
          error.message?.includes('duplicate key'));

      if (isDuplicateError) {
        this.logger.warn(
          `Order ${orderData.order_id} already exists, returning existing order`,
        );

        const existingOrder = await this.ordersRepository.findOne({
          order_id: orderData.order_id,
        });

        if (existingOrder) {
          return existingOrder.id;
        }
      }

      throw error;
    }
  }

  async getOrderById(
    orderId: string,
    _includeRelations = false,
  ): Promise<OrderRecord | null> {
    return this.ordersRepository.findById(orderId);
  }

  async getOrders(
    filters?: OrderFilters,
    pagination?: { page: number; limit: number },
  ): Promise<{ data: OrderRecord[]; total: number }> {
    const data = await this.ordersRepository.findMany({
      where: filters,
      limit: pagination?.limit,
      offset: pagination ? (pagination.page - 1) * pagination.limit : undefined,
    });
    const total = await this.ordersRepository.count(filters);
    return { data, total };
  }

  getOrderStats(
    period: 'day' | 'week' | 'month' | 'year',
    _branch?: string,
    _startDate?: Date,
    _endDate?: Date,
  ): OrderStats {
    // This is a simplified implementation.
    // You might want to move the logic from the GetOrderStatsQueryHandler here.
    return {
      totalOrders: 0,
      totalAmount: 0,
      averageAmount: 0,
      statusCounts: {},
      branchCounts: {},
      countryCounts: {},
      period,
    };
  }

  async updateOrderProcessing(
    orderId: string,
    workflowId?: string,
    jobId?: string,
    _correlationId?: string,
  ): Promise<void> {
    await this.ordersRepository.update(orderId, {
      processed_at: new Date().toISOString(),
      workflow_id: workflowId,
      job_id: jobId,
    });
  }

  async getOrderByOrderId(orderId: string): Promise<OrderRecord | null> {
    return this.ordersRepository.findOne({ order_id: orderId });
  }

  async queryOrders(
    filters: {
      limit?: number;
      offset?: number;
      country?: string;
      status?: string;
      from_date?: string;
      to_date?: string;
    } = {},
  ): Promise<OrderRecord[]> {
    const { data } = await this.getOrders(
      {
        order_status: filters.status,
        dateFrom: filters.from_date,
        dateTo: filters.to_date,
      },
      {
        page: filters.offset
          ? Math.floor(filters.offset / (filters.limit || 100)) + 1
          : 1,
        limit: filters.limit || 100,
      },
    );
    return data;
  }

  async getOrdersByClientEmail(email: string): Promise<OrderRecord[]> {
    const { data } = await this.getOrders({ client_email: email });
    return data;
  }

  async getOrdersByBranch(
    branch: string,
    limit = 100,
    offset = 0,
  ): Promise<OrderRecord[]> {
    const { data } = await this.getOrders(
      { branch },
      {
        page: Math.floor(offset / limit) + 1,
        limit,
      },
    );
    return data;
  }
}
