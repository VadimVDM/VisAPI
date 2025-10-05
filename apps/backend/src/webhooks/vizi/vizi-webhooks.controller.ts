import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../../auth/guards/api-key.guard';
import { Scopes } from '../../auth/decorators/scopes.decorator';
import { ViziOrderWebhookService } from './services/order-webhook.service';
import { ViziOrderRetriggerService } from './services/order-retrigger.service';
import { ViziCbbResyncService } from './services/cbb-resync.service';
import { ViziWhatsAppRetriggerService } from './services/whatsapp-retrigger.service';
import { ViziVisaResendService } from './services/visa-resend.service';
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
import { VisaResendDto, VisaResendResultDto } from './dto/visa-resend.dto';
import { ViziWebhookDto } from '@visapi/visanet-types';

@ApiTags('Vizi Webhooks')
@Controller('v1/webhooks/vizi')
export class ViziWebhooksController {
  constructor(
    private readonly orderWebhookService: ViziOrderWebhookService,
    private readonly orderRetriggerService: ViziOrderRetriggerService,
    private readonly cbbResyncService: ViziCbbResyncService,
    private readonly whatsappRetriggerService: ViziWhatsAppRetriggerService,
    private readonly visaResendService: ViziVisaResendService,
  ) {}

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
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    return this.orderWebhookService.handleInboundWebhook(body, headers);
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
  @ApiBody({ type: RetriggerOrdersDto, description: 'Retrigger configuration' })
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

    return this.orderRetriggerService.retriggerOrders(dto, correlationId);
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
  @ApiBody({ type: ResyncCBBContactDto, description: 'CBB resync parameters' })
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

    return this.cbbResyncService.resync(dto, correlationId);
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

    return this.whatsappRetriggerService.retrigger(dto, correlationId);
  }

  @Post('resend-visa')
  @UseGuards(ApiKeyGuard)
  @Scopes('webhook:vizi', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend visa approval notifications for an order',
    description:
      'Manually lookup order in Airtable, fetch fresh application data, and resend visa approval WhatsApp messages. Resets visa_notification_sent flag to allow re-sending. Requires admin API key.',
  })
  @ApiBearerAuth('api-key')
  @ApiBody({ type: VisaResendDto, description: 'Visa resend parameters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Visa resend completed',
    type: VisaResendResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parameters',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found in Airtable',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions (admin required)',
  })
  async resendVisaApproval(
    @Body() dto: VisaResendDto,
    @Headers() headers: Record<string, string>,
  ): Promise<VisaResendResultDto> {
    const correlationId =
      headers['x-correlation-id'] ||
      headers['x-request-id'] ||
      `resend-visa-${Date.now()}`;

    return this.visaResendService.resendVisaApproval(dto, correlationId);
  }
}
