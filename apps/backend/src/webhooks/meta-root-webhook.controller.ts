import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

/**
 * Alternative webhook controller for Meta/WhatsApp  
 * Provides additional endpoints for Meta webhook compatibility at /api/v1/webhooks/meta
 * The main webhook endpoint remains at /api/v1/webhooks/whatsapp
 * 
 * Note: This controller was originally designed to handle root-level webhooks but
 * was moved to avoid conflicts with AppController's GET /api route
 */
@ApiExcludeController() // Hide from Swagger docs
@Controller('v1/webhooks/meta') // Alternative path for Meta webhooks
export class MetaRootWebhookController {
  private readonly logger = new Logger(MetaRootWebhookController.name);

  constructor(private readonly whatsappController: WhatsAppWebhookController) {}

  @Get()
  async handleMetaGet(@Query() query: any): Promise<string> {
    // Check if this is a webhook verification request
    if (
      query['hub.mode'] &&
      query['hub.verify_token'] &&
      query['hub.challenge']
    ) {
      this.logger.log(
        'Meta webhook verification request received, forwarding to WhatsApp controller',
      );
      return this.whatsappController.verifyWebhook(query);
    }

    // Not a webhook request, return a simple status page
    return `
<!DOCTYPE html>
<html>
<head>
    <title>VisAPI - WhatsApp Webhook</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .status { padding: 10px; background: #e8f5e8; border: 1px solid #4caf50; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🔗 VisAPI WhatsApp Webhook</h1>
    <div class="status">✅ Server is running and ready to receive webhooks</div>
    <p>Webhook endpoints:</p>
    <ul>
        <li>GET /api/v1/webhooks/meta - Meta webhook verification</li>
        <li>POST /api/v1/webhooks/meta - Meta webhook receiver</li>
        <li>GET /api/v1/webhooks/whatsapp - API webhook verification</li>
        <li>POST /api/v1/webhooks/whatsapp - API webhook receiver</li>
    </ul>
</body>
</html>`;
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleMetaPost(
    @Body() body: any,
    @Headers() headers: any,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ status: string }> {
    this.logger.log(
      'Meta webhook POST received, forwarding to WhatsApp controller',
    );
    return this.whatsappController.receiveWebhook(body, headers, req);
  }
}
