import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  PayloadTooLargeException,
  UseGuards,
} from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { QUEUE_NAMES, JOB_NAMES } from '@visapi/shared-types';
import { IdempotencyService } from '@visapi/util-redis';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('Webhooks')
@Controller('v1/triggers')
export class WebhooksController {
  private readonly MAX_PAYLOAD_SIZE = 512 * 1024; // 512KB

  constructor(
    private readonly queueService: QueueService,
    private readonly idempotencyService: IdempotencyService
  ) {}

  @Post(':key')
  @UseGuards(ApiKeyGuard)
  @Scopes('triggers:create')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger a workflow via webhook' })
  @ApiSecurity('api-key')
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Optional key to prevent duplicate processing',
    required: false,
  })
  @ApiResponse({ status: 202, description: 'Webhook accepted for processing' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 413, description: 'Payload too large' })
  async handleWebhook(
    @Param('key') webhookKey: string,
    @Body() payload: any,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('content-type') contentType?: string
  ) {
    // Validate content type
    if (
      contentType &&
      !contentType.includes('application/json') &&
      !contentType.includes('application/x-www-form-urlencoded')
    ) {
      throw new BadRequestException(
        'Unsupported content type. Use application/json or application/x-www-form-urlencoded'
      );
    }

    // Check payload size (this is a simplified check)
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > this.MAX_PAYLOAD_SIZE) {
      throw new PayloadTooLargeException('Payload exceeds 512KB limit');
    }

    // Require idempotency key for webhook requests
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    // Handle idempotency using Redis-based service
    return this.idempotencyService.checkAndExecute(
      idempotencyKey,
      async () => {
        // Add job to queue
        const job = await this.queueService.addJob(
          QUEUE_NAMES.DEFAULT,
          JOB_NAMES.PROCESS_WORKFLOW,
          {
            webhookKey,
            payload,
            receivedAt: new Date().toISOString(),
            idempotencyKey,
          }
        );

        return {
          status: 'accepted',
          jobId: job.id,
          message: 'Webhook received and queued for processing',
        };
      },
      3600 // 1 hour TTL
    );
  }
}
