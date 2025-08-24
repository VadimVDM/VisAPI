import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { ViziWebhooksService } from './vizi-webhooks.service';
import { ViziWebhookDto } from '@visapi/visanet-types';
import { LogService } from '@visapi/backend-logging';
import { OrdersService } from '../orders/orders.service';
import { IdempotencyService } from '@visapi/util-redis';
import { RetriggerOrdersDto, RetriggerResultDto } from './dto/retrigger-orders.dto';

@Controller('v1/webhooks/vizi')
@ApiTags('Vizi Webhooks')
export class ViziWebhooksController {
  private readonly logger: Logger;

  constructor(
    private readonly viziWebhooksService: ViziWebhooksService,
    private readonly ordersService: OrdersService,
    private readonly idempotencyService: IdempotencyService,
    private readonly logService: LogService,
  ) {
    this.logger = new Logger(ViziWebhooksController.name);
  }

  @Post('orders')
  @UseGuards(ApiKeyGuard)
  @Scopes('webhook:vizi', 'logs:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive order data from Vizi app',
    description:
      'Processes visa order webhooks from the Vizi application with idempotency support',
  })
  @ApiBearerAuth('api-key')
  @ApiBody({
    type: ViziWebhookDto,
    description: 'Vizi webhook payload containing form and order data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook payload',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async handleViziOrder(
    @Body() body: unknown, // Accept unknown to handle validation ourselves
    @Headers() headers: Record<string, string>,
  ) {
    const correlationId =
      headers['x-correlation-id'] || headers['x-request-id'];
    const idempotencyKey = headers['x-idempotency-key'];

    // Type guard functions for safer type checking
    const isRecord = (value: unknown): value is Record<string, unknown> => {
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    };

    const hasProperty = <K extends string>(
      obj: Record<string, unknown>,
      key: K,
    ): obj is Record<string, unknown> & Record<K, unknown> => {
      return key in obj;
    };

    // Transform and validate the webhook data
    if (!isRecord(body)) {
      throw new BadRequestException('Invalid webhook payload format');
    }

    const bodyAsRecord = body;
    
    // Safely access nested properties
    const order = isRecord(bodyAsRecord.order) ? bodyAsRecord.order : undefined;
    const form = isRecord(bodyAsRecord.form) ? bodyAsRecord.form : undefined;
    
    try {
      // Normalize branch to lowercase if present
      if (order && hasProperty(order, 'branch') && typeof order.branch === 'string') {
        order.branch = order.branch.toLowerCase();
      }

      // Ensure payment_processor is valid
      const validProcessors = [
        'stripe',
        'paypal',
        'tbank',
        'bill',
        'bit',
        'paybox',
      ];
      if (
        order &&
        hasProperty(order, 'payment_processor') &&
        typeof order.payment_processor === 'string' &&
        !validProcessors.includes(order.payment_processor)
      ) {
        this.logger.warn(
          `Invalid payment processor: ${order.payment_processor}, defaulting to stripe`,
        );
        order.payment_processor = 'stripe';
      }

      // Ensure status is valid
      const validStatuses = ['active', 'completed', 'issue', 'canceled'];
      if (
        order &&
        hasProperty(order, 'status') &&
        typeof order.status === 'string' &&
        !validStatuses.includes(order.status)
      ) {
        this.logger.warn(
          `Invalid order status: ${order.status}, defaulting to active`,
        );
        order.status = 'active';
      }
    } catch (error) {
      this.logger.error(
        `Error normalizing webhook data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Log incoming webhook with detailed validation info
    const client = form && isRecord(form.client) ? form.client : undefined;
    const product = form && isRecord(form.product) ? form.product : undefined;
    const phone = client && isRecord(client.phone) ? client.phone : undefined;
    const applicants = form && Array.isArray(form.applicants) ? form.applicants : undefined;

    const webhookValidation = {
      hasOrder: !!order,
      hasForm: !!form,
      orderId: order && hasProperty(order, 'id') ? String(order.id) : undefined,
      formId: form && hasProperty(form, 'id') ? String(form.id) : undefined,
      country: form && hasProperty(form, 'country') ? String(form.country) : undefined,
      clientData: client
        ? {
            name: hasProperty(client, 'name') ? String(client.name) : undefined,
            email: hasProperty(client, 'email') ? String(client.email) : undefined,
            hasPhone: !!phone,
            phoneCode: phone && hasProperty(phone, 'code') ? String(phone.code) : undefined,
            phoneNumber: phone && hasProperty(phone, 'number') ? String(phone.number) : undefined,
            whatsappEnabled: hasProperty(client, 'whatsappAlertsEnabled') ? Boolean(client.whatsappAlertsEnabled) : false,
          }
        : null,
      productData: product
        ? {
            name: hasProperty(product, 'name') ? String(product.name) : undefined,
            country: hasProperty(product, 'country') ? String(product.country) : undefined,
          }
        : null,
      applicantCount: applicants?.length || 0,
    };

    await this.logService.createLog({
      level: 'info',
      message: `Vizi webhook received for order ${webhookValidation.orderId || 'unknown'}`,
      metadata: {
        webhook_type: 'vizi_order',
        validation: webhookValidation,
        webhook_data: bodyAsRecord, // Save full payload immediately upon receipt
        correlationId,
        idempotencyKey,
        source: 'webhook',
      },
      correlation_id: correlationId,
    });

    // Check idempotency if key provided
    if (idempotencyKey) {
      const cached = await this.idempotencyService.get(idempotencyKey);
      if (cached) {
        this.logger.log(`Returning cached response for idempotency key: ${idempotencyKey}`);
        return cached;
      }
    }

    try {
      // Validate webhook payload based on country
      if (!form || !order) {
        throw new BadRequestException('Missing required form or order data');
      }

      // Cast to ViziWebhookDto after normalization
      const webhookData = bodyAsRecord as unknown as ViziWebhookDto;

      // Save order to database first
      let orderId: string;
      try {
        orderId = await this.ordersService.createOrder(webhookData);
        const orderIdStr = order && hasProperty(order, 'id') ? String(order.id) : 'unknown';
        this.logger.log(
          `Order saved to database: ${orderIdStr} (DB ID: ${orderId})`,
        );
      } catch (error) {
        const err = error as Record<string, unknown>;
        const errorDetails = {
          message: err.message,
          code: err.code,
          detail: err.detail,
          stack: err.stack,
        };

        const failedOrderId = order && hasProperty(order, 'id') ? String(order.id) : 'unknown';
        this.logger.error(
          `Failed to save order ${failedOrderId} to database: ${JSON.stringify(errorDetails)}`,
          typeof err.stack === 'string' ? err.stack : undefined,
        );

        // Log the failed order creation with full details
        const failedFormId = form && hasProperty(form, 'id') ? String(form.id) : undefined;
        await this.logService.createLog({
          level: 'error',
          message: `Order creation failed for ${failedOrderId}`,
          metadata: {
            webhook_type: 'vizi_order',
            order_id: failedOrderId === 'unknown' ? undefined : failedOrderId,
            form_id: failedFormId,
            error: errorDetails,
            webhook_data: bodyAsRecord,
            correlationId,
            source: 'webhook',
          },
          correlation_id: correlationId,
        });

        // Throw the error to prevent marking webhook as successful
        throw new BadRequestException(
          `Failed to save order to database: ${(error as Error).message}`,
        );
      }

      // Process the webhook only if order was saved successfully
      const result = await this.viziWebhooksService.processViziOrder(
        webhookData,
        correlationId,
      );

      // Store result for idempotency
      if (idempotencyKey) {
        await this.idempotencyService.set(idempotencyKey, result, 86400); // 24 hours
      }

      // Log success WITH FULL WEBHOOK DATA
      const orderIdStr = order && hasProperty(order, 'id') ? String(order.id) : 'unknown';
      const formIdStr = form && hasProperty(form, 'id') ? String(form.id) : undefined;
      await this.logService.createLog({
        level: 'info',
        message: `Order ${orderIdStr} created successfully from Vizi webhook`,
        metadata: {
          webhook_type: 'vizi_order',
          order_id: orderIdStr === 'unknown' ? undefined : orderIdStr,
          form_id: formIdStr,
          order_db_id: orderId,
          result_status: result.status,
          webhook_data: bodyAsRecord, // Save full payload for data recovery
          correlationId,
          source: 'webhook',
        },
        correlation_id: correlationId,
      });

      return result;
    } catch (error) {
      // Log error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      const orderIdStr = order && hasProperty(order, 'id') ? String(order.id) : 'unknown';
      const formIdStr = form && hasProperty(form, 'id') ? String(form.id) : undefined;
      await this.logService.createLog({
        level: 'error',
        message: `Failed to process Vizi webhook for order ${orderIdStr}`,
        metadata: {
          webhook_type: 'vizi_order',
          order_id: orderIdStr === 'unknown' ? undefined : orderIdStr,
          form_id: formIdStr,
          error: errorMessage,
          stack: errorStack,
          correlationId,
          source: 'webhook',
        },
        correlation_id: correlationId,
      });

      throw error;
    }
  }

  @Post('retrigger')
  @UseGuards(ApiKeyGuard)
  @Scopes('webhook:vizi', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrigger order creation from stored webhook data',
    description:
      'Retriggers order creation for single or multiple orders using previously stored webhook data. Useful for recovery scenarios.',
  })
  @ApiBearerAuth('api-key')
  @ApiBody({
    type: RetriggerOrdersDto,
    description: 'Retrigger configuration',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrigger operation completed',
    type: RetriggerResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid retrigger parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async retriggerOrders(
    @Body() dto: RetriggerOrdersDto,
    @Headers() headers: Record<string, string>,
  ): Promise<RetriggerResultDto> {
    const correlationId =
      headers['x-correlation-id'] || headers['x-request-id'] || `retrigger-${Date.now()}`;

    this.logger.log(
      `Starting retrigger operation: mode=${dto.mode}, correlationId=${correlationId}`,
    );

    // Log the retrigger request
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

    try {
      const result = await this.viziWebhooksService.retriggerOrders(dto);

      this.logger.log(
        `Retrigger operation completed: successful=${result.successful}, failed=${result.failed}, skipped=${result.skipped}`,
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.logService.createLog({
        level: 'error',
        message: 'Retrigger operation failed',
        metadata: {
          error: errorMessage,
          mode: dto.mode,
          source: 'retrigger',
        },
        correlation_id: correlationId,
      });

      throw error;
    }
  }
}
