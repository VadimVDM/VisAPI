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
import {
  RetriggerOrdersDto,
  RetriggerResultDto,
} from './dto/retrigger-orders.dto';
import {
  ResyncCBBContactDto,
  ResyncCBBResultDto,
} from './dto/resync-cbb-contact.dto';
import {
  RetriggerWhatsAppDto,
  RetriggerWhatsAppResultDto,
} from './dto/retrigger-whatsapp.dto';
import { CommandBus } from '@nestjs/cqrs';
import { ResyncCBBContactCommand } from '../orders/commands/resync-cbb-contact.command';
import { OrdersRepository } from '@visapi/backend-repositories';
import {
  CBBContactSyncResult,
  QUEUE_NAMES,
  JOB_NAMES,
} from '@visapi/shared-types';
import { QueueService } from '../queue/queue.service';
import { SupabaseService } from '@visapi/core-supabase';

@Controller('v1/webhooks/vizi')
@ApiTags('Vizi Webhooks')
export class ViziWebhooksController {
  private readonly logger: Logger;

  constructor(
    private readonly viziWebhooksService: ViziWebhooksService,
    private readonly ordersService: OrdersService,
    private readonly idempotencyService: IdempotencyService,
    private readonly logService: LogService,
    private readonly commandBus: CommandBus,
    private readonly ordersRepository: OrdersRepository,
    private readonly queueService: QueueService,
    private readonly supabaseService: SupabaseService,
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
      return (
        typeof value === 'object' && value !== null && !Array.isArray(value)
      );
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

    // Check if this is a test order (ends with -TEST)
    const orderId = order && hasProperty(order, 'id') ?
      (typeof order.id === 'string' ? order.id : JSON.stringify(order.id)) : undefined;
    if (orderId && orderId.endsWith('-TEST')) {
      this.logger.log(
        `Skipping test order: ${orderId} (test orders ending with -TEST are ignored)`,
      );

      // Log the skipped test order
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

      // Return success response to acknowledge webhook receipt
      return {
        status: 'skipped',
        message: 'Test order skipped (ends with -TEST)',
        orderId,
      };
    }

    try {
      // Normalize branch to lowercase if present
      if (
        order &&
        hasProperty(order, 'branch') &&
        typeof order.branch === 'string'
      ) {
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
    const applicants =
      form && Array.isArray(form.applicants) ? form.applicants : undefined;

    const webhookValidation = {
      hasOrder: !!order,
      hasForm: !!form,
      orderId: order && hasProperty(order, 'id') ?
        (typeof order.id === 'string' ? order.id : JSON.stringify(order.id)) : undefined,
      formId: form && hasProperty(form, 'id') ? String(form.id) : undefined,
      country:
        form && hasProperty(form, 'country') ? String(form.country) : undefined,
      clientData: client
        ? {
            name: hasProperty(client, 'name') ? String(client.name) : undefined,
            email: hasProperty(client, 'email')
              ? String(client.email)
              : undefined,
            hasPhone: !!phone,
            phoneCode:
              phone && hasProperty(phone, 'code')
                ? String(phone.code)
                : undefined,
            phoneNumber:
              phone && hasProperty(phone, 'number')
                ? String(phone.number)
                : undefined,
            whatsappEnabled: hasProperty(client, 'whatsappAlertsEnabled')
              ? Boolean(client.whatsappAlertsEnabled)
              : false,
          }
        : null,
      productData: product
        ? {
            name: hasProperty(product, 'name')
              ? String(product.name)
              : undefined,
            country: hasProperty(product, 'country')
              ? String(product.country)
              : undefined,
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
      skipPiiRedaction: true, // Preserve original data for retrigger
    });

    // Check idempotency if key provided
    if (idempotencyKey) {
      const cached = await this.idempotencyService.get(idempotencyKey);
      if (cached) {
        this.logger.log(
          `Returning cached response for idempotency key: ${idempotencyKey}`,
        );
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
        const orderIdStr =
          order && hasProperty(order, 'id') ? String(order.id) : 'unknown';
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

        const failedOrderId =
          order && hasProperty(order, 'id') ? String(order.id) : 'unknown';
        this.logger.error(
          `Failed to save order ${failedOrderId} to database: ${JSON.stringify(errorDetails)}`,
          typeof err.stack === 'string' ? err.stack : undefined,
        );

        // Log the failed order creation with full details
        const failedFormId =
          form && hasProperty(form, 'id') ? String(form.id) : undefined;
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
          skipPiiRedaction: true, // Preserve original data for retrigger
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
      const orderIdStr =
        order && hasProperty(order, 'id') ? String(order.id) : 'unknown';
      const formIdStr =
        form && hasProperty(form, 'id') ? String(form.id) : undefined;
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
        skipPiiRedaction: true, // Preserve original data for retrigger
      });

      return result;
    } catch (error) {
      // Log error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      const orderIdStr =
        order && hasProperty(order, 'id') ? String(order.id) : 'unknown';
      const formIdStr =
        form && hasProperty(form, 'id') ? String(form.id) : undefined;
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
      headers['x-correlation-id'] ||
      headers['x-request-id'] ||
      `retrigger-${Date.now()}`;

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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

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

  @Post('resync-cbb')
  @UseGuards(ApiKeyGuard)
  @Scopes('webhook:vizi', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resync CBB contact for an order',
    description:
      'Manually triggers CBB contact synchronization for a specific order. Useful for recovery when sync failed or needs refresh. Requires admin API key.',
  })
  @ApiBearerAuth('api-key')
  @ApiBody({
    type: ResyncCBBContactDto,
    description: 'CBB resync parameters',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CBB resync completed',
    type: ResyncCBBResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parameters or order not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions (admin required)',
  })
  async resyncCBBContact(
    @Body() dto: ResyncCBBContactDto,
    @Headers() headers: Record<string, string>,
  ): Promise<ResyncCBBResultDto> {
    const correlationId =
      headers['x-correlation-id'] ||
      headers['x-request-id'] ||
      `resync-cbb-${Date.now()}`;

    this.logger.log(
      `Starting CBB resync: phoneNumber=${dto.phoneNumber}, orderId=${dto.orderId}, viziOrderId=${dto.viziOrderId}, correlationId=${correlationId}`,
    );

    // Validate that at least one parameter is provided
    if (!dto.phoneNumber && !dto.orderId && !dto.viziOrderId) {
      throw new BadRequestException(
        'At least one of phoneNumber, orderId, or viziOrderId must be provided',
      );
    }

    // Log the resync request
    await this.logService.createLog({
      level: 'info',
      message: 'CBB resync operation initiated',
      metadata: {
        phoneNumber: dto.phoneNumber,
        orderId: dto.orderId,
        viziOrderId: dto.viziOrderId,
        source: 'admin_resync',
      },
      correlation_id: correlationId,
    });

    try {
      // Find the order based on provided parameters
      let order;

      if (dto.orderId) {
        // Direct lookup by database ID
        order = await this.ordersRepository.findById(dto.orderId);
      } else if (dto.viziOrderId) {
        // Lookup by Vizi order ID (stored in order_id field)
        const orders = await this.ordersRepository.findMany({
          where: { order_id: dto.viziOrderId },
        });
        order = orders?.[0];
      } else if (dto.phoneNumber) {
        // Lookup by phone number - find most recent order
        const orders = await this.ordersRepository.findMany({
          where: { client_phone: dto.phoneNumber },
          orderBy: 'created_at',
          orderDirection: 'desc',
        });
        order = orders?.[0];
      }

      if (!order) {
        const searchCriteria = dto.orderId
          ? `orderId: ${dto.orderId}`
          : dto.viziOrderId
            ? `viziOrderId: ${dto.viziOrderId}`
            : `phoneNumber: ${dto.phoneNumber}`;

        throw new BadRequestException(`Order not found with ${searchCriteria}`);
      }

      // Only sync IL branch orders
      if (order.branch?.toLowerCase() !== 'il') {
        return {
          success: false,
          phoneNumber: order.client_phone,
          orderId: order.id,
          message: `CBB sync skipped - order is for ${order.branch} branch (only IL branch orders are synced)`,
        };
      }

      // Execute resync command - pass Vizi order ID, not database ID
      const result: CBBContactSyncResult = await this.commandBus.execute(
        new ResyncCBBContactCommand(order.order_id, correlationId),
      );

      this.logger.log(
        `CBB resync completed for order ${order.id}: status=${result.status}, action=${result.action}`,
      );

      // Return formatted result based on sync result
      // Consider both 'success' and 'no_whatsapp' as successful operations
      const isSuccess =
        result.status === 'success' || result.status === 'no_whatsapp';
      const message =
        result.status === 'success'
          ? `CBB contact ${result.action === 'created' ? 'created' : result.action === 'updated' ? 'updated' : 'processed'} successfully`
          : result.status === 'no_whatsapp'
            ? 'CBB contact synced but WhatsApp not available'
            : 'CBB resync failed';

      return {
        success: isSuccess,
        phoneNumber: order.client_phone || 'unknown',
        orderId: order.id,
        cbbContactUuid: result.contactId,
        message,
        whatsappAvailable: result.hasWhatsApp ?? false,
        created: result.action === 'created',
        error: isSuccess ? undefined : result.error,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `CBB resync operation failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.logService.createLog({
        level: 'error',
        message: 'CBB resync operation failed',
        metadata: {
          error: errorMessage,
          phoneNumber: dto.phoneNumber,
          orderId: dto.orderId,
          viziOrderId: dto.viziOrderId,
          source: 'admin_resync',
        },
        correlation_id: correlationId,
      });

      // If it's already a BadRequestException, re-throw it to maintain HTTP status
      if (error instanceof BadRequestException) {
        throw error;
      }

      // For other errors, return a structured error response
      return {
        success: false,
        phoneNumber: dto.phoneNumber || 'unknown',
        orderId: dto.orderId || 'unknown',
        message: 'CBB resync failed',
        error: errorMessage,
        whatsappAvailable: false,
        created: false,
      };
    }
  }

  @Post('retrigger-whatsapp')
  @UseGuards(ApiKeyGuard)
  @Scopes('webhook:vizi', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrigger WhatsApp notification for an order',
    description:
      'Manually triggers WhatsApp order confirmation message for a specific order. Useful for recovery when message failed or needs to be resent. Requires admin API key.',
  })
  @ApiBearerAuth('api-key')
  @ApiBody({
    type: RetriggerWhatsAppDto,
    description: 'WhatsApp retrigger parameters',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'WhatsApp retrigger completed',
    type: RetriggerWhatsAppResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parameters or order not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions (admin required)',
  })
  async retriggerWhatsApp(
    @Body() dto: RetriggerWhatsAppDto,
    @Headers() headers: Record<string, string>,
  ): Promise<RetriggerWhatsAppResultDto> {
    const correlationId =
      headers['x-correlation-id'] ||
      headers['x-request-id'] ||
      `retrigger-whatsapp-${Date.now()}`;

    this.logger.log(
      `Starting WhatsApp retrigger: phoneNumber=${dto.phoneNumber}, orderId=${dto.orderId}, viziOrderId=${dto.viziOrderId}, force=${dto.force}, correlationId=${correlationId}`,
    );

    // Validate that at least one parameter is provided
    if (!dto.phoneNumber && !dto.orderId && !dto.viziOrderId) {
      throw new BadRequestException(
        'At least one of phoneNumber, orderId, or viziOrderId must be provided',
      );
    }

    // Log the retrigger request
    await this.logService.createLog({
      level: 'info',
      message: 'WhatsApp retrigger operation initiated',
      metadata: {
        phoneNumber: dto.phoneNumber,
        orderId: dto.orderId,
        viziOrderId: dto.viziOrderId,
        force: dto.force,
        source: 'admin_retrigger_whatsapp',
      },
      correlation_id: correlationId,
    });

    try {
      // Find the order based on provided parameters
      let order;

      if (dto.orderId) {
        // First try to find by Vizi order ID (most common case)
        const orders = await this.ordersRepository.findMany({
          where: { order_id: dto.orderId },
        });
        order = orders?.[0];

        // If not found and orderId looks like a UUID, try database ID lookup
        if (
          !order &&
          dto.orderId.match(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          )
        ) {
          order = await this.ordersRepository.findById(dto.orderId);
        }
      } else if (dto.viziOrderId) {
        // Lookup by Vizi order ID (stored in order_id field)
        const orders = await this.ordersRepository.findMany({
          where: { order_id: dto.viziOrderId },
        });
        order = orders?.[0];
      } else if (dto.phoneNumber) {
        // Lookup by phone number - find most recent order
        const orders = await this.ordersRepository.findMany({
          where: { client_phone: dto.phoneNumber },
          orderBy: 'created_at',
          orderDirection: 'desc',
        });
        order = orders?.[0];
      }

      if (!order) {
        const searchCriteria = dto.orderId
          ? `orderId: ${dto.orderId}`
          : dto.viziOrderId
            ? `viziOrderId: ${dto.viziOrderId}`
            : `phoneNumber: ${dto.phoneNumber}`;

        throw new BadRequestException(`Order not found with ${searchCriteria}`);
      }

      // Only process IL branch orders
      if (order.branch?.toLowerCase() !== 'il') {
        return {
          success: false,
          orderId: order.id,
          phoneNumber: order.client_phone || 'unknown',
          message: `WhatsApp notification skipped - order is for ${order.branch} branch (only IL branch orders can send WhatsApp)`,
        };
      }

      // Check if order has WhatsApp alerts enabled (unless force is true)
      if (!dto.force && !order.whatsapp_alerts_enabled) {
        return {
          success: false,
          orderId: order.id,
          phoneNumber: order.client_phone || 'unknown',
          message:
            'WhatsApp alerts are disabled for this order. Use force=true to override.',
        };
      }

      // Check if order has CBB contact synced (using cbb_contact_uuid field)
      if (!order.cbb_contact_uuid) {
        return {
          success: false,
          orderId: order.id,
          phoneNumber: order.client_phone || 'unknown',
          message:
            'Order has not been synced with CBB yet. Please run CBB resync first.',
        };
      }

      // Get CBB contact to check WhatsApp availability
      const { data: cbbContact, error: cbbError } =
        await this.supabaseService.serviceClient
          .from('cbb_contacts')
          .select('*')
          .eq('id', order.cbb_contact_uuid)
          .single();

      if (cbbError || !cbbContact) {
        return {
          success: false,
          orderId: order.id,
          phoneNumber: order.client_phone || 'unknown',
          message: 'CBB contact not found in database',
          error: cbbError?.message,
        };
      }

      // Note: We're not checking WhatsApp availability here since the orchestrator
      // already validated it during initial sync. If WhatsApp wasn't available,
      // the alerts_enabled flag would be false.

      // Check if message was already sent (unless force is true)
      if (!dto.force) {
        // Check WhatsApp messages table
        const { data: existingMessage } =
          await this.supabaseService.serviceClient
            .from('whatsapp_messages')
            .select('id, confirmation_sent, status')
            .eq('order_id', order.order_id)
            .eq('template_name', 'order_confirmation_global')
            .maybeSingle();

        if (
          existingMessage?.confirmation_sent ||
          existingMessage?.status === 'delivered'
        ) {
          return {
            success: false,
            orderId: order.id,
            phoneNumber: order.client_phone || 'unknown',
            cbbContactUuid: order.cbb_contact_uuid,
            message:
              'WhatsApp notification already sent. Use force=true to resend.',
            alreadySent: true,
          };
        }

        // Also check CBB contact flag
        if (cbbContact.new_order_notification_sent) {
          return {
            success: false,
            orderId: order.id,
            phoneNumber: order.client_phone || 'unknown',
            cbbContactUuid: order.cbb_contact_uuid,
            message:
              'WhatsApp notification already sent (CBB flag). Use force=true to resend.',
            alreadySent: true,
          };
        }
      }

      // Queue the WhatsApp message - using the exact same parameters as CBBSyncOrchestratorService
      const job = await this.queueService.addJob(
        QUEUE_NAMES.WHATSAPP_MESSAGES,
        JOB_NAMES.SEND_WHATSAPP_ORDER_CONFIRMATION,
        {
          orderId: order.order_id, // Use Vizi order ID, not database ID
          contactId: cbbContact.cbb_contact_id, // CBB contact ID (cbb_contact_id field)
          messageType: 'order_confirmation',
        },
        {
          delay: 1000, // 1 second delay, same as in orchestrator
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
        },
      );

      this.logger.log(
        `WhatsApp message queued for order ${order.order_id} (job ID: ${job.id})`,
      );

      await this.logService.createLog({
        level: 'info',
        message: 'WhatsApp notification successfully queued',
        metadata: {
          order_id: order.order_id,
          database_id: order.id,
          cbb_contact_id: cbbContact.cbb_contact_id,
          job_id: job.id,
          force: dto.force,
          source: 'admin_retrigger_whatsapp',
        },
        correlation_id: correlationId,
      });

      return {
        success: true,
        orderId: order.id,
        phoneNumber: order.client_phone || 'unknown',
        cbbContactUuid: order.cbb_contact_id,
        message: `WhatsApp notification queued successfully (Job ID: ${job.id})`,
        jobId: job.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `WhatsApp retrigger operation failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.logService.createLog({
        level: 'error',
        message: 'WhatsApp retrigger operation failed',
        metadata: {
          error: errorMessage,
          phoneNumber: dto.phoneNumber,
          orderId: dto.orderId,
          viziOrderId: dto.viziOrderId,
          source: 'admin_retrigger_whatsapp',
        },
        correlation_id: correlationId,
      });

      // If it's already a BadRequestException, re-throw it to maintain HTTP status
      if (error instanceof BadRequestException) {
        throw error;
      }

      // For other errors, return a structured error response
      return {
        success: false,
        phoneNumber: dto.phoneNumber || 'unknown',
        orderId: dto.orderId || 'unknown',
        message: 'WhatsApp retrigger failed',
        error: errorMessage,
      };
    }
  }
}
