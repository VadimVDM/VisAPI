import { Injectable, Logger } from '@nestjs/common';
import { ViziWebhookDto } from '@visapi/visanet-types';
import {
  OrderRecord,
  OrdersRepository,
  OrderFilters,
} from '@visapi/backend-repositories';
import { OrderTransformerService } from './services/order-transformer.service';

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
  ) {}

  async createOrder(
    webhookData: ViziWebhookDto,
    _correlationId?: string,
  ): Promise<string> {
    const orderData = this.orderTransformerService.transformWebhookToOrder(webhookData);
    const newOrder = await this.ordersRepository.create(orderData);
    return newOrder.id;
  }

  async syncOrderToCBB(
    orderId: string,
    branch: string,
    whatsappAlertsEnabled: boolean,
    _correlationId?: string,
  ): Promise<void> {
    // This is a simplified implementation.
    // You might want to move the logic from the SyncOrderToCBBCommandHandler here.
    this.logger.log(
      `Syncing order ${orderId} to CBB for branch ${branch}. WhatsApp alerts: ${whatsappAlertsEnabled}`,
    );
    // Return to satisfy async function requirement
    return;
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
        startDate: filters.from_date,
        endDate: filters.to_date,
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
