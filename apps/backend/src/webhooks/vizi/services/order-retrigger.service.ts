import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { LogService } from '@visapi/backend-logging';
import {
  RetriggerMode,
  RetriggerOrdersDto,
  RetriggerResultDto,
} from '../dto/retrigger-orders.dto';
import { OrdersService } from '../../../orders/orders.service';
import { ViziOrderWorkflowService } from './order-workflow.service';
import { ViziWebhookDto } from '@visapi/visanet-types';

interface WebhookMetadataLog {
  metadata: {
    webhook_type?: string;
    webhook_data?: ViziWebhookDto;
    order_id?: string;
  } | null;
  created_at?: string;
}

@Injectable()
export class ViziOrderRetriggerService {
  private readonly logger = new Logger(ViziOrderRetriggerService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logService: LogService,
    private readonly ordersService: OrdersService,
    private readonly orderWorkflowService: ViziOrderWorkflowService,
  ) {}

  async retriggerOrders(
    dto: RetriggerOrdersDto,
    correlationId: string,
  ): Promise<RetriggerResultDto> {
    const payloads = await this.resolveWebhookPayloads(dto);

    await this.logService.createLog({
      level: 'info',
      message: 'Retrigger operation initiated',
      metadata: {
        mode: dto.mode,
        orderId: dto.orderId,
        orderIds: dto.orderIds,
        startDate: dto.startDate,
        endDate: dto.endDate,
        skipProcessed: dto.skipProcessed,
        source: 'retrigger',
      },
      correlation_id: correlationId,
    });

    const summary: RetriggerResultDto = {
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    for (const { orderId, webhookData } of payloads) {
      try {
        if (dto.skipProcessed && (await this.orderExists(orderId))) {
          summary.skipped++;
          summary.details.push({
            orderId,
            status: 'skipped',
            message: 'Order already exists in database',
          });
          continue;
        }

        await this.handleOrderRetrigger(orderId, webhookData);
        summary.successful++;
        summary.details.push({
          orderId,
          status: 'success',
          message: 'Order retriggered successfully',
        });
      } catch (error) {
        const { message, details } = this.serializeError(error);
        summary.failed++;
        summary.details.push({
          orderId,
          status: 'failed',
          error: message,
        });

        await this.logService.createLog({
          level: 'error',
          message: `Failed to retrigger order ${orderId}`,
          metadata: {
            orderId,
            error: message,
            errorDetails: details,
            retrigger: true,
            source: 'retrigger',
            correlationId: `retrigger-${orderId}-${Date.now()}`,
          },
          correlation_id: correlationId,
        });
      }
    }

    await this.logService.createLog({
      level: 'info',
      message: 'Retrigger operation completed',
      metadata: {
        successful: summary.successful,
        failed: summary.failed,
        skipped: summary.skipped,
        mode: dto.mode,
        source: 'retrigger',
      },
      correlation_id: correlationId,
    });

    return summary;
  }

  private async resolveWebhookPayloads(
    dto: RetriggerOrdersDto,
  ): Promise<Array<{ orderId: string; webhookData: ViziWebhookDto }>> {
    if (dto.mode === RetriggerMode.SINGLE) {
      if (!dto.orderId) {
        throw new BadRequestException('orderId is required for single mode');
      }
      const payload = await this.getWebhookDataForOrder(dto.orderId);
      if (!payload) {
        throw new BadRequestException(
          `No webhook data found for order ${dto.orderId}`,
        );
      }
      return [{ orderId: dto.orderId, webhookData: payload }];
    }

    if (dto.mode === RetriggerMode.BULK) {
      if (dto.orderIds?.length) {
        const results: Array<{ orderId: string; webhookData: ViziWebhookDto }> = [];
        for (const orderId of dto.orderIds) {
          const payload = await this.getWebhookDataForOrder(orderId);
          if (payload) {
            results.push({ orderId, webhookData: payload });
          }
        }
        return results;
      }

      if (dto.startDate || dto.endDate) {
        return this.getWebhookDataByDateRange(dto.startDate, dto.endDate);
      }

      throw new BadRequestException(
        'Either orderIds or date range (startDate/endDate) is required for bulk mode',
      );
    }

    return [];
  }

  private async handleOrderRetrigger(
    orderId: string,
    webhookData: ViziWebhookDto,
  ) {
    const correlationId = `retrigger-${orderId}-${Date.now()}`;

    await this.logService.createLog({
      level: 'info',
      message: `Retriggering order ${orderId}`,
      metadata: {
        orderId,
        retrigger: true,
        correlationId,
        source: 'retrigger',
        webhook_data: webhookData,
      },
      correlation_id: correlationId,
      skipPiiRedaction: true,
    });

    const normalizedPayload = this.normalizePayload(webhookData);

    let dbOrderId: string;
    try {
      dbOrderId = await this.ordersService.createOrder(normalizedPayload);
      this.logger.log(`Order saved to database: ${orderId} (DB ID: ${dbOrderId})`);
    } catch (error) {
      await this.handleOrderPersistenceError({
        orderId,
        error,
        webhookData: normalizedPayload,
        correlationId,
      });
      throw error;
    }

    const processResult = await this.orderWorkflowService.processOrder(
      normalizedPayload,
      correlationId,
    );

    await this.logService.createLog({
      level: 'info',
      message: `Order ${orderId} created successfully from retrigger`,
      metadata: {
        webhook_type: 'vizi_order',
        order_id: orderId,
        order_db_id: dbOrderId,
        result_status: processResult.status,
        webhook_data: normalizedPayload,
        correlationId,
        source: 'retrigger',
        retrigger: true,
      },
      correlation_id: correlationId,
      skipPiiRedaction: true,
    });
  }

  private normalizePayload(payload: ViziWebhookDto): ViziWebhookDto {
    const normalized = JSON.parse(JSON.stringify(payload)) as ViziWebhookDto;
    const { order } = normalized;

    if (order?.branch) {
      order.branch = order.branch.toLowerCase() as typeof order.branch;
    }

    const validProcessors = [
      'stripe',
      'paypal',
      'tbank',
      'bill',
      'bit',
      'paybox',
    ];
    if (order?.payment_processor && !validProcessors.includes(order.payment_processor)) {
      this.logger.warn(
        `Invalid payment processor: ${order.payment_processor}, defaulting to stripe`,
      );
      order.payment_processor = 'stripe';
    }

    const validStatuses = ['active', 'completed', 'issue', 'canceled'];
    if (order?.status && !validStatuses.includes(order.status)) {
      this.logger.warn(`Invalid order status: ${order.status}, defaulting to active`);
      order.status = 'active';
    }

    return normalized;
  }

  private async handleOrderPersistenceError({
    orderId,
    error,
    webhookData,
    correlationId,
  }: {
    orderId: string;
    error: unknown;
    webhookData: ViziWebhookDto;
    correlationId: string;
  }) {
    const err = error as Record<string, unknown>;
    const errorDetails = {
      message: err.message,
      code: err.code,
      detail: err.detail,
      stack: err.stack,
    };

    this.logger.error(
      `Failed to save order ${orderId} to database during retrigger: ${JSON.stringify(
        errorDetails,
      )}`,
      typeof err.stack === 'string' ? err.stack : undefined,
    );

    await this.logService.createLog({
      level: 'error',
      message: `Order creation failed during retrigger for ${orderId}`,
      metadata: {
        webhook_type: 'vizi_order',
        order_id: orderId,
        error: errorDetails,
        webhook_data: webhookData,
        correlationId,
        source: 'retrigger',
        retrigger: true,
      },
      correlation_id: correlationId,
      skipPiiRedaction: true,
    });
  }

  private serializeError(error: unknown) {
    if (error instanceof Error) {
      const details: Record<string, unknown> = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };

      if ('code' in error) {
        details.code = (error as Error & { code?: unknown }).code;
      }
      if ('details' in error) {
        details.details = (error as Error & { details?: unknown }).details;
      }
      if ('response' in error) {
        details.response = (error as Error & { response?: unknown }).response;
      }

      return {
        message: error.message,
        details,
      };
    }

    return {
      message: typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error),
      details: {
        type: typeof error,
        value: JSON.stringify(error),
        stringified: typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error),
      },
    };
  }

  private async getWebhookDataForOrder(
    orderId: string,
  ): Promise<ViziWebhookDto | null> {
    const supabase = this.supabaseService.client;

    const { data, error } = await supabase
      .from('logs')
      .select('metadata, created_at')
      .eq('metadata->webhook_type', 'vizi_order')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data) {
      this.logger.warn(`No logs found when searching for order ${orderId}`);
      return null;
    }

    for (const log of data as unknown as WebhookMetadataLog[]) {
      const metadata = log.metadata;
      const webhookData = metadata?.webhook_data;
      if (!webhookData) {
        continue;
      }

      const webhookOrderId = webhookData.order?.id;
      const metadataOrderId = metadata?.order_id;

      if (webhookOrderId === orderId || metadataOrderId === orderId) {
        this.logger.log(`Found webhook data for order ${orderId}`);
        return webhookData;
      }
    }

    this.logger.warn(
      `No webhook data found for order ${orderId} after checking ${data.length} logs`,
    );
    return null;
  }

  private async getWebhookDataByDateRange(
    startDate?: string,
    endDate?: string,
  ): Promise<Array<{ orderId: string; webhookData: ViziWebhookDto }>> {
    const supabase = this.supabaseService.client;

    let query = supabase
      .from('logs')
      .select('metadata, created_at')
      .eq('metadata->webhook_type', 'vizi_order');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    query = query.order('created_at', { ascending: false }).limit(1000);

    const { data, error } = await query;

    if (error || !data) {
      this.logger.error(
        `Failed to fetch webhook data by date range: ${error?.message}`,
      );
      return [];
    }

    const results: Array<{ orderId: string; webhookData: ViziWebhookDto }> = [];

    for (const log of data as unknown as WebhookMetadataLog[]) {
      const metadata = log.metadata;
      const webhookData = metadata?.webhook_data;
      const orderId = webhookData?.order?.id || metadata?.order_id;

      if (orderId && webhookData) {
        results.push({ orderId, webhookData });
        this.logger.log(`Found webhook data for order ${orderId}`);
      }
    }

    this.logger.log(
      `Found ${results.length} vizi_order webhook payloads in date range`,
    );
    return results;
  }

  private async orderExists(orderId: string): Promise<boolean> {
    const supabase = this.supabaseService.client;

    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('order_id', orderId)
      .limit(1);

    if (error) {
      this.logger.error(`Failed to check if order exists: ${error.message}`);
      return false;
    }

    return Boolean(data?.length);
  }
}
