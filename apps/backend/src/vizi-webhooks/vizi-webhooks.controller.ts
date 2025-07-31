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
// import { IdempotencyService } from '@visapi/util-redis';

@Controller('v1/webhooks/vizi')
@ApiTags('Vizi Webhooks')
export class ViziWebhooksController {
  private readonly logger: Logger;

  constructor(
    private readonly viziWebhooksService: ViziWebhooksService,
    // private readonly idempotencyService: IdempotencyService,
    private readonly logService: LogService,
  ) {
    this.logger = new Logger(ViziWebhooksController.name);
  }

  @Post('orders')
  @UseGuards(ApiKeyGuard)
  @Scopes('webhook:vizi', 'orders:write')
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
    @Body() body: ViziWebhookDto,
    @Headers() headers: Record<string, string>,
  ) {
    const correlationId =
      headers['x-correlation-id'] || headers['x-request-id'];
    const idempotencyKey = headers['x-idempotency-key'];

    // Log incoming webhook
    await this.logService.createLog({
      level: 'info',
      message: 'Received Vizi webhook',
      metadata: {
        webhook_type: 'vizi_order',
        order_id: body.order?.id,
        form_id: body.form?.id,
        country: body.form?.country,
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

      // Process the webhook
      const result = await this.viziWebhooksService.processViziOrder(
        body,
        correlationId,
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
