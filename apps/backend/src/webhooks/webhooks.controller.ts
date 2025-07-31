import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { N8nWebhookDto } from './dto/n8n-order.dto';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';

@ApiTags('Webhooks')
@Controller('v1/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('n8n/orders')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyGuard)
  @Scopes('webhook:n8n', 'orders:write')
  @ApiSecurity('api_key')
  @ApiOperation({
    summary: 'Receive order data from n8n.visanet.app',
    description:
      'Webhook endpoint to receive visa order data from n8n automation',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error while processing webhook',
  })
  async handleN8nOrder(
    @Body() body: N8nWebhookDto,
    @Headers() headers: Record<string, string>,
  ) {
    try {
      // Validate required fields
      if (!body?.form || !body?.order) {
        throw new BadRequestException(
          'Invalid webhook payload: missing form or order data',
        );
      }

      if (!body.order.id || !body.form.id) {
        throw new BadRequestException(
          'Invalid webhook payload: missing required IDs',
        );
      }

      // Process the webhook
      await this.webhooksService.processN8nWebhook(body, headers);

      // Return success response
      return {
        success: true,
        message: 'Order received and processed successfully',
        orderId: body.order.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Log and wrap other errors
      console.error(
        'Error processing n8n webhook:',
        error instanceof Error ? error.message : error,
      );
      throw new InternalServerErrorException('Failed to process webhook');
    }
  }
}
