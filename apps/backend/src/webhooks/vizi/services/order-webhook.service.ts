import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OrdersService } from '../../../orders/orders.service';
import { IdempotencyService } from '@visapi/util-redis';
import { LogService } from '@visapi/backend-logging';
import {
  OrderWorkflowResult,
  ViziOrderWorkflowService,
} from './order-workflow.service';
import { ViziWebhookDto } from '@visapi/visanet-types';

interface WebhookHeaders {
  correlationId?: string;
  requestId?: string;
  idempotencyKey?: string;
}

type OrderWebhookResponse =
  | OrderWorkflowResult
  | {
      status: 'skipped';
      message: string;
      orderId?: string;
    };

@Injectable()
export class ViziOrderWebhookService {
  private readonly logger = new Logger(ViziOrderWebhookService.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly idempotencyService: IdempotencyService,
    private readonly logService: LogService,
    private readonly orderWorkflowService: ViziOrderWorkflowService,
  ) {}

  /**
   * Helper to safely convert unknown values to strings for logging
   */
  private safeStringify(value: unknown): string {
    if (value === null || value === undefined) {
      return 'unknown';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value ?? 'unknown');
  }

  async handleInboundWebhook(
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<OrderWebhookResponse> {
    const { correlationId, idempotencyKey } = this.parseHeaders(headers);
    const body = this.assertRecord(payload);
    const order = this.extractRecord(body.order);
    const form = this.extractRecord(body.form);

    const orderId = this.extractOrderId(order);
    if (orderId && orderId.endsWith('-TEST')) {
      await this.logTestOrderSkip({ correlationId, orderId });
      return {
        status: 'skipped',
        message: 'Test order skipped (ends with -TEST)',
        orderId,
      };
    }

    this.logInboundWebhook({
      body,
      order,
      form,
      correlationId,
      idempotencyKey,
    });

    if (idempotencyKey) {
      const cached: unknown = await this.idempotencyService.get(idempotencyKey);
      if (cached && typeof cached === 'object' && cached !== null) {
        this.logger.log(
          `Returning cached response for idempotency key: ${idempotencyKey}`,
        );
        return cached as OrderWebhookResponse;
      }
    }

    if (!order || !form) {
      throw new BadRequestException('Missing required form or order data');
    }

    this.normalizeOrder(order);

    const webhookData = body as unknown as ViziWebhookDto;

    let dbOrderId: string;
    try {
      dbOrderId = await this.ordersService.createOrder(webhookData);
      this.logger.log(
        `Order saved to database: ${this.safeStringify(order.id)} (DB ID: ${dbOrderId})`,
      );
    } catch (error) {
      await this.handleDatabaseFailure({
        error,
        order,
        form,
        body,
        correlationId,
      });
      throw new BadRequestException(
        `Failed to save order to database: ${(error as Error).message}`,
      );
    }

    try {
      const result = await this.orderWorkflowService.processOrder(
        webhookData,
        correlationId,
      );

      if (idempotencyKey) {
        await this.idempotencyService.set(idempotencyKey, result, 86400);
      }

      await this.logService.createLog({
        level: 'info',
        message: `Order ${this.safeStringify(order.id)} created successfully from Vizi webhook`,
        metadata: {
          webhook_type: 'vizi_order',
          order_id: order.id,
          form_id: form.id,
          order_db_id: dbOrderId,
          result_status: result.status,
          webhook_data: body,
          correlationId,
          source: 'webhook',
        },
        correlation_id: correlationId,
        skipPiiRedaction: true,
      });

      return result;
    } catch (error) {
      await this.logService.createLog({
        level: 'error',
        message: `Failed to process Vizi webhook for order ${this.safeStringify(order.id)}`,
        metadata: {
          webhook_type: 'vizi_order',
          order_id: order.id,
          form_id: form.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          correlationId,
          source: 'webhook',
        },
        correlation_id: correlationId,
      });

      throw error;
    }
  }

  private parseHeaders(headers: Record<string, string>): WebhookHeaders {
    return {
      correlationId:
        headers['x-correlation-id'] || headers['x-request-id'] || undefined,
      requestId: headers['x-request-id'],
      idempotencyKey: headers['x-idempotency-key'] || undefined,
    };
  }

  private assertRecord(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    throw new BadRequestException('Invalid webhook payload format');
  }

  private extractRecord(value: unknown): Record<string, unknown> | undefined {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return undefined;
  }

  private extractOrderId(order?: Record<string, unknown>) {
    if (!order) {
      return undefined;
    }
    const value = order.id;
    return typeof value === 'string' ? value : value ? this.safeStringify(value) : undefined;
  }

  private async logTestOrderSkip({
    correlationId,
    orderId,
  }: {
    correlationId?: string;
    orderId: string;
  }) {
    this.logger.log(`Skipping test order: ${orderId} (ends with -TEST)`);

    await this.logService.createLog({
      level: 'info',
      message: `Test order ${orderId} skipped (ends with -TEST)`,
      metadata: {
        webhook_type: 'vizi_order',
        order_id: orderId,
        skipped_reason: 'test_order',
        correlationId,
        source: 'webhook',
      },
      correlation_id: correlationId,
    });
  }

  private logInboundWebhook({
    body,
    order,
    form,
    correlationId,
    idempotencyKey,
  }: {
    body: Record<string, unknown>;
    order?: Record<string, unknown>;
    form?: Record<string, unknown>;
    correlationId?: string;
    idempotencyKey?: string;
  }) {
    const validation = {
      hasOrder: Boolean(order),
      hasForm: Boolean(form),
      orderId: this.extractOrderId(order),
      formId: form?.id ? this.safeStringify(form.id) : undefined,
      country: form?.country ? this.safeStringify(form.country) : undefined,
      clientData: this.extractClientData(form?.client),
      productData: this.extractProductData(form?.product),
      applicantCount: Array.isArray(form?.applicants)
        ? form?.applicants.length
        : 0,
    };

    void this.logService.createLog({
      level: 'info',
      message: `Vizi webhook received for order ${validation.orderId || 'unknown'}`,
      metadata: {
        webhook_type: 'vizi_order',
        validation,
        webhook_data: body,
        correlationId,
        idempotencyKey,
        source: 'webhook',
      },
      correlation_id: correlationId,
      skipPiiRedaction: true,
    });
  }

  private extractClientData(client: unknown) {
    if (typeof client !== 'object' || client === null) {
      return null;
    }
    const record = client as Record<string, unknown>;
    const phone = record.phone as Record<string, unknown> | undefined;
    return {
      name: record.name ? this.safeStringify(record.name) : undefined,
      email: record.email ? this.safeStringify(record.email) : undefined,
      hasPhone: Boolean(phone),
      phoneCode: phone?.code ? this.safeStringify(phone.code) : undefined,
      phoneNumber: phone?.number ? this.safeStringify(phone.number) : undefined,
      whatsappEnabled: Boolean(record.whatsappAlertsEnabled),
    };
  }

  private extractProductData(product: unknown) {
    if (typeof product !== 'object' || product === null) {
      return null;
    }
    const record = product as Record<string, unknown>;
    return {
      name: record.name ? this.safeStringify(record.name) : undefined,
      country: record.country ? this.safeStringify(record.country) : undefined,
    };
  }

  private normalizeOrder(order: Record<string, unknown>) {
    const branch = order.branch;
    if (typeof branch === 'string') {
      order.branch = branch.toLowerCase();
    }

    const validProcessors = [
      'stripe',
      'paypal',
      'tbank',
      'bill',
      'bit',
      'paybox',
    ];
    if (
      typeof order.payment_processor === 'string' &&
      !validProcessors.includes(order.payment_processor)
    ) {
      this.logger.warn(
        `Invalid payment processor: ${order.payment_processor}, defaulting to stripe`,
      );
      order.payment_processor = 'stripe';
    }

    const validStatuses = ['active', 'completed', 'issue', 'canceled'];
    if (
      typeof order.status === 'string' &&
      !validStatuses.includes(order.status)
    ) {
      this.logger.warn(`Invalid order status: ${order.status}, defaulting to active`);
      order.status = 'active';
    }
  }

  private async handleDatabaseFailure({
    error,
    order,
    form,
    body,
    correlationId,
  }: {
    error: unknown;
    order?: Record<string, unknown>;
    form?: Record<string, unknown>;
    body: Record<string, unknown>;
    correlationId?: string;
  }) {
    const err = error as Record<string, unknown>;
    const errorDetails = {
      message: err.message,
      code: err.code,
      detail: err.detail,
      stack: err.stack,
    };

    const orderId = order?.id ? this.safeStringify(order.id) : 'unknown';
    this.logger.error(
      `Failed to save order ${orderId} to database: ${JSON.stringify(errorDetails)}`,
      typeof err.stack === 'string' ? err.stack : undefined,
    );

    await this.logService.createLog({
      level: 'error',
      message: `Order creation failed for ${orderId}`,
      metadata: {
        webhook_type: 'vizi_order',
        order_id: orderId === 'unknown' ? undefined : orderId,
        form_id: form?.id ? this.safeStringify(form.id) : undefined,
        error: errorDetails,
        webhook_data: body,
        correlationId,
        source: 'webhook',
      },
      correlation_id: correlationId,
      skipPiiRedaction: true,
    });
  }
}
