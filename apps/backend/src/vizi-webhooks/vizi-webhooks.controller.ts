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
// import { IdempotencyService } from '@visapi/util-redis';

@Controller('v1/webhooks/vizi')
@ApiTags('Vizi Webhooks')
export class ViziWebhooksController {
  private readonly logger: Logger;

  constructor(
    private readonly viziWebhooksService: ViziWebhooksService,
    private readonly ordersService: OrdersService,
    // private readonly idempotencyService: IdempotencyService,
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
    @Body() body: any, // Accept any to handle validation ourselves
    @Headers() headers: Record<string, string>,
  ) {
    const correlationId =
      headers['x-correlation-id'] || headers['x-request-id'];
    const idempotencyKey = headers['x-idempotency-key'];
    
    // Transform and validate the webhook data
    try {
      // Normalize branch to lowercase if present
      if (body?.order?.branch && typeof body.order.branch === 'string') {
        body.order.branch = body.order.branch.toLowerCase();
      }
      
      // Ensure payment_processor is valid
      const validProcessors = ['stripe', 'paypal', 'tbank', 'bill', 'bit', 'paybox'];
      if (body?.order?.payment_processor && !validProcessors.includes(body.order.payment_processor)) {
        this.logger.warn(`Invalid payment processor: ${body.order.payment_processor}, defaulting to stripe`);
        body.order.payment_processor = 'stripe';
      }
      
      // Ensure status is valid
      const validStatuses = ['active', 'completed', 'issue', 'canceled'];
      if (body?.order?.status && !validStatuses.includes(body.order.status)) {
        this.logger.warn(`Invalid order status: ${body.order.status}, defaulting to active`);
        body.order.status = 'active';
      }
    } catch (error) {
      this.logger.error(`Error normalizing webhook data: ${error.message}`);
    }

    // Log incoming webhook with detailed validation info
    const webhookValidation = {
      hasOrder: !!body.order,
      hasForm: !!body.form,
      orderId: body.order?.id,
      formId: body.form?.id,
      country: body.form?.country,
      clientData: body.form?.client ? {
        name: body.form.client.name,
        email: body.form.client.email,
        hasPhone: !!body.form.client.phone,
        phoneCode: body.form.client.phone?.code,
        phoneNumber: body.form.client.phone?.number,
        whatsappEnabled: body.form.client.whatsappAlertsEnabled,
      } : null,
      productData: body.form?.product ? {
        name: body.form.product.name,
        country: body.form.product.country,
      } : null,
      applicantCount: body.form?.applicants?.length || 0,
    };
    
    await this.logService.createLog({
      level: 'info',
      message: 'Received Vizi webhook',
      metadata: {
        webhook_type: 'vizi_order',
        validation: webhookValidation,
        correlationId,
        idempotencyKey,
        source: 'webhook',
      },
      correlation_id: correlationId,
    });

    // Check idempotency if key provided
    // TODO: Implement idempotency when IdempotencyService is updated
    // if (idempotencyKey) {
    //   const cached = await this.idempotencyService.get(idempotencyKey);
    //   if (cached) {
    //     this.logger.log(`Returning cached response for idempotency key: ${idempotencyKey}`);
    //     return cached;
    //   }
    // }

    try {
      // Validate webhook payload based on country
      if (!body.form || !body.order) {
        throw new BadRequestException('Missing required form or order data');
      }

      // Cast to ViziWebhookDto after normalization
      const webhookData = body as ViziWebhookDto;
      
      // Save order to database first
      let orderId: string;
      try {
        orderId = await this.ordersService.createOrder(webhookData);
        this.logger.log(`Order saved to database: ${body.order.id} (DB ID: ${orderId})`);
      } catch (error) {
        const errorDetails = {
          message: error.message,
          code: error.code,
          detail: error.detail,
          stack: error.stack,
        };
        
        this.logger.error(
          `Failed to save order ${body.order.id} to database: ${JSON.stringify(errorDetails)}`,
          error.stack,
        );
        
        // Log the failed order creation with full details
        await this.logService.createLog({
          level: 'error',
          message: `Order creation failed for ${body.order.id}`,
          metadata: {
            webhook_type: 'vizi_order',
            order_id: body.order.id,
            form_id: body.form.id,
            error: errorDetails,
            webhook_data: body,
            correlationId,
            source: 'webhook',
          },
          correlation_id: correlationId,
        });
        
        // Throw the error to prevent marking webhook as successful
        throw new BadRequestException(
          `Failed to save order to database: ${error.message}`,
        );
      }

      // Process the webhook only if order was saved successfully
      const result = await this.viziWebhooksService.processViziOrder(
        webhookData,
        correlationId,
      );

      // Update order with processing results
      await this.ordersService.updateOrderProcessing(
        body.order.id,
        result.workflowId,
        result.jobId,
      );

      // Store result for idempotency
      // TODO: Implement idempotency when IdempotencyService is updated
      // if (idempotencyKey) {
      //   await this.idempotencyService.set(idempotencyKey, result, 86400); // 24 hours
      // }

      // Log success
      await this.logService.createLog({
        level: 'info',
        message: 'Vizi webhook processed successfully',
        metadata: {
          webhook_type: 'vizi_order',
          order_id: body.order.id,
          form_id: body.form.id,
          workflow_id: result.workflowId,
          job_id: result.jobId,
          order_db_id: orderId,
          correlationId,
          source: 'webhook',
        },
        workflow_id: result.workflowId,
        job_id: result.jobId,
        correlation_id: correlationId,
      });

      return result;
    } catch (error) {
      // Log error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      await this.logService.createLog({
        level: 'error',
        message: 'Failed to process Vizi webhook',
        metadata: {
          webhook_type: 'vizi_order',
          order_id: body.order?.id,
          form_id: body.form?.id,
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
}
