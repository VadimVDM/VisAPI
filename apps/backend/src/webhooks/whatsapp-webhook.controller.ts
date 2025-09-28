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
  UnauthorizedException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { ConfigService } from '@visapi/core-config';
import { HttpService } from '@nestjs/axios';
import { SupabaseService } from '@visapi/core-supabase';
import {
  WebhookVerifierService,
  DeliveryTrackerService,
  TemplateManagerService,
  WebhookVerifyDto,
  MessageIdUpdaterService,
} from '@visapi/backend-whatsapp-business';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { SlackRateLimiterService } from './slack-rate-limiter.service';
import {
  AccountUpdate,
  BusinessCapabilityUpdate,
  EnhancedMessageStatus,
  TemplateStatusUpdate,
  WhatsAppChange,
  WhatsAppWebhookPayload,
  WhatsAppValue,
} from './whatsapp.types';
import { Database } from '@visapi/shared-types';

type DbWhatsappMessages = Database['public']['Tables']['whatsapp_messages']['Row'];

@ApiTags('WhatsApp Webhooks')
@Controller('v1/webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);
  private readonly zapierWebhookUrl: string;
  private readonly slackWebhookUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly supabaseService: SupabaseService,
    private readonly webhookVerifier: WebhookVerifierService,
    private readonly deliveryTracker: DeliveryTrackerService,
    private readonly templateManager: TemplateManagerService,
    private readonly slackRateLimiter: SlackRateLimiterService,
    private readonly messageIdUpdater: MessageIdUpdaterService,
  ) {
    // Use try-catch since these are optional configs
    try {
      this.zapierWebhookUrl =
        this.configService.get<string>('zapier.webhookUrl');
    } catch {
      this.zapierWebhookUrl = '';
    }
    try {
      this.slackWebhookUrl = this.configService.get<string>('slack.webhookUrl');
    } catch {
      this.slackWebhookUrl = '';
    }
  }

  @Get()
  @ApiOperation({ summary: 'Verify WhatsApp webhook' })
  @ApiResponse({ status: 200, description: 'Webhook verified' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verifyWebhook(@Query() query: WebhookVerifyDto): Promise<string> {
    // Only log in development to reduce production logs
    if (!this.configService.isProduction) {
      this.logger.log('WhatsApp webhook verification request received');
      this.logger.debug(`Query parameters: ${JSON.stringify(query)}`);
    }

    try {
      const challenge =
        this.webhookVerifier.verifyWebhookChallenge(query);

      await this.trackWebhookEvent({
        method: 'GET',
        status: 'verified',
        challenge,
        details: {
          mode: query['hub.mode'],
          verified: true,
        },
      });

      return challenge;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Webhook verification failed: ${errorMessage}`);

      await this.trackWebhookEvent({
        method: 'GET',
        status: 'failed',
        details: {
          mode: query['hub.mode'],
          error: errorMessage,
          rawQuery: query,
        },
      });

      throw error;
    }
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive WhatsApp webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async receiveWebhook(
    @Body() body: WhatsAppWebhookPayload,
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ status: string }> {
    const eventId = uuidv4();

    // Only log event IDs in development to reduce production logs
    if (!this.configService.isProduction) {
      this.logger.log(`Received WhatsApp webhook event ${eventId}`);
    }

    try {
      const signature = headers['x-hub-signature-256'];
      const timestamp = headers['x-hub-timestamp'] || Date.now().toString();

      // Log headers only in development
      if (!this.configService.isProduction) {
        this.logger.debug(
          `Webhook headers: x-hub-signature-256=${signature ? 'present' : 'missing'}, x-hub-timestamp=${timestamp}`,
        );
      }

      // Use raw body for signature verification if available, otherwise fallback to stringified body
      const rawBody = req.rawBody
        ? req.rawBody.toString('utf8')
        : JSON.stringify(body);

      const isValidSignature =
        await this.webhookVerifier.verifyWebhookSignature(
          rawBody,
          signature,
          timestamp,
        );

      // Check if we should enforce signature verification
      // WABA_ENFORCE_SIGNATURE is not in config schema, default to true
      const enforceSignature = true;

      if (
        !isValidSignature &&
        this.configService.isProduction &&
        enforceSignature
      ) {
        this.logger.error('Invalid webhook signature - rejecting request');
        throw new UnauthorizedException('Invalid webhook signature');
      } else if (!isValidSignature) {
        this.logger.warn(
          'Invalid webhook signature - allowing request (signature not enforced or non-production)',
        );
      }

      const eventType = this.webhookVerifier.extractEventType(body);

      await this.trackWebhookEvent({
        id: eventId,
        method: 'POST',
        status: 'received',
        timestamp: new Date(),
        event_type: eventType,
        payload: body,
        signature_verified: isValidSignature,
        processing_status: 'processing',
      });

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          await this.processWebhookChange(change, eventId);
        }
      }

      if (this.zapierWebhookUrl) {
        await this.forwardToZapier(body, eventId);
      }

      await this.updateWebhookEventStatus(eventId, 'processed');

      return { status: 'success' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing webhook: ${errorMessage}`, error);

      await this.updateWebhookEventStatus(eventId, 'failed', errorMessage);

      // Check rate limit before sending Slack notification
      if (this.slackWebhookUrl) {
        const shouldSend = await this.slackRateLimiter.shouldSendNotification(
          'webhook_failure',
          errorMessage, // Use error message as key for granular rate limiting
        );

        if (shouldSend) {
          const rateLimitStatus =
            await this.slackRateLimiter.getRateLimitStatus(
              'webhook_failure',
              errorMessage,
            );

          await this.sendSlackAlert('Webhook Processing Failed', {
            eventId,
            error: errorMessage,
            eventType: this.webhookVerifier.extractEventType(body),
            rateLimitInfo: {
              message: 'This notification is rate limited to 1 per hour',
              lastSentAt: rateLimitStatus.lastSentAt,
            },
          });

          await this.slackRateLimiter.recordNotificationSent(
            'webhook_failure',
            errorMessage,
          );
        } else {
          this.logger.debug(
            `Slack notification suppressed due to rate limiting for webhook failure: ${errorMessage}`,
          );
        }
      }

      throw error;
    }
  }

  private async processWebhookChange(
    change: WhatsAppChange,
    _eventId: string,
  ): Promise<void> {
    const { field, value } = change;

    switch (field) {
      case 'messages':
        await this.processMessageWebhook(value, _eventId);
        break;

      case 'message_template_status_update':
        await this.processTemplateStatusWebhook(value as TemplateStatusUpdate, _eventId);
        break;

      case 'account_update':
        await this.processAccountUpdateWebhook(value as AccountUpdate, _eventId);
        break;

      case 'business_capability_update':
        this.processBusinessCapabilityWebhook(value as BusinessCapabilityUpdate, _eventId);
        break;

      default:
        this.logger.warn(`Unknown webhook field: ${field as string}`);
    }
  }

  private async processMessageWebhook(
    value: WhatsAppValue,
    _eventId: string,
  ): Promise<void> {
    const statuses = value.statuses || [];

    for (const status of statuses) {
      // Only log individual message processing in development
      if (!this.configService.isProduction) {
        this.logger.log(
          `Processing message status: ${status.id} - ${status.status}`,
        );
      }
      const finalMessageId = status.id;
      let messageIdUpdated = false;

      // Update message ID if this is the first status update with real Meta message ID
      if (status.id && status.id.startsWith('wamid.') && status.biz_opaque_callback_data) {
        try {
          const correlationData = this.messageIdUpdater.parseCorrelationData(
            status.biz_opaque_callback_data,
          );
          
          if (correlationData) {
            const updateResult = await this.messageIdUpdater.updateMessageId(
              status.id,
              correlationData,
            );
            
            if (updateResult.success) {
              this.logger.log(
                `Updated message ID from ${updateResult.previousMessageId} to ${updateResult.newMessageId}`,
              );
              messageIdUpdated = true;
            } else {
              this.logger.warn(
                `Failed to update message ID: ${updateResult.error}`,
              );
              // If correlation failed, we might need to use temporary ID for delivery updates
              if (updateResult.error?.includes('No matching message found') && correlationData.contactId) {
                // Try to find the temporary message ID
                const tempMessage = await this.supabaseService.serviceClient
                  .from('whatsapp_messages')
                  .select('message_id')
                  .eq('phone_number', correlationData.contactId)
                  .like('message_id', 'temp_%')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();
                
                if (tempMessage.data?.message_id) {
                  // Manually update the message ID since correlation failed
                  await this.supabaseService.serviceClient
                    .from('whatsapp_messages')
                    .update({
                      message_id: status.id,
                      meta_message_id: status.id,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('message_id', tempMessage.data.message_id);
                  
                  this.logger.log(
                    `Manually updated message ID from ${tempMessage.data.message_id} to ${status.id}`,
                  );
                  messageIdUpdated = true;
                }
              }
            }
          }
        } catch (error) {
          this.logger.error(
            `Error updating message ID for ${status.id}:`,
            error,
          );
        }
      }

      const messageStatus: EnhancedMessageStatus = {
        id: finalMessageId,
        status: status.status,
        timestamp: new Date(Number(status.timestamp) * 1000),
        recipient: status.recipient_id,
        conversationId: status.conversation?.id,
        conversationCategory: status.conversation?.origin.type,
        pricingModel: status.pricing?.pricing_model,
        isBillable: status.pricing?.billable,
        error: status.errors?.[0],
        messageIdUpdated, // Pass flag to indicate if ID was updated
      };

      this.deliveryTracker.updateMessageStatus(messageStatus);

      await this.updateMessageInDatabase(messageStatus);

      if (status.status === 'failed' && this.slackWebhookUrl) {
        await this.sendSlackAlert('WhatsApp Message Failed', {
          messageId: status.id,
          recipient: status.recipient_id,
          error: status.errors?.[0],
        });
      }
    }

    const messages = value.messages || [];
    for (const message of messages) {
      // Only log individual incoming messages in development
      if (!this.configService.isProduction) {
        this.logger.log(
          `Received incoming message ${message.id} from ${message.from}`,
        );
      }

      await this.trackIncomingMessage({
        message_id: message.id,
        phone_number: message.from,
        event_type: 'incoming_message',
        details: {
          type: message.type,
          text: message.text?.body,
          timestamp: message.timestamp,
        },
      });
    }
  }

  private async processTemplateStatusWebhook(
    value: TemplateStatusUpdate,
    _eventId: string,
  ): Promise<void> {
    this.logger.log(
      `Template status update: ${value.message_template_name} - ${value.event}`,
    );

    const templateUpdate = {
      template_name: value.message_template_name,
      language: value.message_template_language,
      status: value.event,
      reason: value.reason,
    };

    const { data: existingTemplate } = await this.supabaseService.serviceClient
      .from('whatsapp_templates')
      .select('*')
      .eq('template_name', templateUpdate.template_name)
      .eq('language', templateUpdate.language)
      .single();

    if (existingTemplate) {
      await this.supabaseService.serviceClient
        .from('whatsapp_templates')
        .update({
          status: templateUpdate.status,
          updated_at: new Date().toISOString(),
        })
        .eq('template_name', templateUpdate.template_name)
        .eq('language', templateUpdate.language);
    } else {
      await this.supabaseService.serviceClient
        .from('whatsapp_templates')
        .insert({
          template_name: templateUpdate.template_name,
          language: templateUpdate.language,
          status: templateUpdate.status,
          components: [], // Required field, will be updated when syncing from Meta
          updated_at: new Date().toISOString(),
        });
    }

    if (templateUpdate.status === 'REJECTED' && this.slackWebhookUrl) {
      await this.sendSlackAlert('WhatsApp Template Rejected', templateUpdate);
    }

    await this.templateManager.syncTemplatesFromMeta();
  }

  private async processAccountUpdateWebhook(
    value: AccountUpdate,
    _eventId: string,
  ): Promise<void> {
    this.logger.log(`Account update received: ${JSON.stringify(value)}`);

    if (value.ban_info) {
      this.logger.error('WhatsApp account banned!', value.ban_info);

      if (this.slackWebhookUrl) {
        await this.sendSlackAlert(
          'CRITICAL: WhatsApp Account Banned',
          value.ban_info,
        );
      }
    }
  }

  private processBusinessCapabilityWebhook(
    value: BusinessCapabilityUpdate,
    _eventId: string,
  ): void {
    this.logger.log(`Business capability update: ${JSON.stringify(value)}`);

    if (value.max_daily_conversation_per_phone) {
      this.logger.log(
        `Daily conversation limit updated: ${value.max_daily_conversation_per_phone}`,
      );
    }

    if (value.max_phone_numbers_per_business) {
      this.logger.log(
        `Phone number limit updated: ${value.max_phone_numbers_per_business}`,
      );
    }
  }

  private async updateMessageInDatabase(status: EnhancedMessageStatus): Promise<void> {
    try {
      const updates: Partial<DbWhatsappMessages> = {
        status: status.status,
        updated_at: new Date().toISOString(),
      };

      if (status.status === 'delivered') {
        updates.delivered_at = status.timestamp.toISOString();
      } else if (status.status === 'read') {
        updates.read_at = status.timestamp.toISOString();
      } else if (status.status === 'failed') {
        updates.failed_at = status.timestamp.toISOString();
        updates.failure_reason = status.error?.message || 'Unknown error';
      }

      if (status.conversationId) {
        updates.conversation_id = status.conversationId;
        updates.conversation_category = status.conversationCategory;
        updates.pricing_model = status.pricingModel;
        updates.is_billable = status.isBillable;
      }

      // Try to update with the real message ID first (after correlation)
      const { data, error } = await this.supabaseService.serviceClient
        .from('whatsapp_messages')
        .update(updates)
        .eq('message_id', status.id)
        .select('order_id, message_id');

      // If no rows were updated and we have a real WAMID, it might be a correlation issue
      if (!error && (!data || data.length === 0) && status.id.startsWith('wamid.')) {
        this.logger.warn(
          `No message found with ID ${status.id}, delivery status update failed. This may indicate a message ID correlation issue.`,
        );
        return;
      }

      // Update orders table if we successfully updated the message
      if (
        (status.status === 'delivered' || status.status === 'read' || status.status === 'failed') &&
        data && data.length > 0 && data[0].order_id
      ) {
        const orderId = data[0].order_id;
        this.logger.debug(`Updating order ${orderId} with WhatsApp ${status.status} status`);
        
        // Note: Currently the orders table doesn't have whatsapp_* columns
        // This is a placeholder for when those columns are added
        // For now, the tracking is handled in the whatsapp_messages table
        
        // If/when orders table gets WhatsApp status columns, uncomment:
        // const orderUpdate: any = {};
        // if (status.status === 'delivered') {
        //   orderUpdate.whatsapp_delivered_at = status.timestamp;
        // } else if (status.status === 'read') {
        //   orderUpdate.whatsapp_read_at = status.timestamp;
        // } else if (status.status === 'failed') {
        //   orderUpdate.whatsapp_failed_at = status.timestamp;
        //   orderUpdate.whatsapp_failure_reason = status.error?.message || 'Unknown error';
        // }
        // await this.supabaseService.serviceClient
        //   .from('orders')
        //   .update(orderUpdate)
        //   .eq('order_id', orderId);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update message in database: ${errorMessage}`,
      );
    }
  }

  private async trackWebhookEvent(data: Record<string, unknown>): Promise<void> {
    try {
      await this.supabaseService.serviceClient
        .from('whatsapp_webhook_events')
        .insert([data]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to track webhook event: ${errorMessage}`);
    }
  }

  private async trackIncomingMessage(data: Record<string, unknown>): Promise<void> {
    try {
      await this.supabaseService.serviceClient
        .from('whatsapp_webhook_events')
        .insert([{
          method: 'POST',
          status: 'received',
          event_type: data.event_type as string,
          message_id: data.message_id as string,
          phone_number: data.phone_number as string,
          details: data.details as object,
          created_at: new Date().toISOString(),
        }]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to track incoming message: ${errorMessage}`);
    }
  }

  private async updateWebhookEventStatus(
    eventId: string,
    status: string,
    error?: string,
  ): Promise<void> {
    try {
      const update: Partial<Database['public']['Tables']['whatsapp_webhook_events']['Row']> = {
        processing_status: status,
      };

      if (error) {
        update.details = { error };
      }

      await this.supabaseService.serviceClient
        .from('whatsapp_webhook_events')
        .update(update)
        .eq('id', eventId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update webhook event status: ${errorMessage}`,
      );
    }
  }

  private async forwardToZapier(body: WhatsAppWebhookPayload, eventId: string): Promise<void> {
    try {
      // Forward the exact raw webhook body to Zapier (same as WebhookVerifier)
      // DO NOT add extra fields - Zapier expects the raw Meta webhook format
      const response = await firstValueFrom(
        this.httpService.post(this.zapierWebhookUrl, body, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      await this.supabaseService.serviceClient
        .from('whatsapp_webhook_events')
        .update({
          forwarded_to_zapier: true,
          details: {
            zapier_status: response.status,
            forwarded_at: new Date().toISOString(),
          },
        })
        .eq('id', eventId);

      // Only log Zapier forwarding in development
      if (!this.configService.isProduction) {
        this.logger.log(
          `Webhook forwarded to Zapier for event ${eventId} - Status: ${response.status}`,
        );
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to forward to Zapier: ${errorMessage}`);

      // Still mark the attempt in the database
      await this.supabaseService.serviceClient
        .from('whatsapp_webhook_events')
        .update({
          forwarded_to_zapier: false,
          details: {
            zapier_error: errorMessage,
            attempted_at: new Date().toISOString(),
          },
        })
        .eq('id', eventId);
    }
  }

  private async sendSlackAlert(title: string, data: Record<string, unknown>): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(this.slackWebhookUrl, {
          text: title,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: title,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '```' + JSON.stringify(data, null, 2) + '```',
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `Timestamp: ${new Date().toISOString()}`,
                },
              ],
            },
          ],
        }),
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send Slack alert: ${errorMessage}`);
    }
  }
}