import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { CbbClientService } from '@visapi/backend-core-cbb';
import { WhatsAppMessageJobData, QUEUE_NAMES } from '@visapi/shared-types';
import { SupabaseService } from '@visapi/core-supabase';
import { LogService } from '@visapi/backend-logging';
import { MessageIdUpdaterService } from '@visapi/backend-whatsapp-business';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { WhatsAppTemplateService } from '../services/whatsapp-template.service';
import { ConfigService } from '@visapi/core-config';

interface OrderData {
  order_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  product_country: string;
  product_doc_type: string | null;
  product_intent?: string | null;
  visa_quantity?: number | null;
  amount?: number;
  urgency?: string | null;
  visa_validity_days?: number | null;
  whatsapp_alerts_enabled?: boolean | null;
}

interface ProcessResult {
  status: 'success' | 'skipped';
  orderId: string;
  contactId: string;
  messageType: string;
  messageId?: string;
  reason?: string;
}

interface SendMessageResult {
  message_id?: string;
  status?: string;
}

// Removed unused interface - now using whatsapp_messages table

@Injectable()
@Processor(QUEUE_NAMES.WHATSAPP_MESSAGES)
export class WhatsAppMessageProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppMessageProcessor.name);

  constructor(
    private readonly cbbService: CbbClientService,
    private readonly supabaseService: SupabaseService,
    private readonly logService: LogService,
    private readonly templateService: WhatsAppTemplateService,
    private readonly configService: ConfigService,
    private readonly messageIdUpdater: MessageIdUpdaterService,
    @InjectMetric('visapi_whatsapp_messages_sent_total')
    private readonly messagesSentCounter: Counter<string>,
    @InjectMetric('visapi_whatsapp_messages_failed_total')
    private readonly messagesFailedCounter: Counter<string>,
    @InjectMetric('visapi_whatsapp_message_duration_seconds')
    private readonly messageDurationHistogram: Histogram<string>,
  ) {
    super();
    this.logger.log('WhatsAppMessageProcessor initialized');
  }

  async onModuleInit() {
    this.logger.log('WhatsAppMessageProcessor onModuleInit - Starting worker');
    try {
      // Log processor registration
      this.logger.log(`Registering processor for queue: ${QUEUE_NAMES.WHATSAPP_MESSAGES}`);
      
      // Log any initialization issues
      await this.logService.createLog({
        level: 'info',
        message: 'WhatsApp message processor started',
        metadata: {
          queue_name: QUEUE_NAMES.WHATSAPP_MESSAGES,
          source: 'processor_init',
        },
      });
    } catch (error) {
      this.logger.error('Failed to initialize WhatsApp processor:', error);
      await this.logService.createLog({
        level: 'error',
        message: 'WhatsApp processor initialization failed',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          source: 'processor_init',
        },
      });
    }
  }

  async process(job: Job<WhatsAppMessageJobData>): Promise<ProcessResult> {
    this.logger.log(`Processing WhatsApp job ${job.id} for order ${job.data.orderId}`);
    await this.logService.createLog({
      level: 'info',
      message: 'Processing WhatsApp message job',
      metadata: {
        job_id: job.id,
        order_id: job.data.orderId,
        contact_id: job.data.contactId,
        source: 'whatsapp_processor',
      },
    });
    const startTime = Date.now();
    const { orderId, contactId, messageType = 'order_confirmation' } = job.data;

    // Skip test orders (ending with -TEST)
    if (orderId.endsWith('-TEST')) {
      this.logger.log(
        `Skipping WhatsApp message for test order ${orderId} (test orders ending with -TEST are ignored)`,
      );
      return {
        status: 'skipped',
        orderId,
        contactId,
        messageType,
        reason: 'Test order',
      };
    }

    // Only log individual job processing in development
    if (!this.configService.isProduction) {
      this.logger.log(`Processing WhatsApp message job ${job.id}`, {
        order_id: orderId,
        contact_id: contactId,
        message_type: messageType,
      });
    }

    try {
      // Validate required fields
      if (!orderId || !contactId) {
        throw new Error(
          'Missing required fields: orderId and contactId are required',
        );
      }

      // Check if message type has a template
      if (!this.templateService.hasTemplate(messageType)) {
        this.logger.warn(
          `Message type '${messageType}' needs template implementation. Skipping for now.`,
        );

        return {
          status: 'skipped',
          orderId,
          contactId,
          messageType,
          reason: 'Template not yet implemented',
        };
      }

      // Fetch order details
      const order = await this.getOrderByOrderId(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Check for duplicate messages (pass template name if available)
      const templateName = job?.data?.templateName;
      if (await this.isMessageAlreadySent(order, messageType, templateName)) {
        this.logger.log(
          `${messageType} already sent for order ${orderId}, skipping`,
        );
        return {
          status: 'skipped',
          orderId,
          contactId,
          messageType,
          reason: 'Already sent',
        };
      }

      // CRITICAL: Create idempotency record BEFORE sending to prevent duplicates on retry
      const messageId = await this.createIdempotencyRecord(orderId, messageType, order.client_phone, templateName);
      
      // If null returned, another job is handling this message
      if (!messageId) {
        this.logger.log(
          `Message for order ${orderId} is being handled by another job, skipping`,
        );
        return {
          status: 'skipped',
          orderId,
          contactId,
          messageType,
          reason: 'Handled by another job',
        };
      }

      let result: SendMessageResult;
      try {
        // Send the appropriate message
        result = await this.sendMessage(order, contactId, messageType, job);

        // Update order with WhatsApp tracking info
        // CBB doesn't return Meta's message ID immediately. Meta sends the actual wamid
        // (e.g., wamid.HBgMOTcyNTM0MzYyNzE2FQIAERgS...) via webhook later.
        // Generate a temporary unique ID to avoid duplicate key errors.
        // This will be updated when we receive Meta's webhook with the real wamid.
        const tempMessageId = result.message_id || `temp_${orderId}_${messageType}_${Date.now()}`;
        await this.updateOrderWhatsAppStatus(
          orderId,
          messageType,
          tempMessageId,
          templateName,
        );
      } catch (error) {
        // If sending fails, remove idempotency record to allow retry
        await this.removeIdempotencyRecord(orderId, messageType, templateName);
        throw error;
      }

      // Update CBB contact flag for order confirmation messages
      if (messageType === 'order_confirmation') {
        await this.updateCBBNotificationFlag(orderId);
      }

      // Only log success in development
      if (!this.configService.isProduction) {
        this.logger.log(
          `WhatsApp ${messageType} sent successfully for order ${orderId}`,
          {
            contact_id: contactId,
            message_id: result.message_id,
          },
        );
      }

      await this.logService.createLog({
        level: 'info',
        message: `WhatsApp ${messageType} sent successfully`,
        metadata: {
          order_id: orderId,
          contact_id: contactId,
          message_type: messageType,
          message_id: result.message_id,
          source: 'whatsapp_message',
        },
      });

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      this.messageDurationHistogram.observe(
        { message_type: messageType },
        duration,
      );
      this.messagesSentCounter.inc({ message_type: messageType });

      return {
        status: 'success',
        orderId,
        contactId,
        messageId: result.message_id,
        messageType,
      };
    } catch (error) {
      // Handle errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Failed to send WhatsApp ${messageType} for order ${orderId}`,
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
      );

      await this.logService.createLog({
        level: 'error',
        message: `Failed to send WhatsApp ${messageType}`,
        metadata: {
          order_id: orderId,
          contact_id: contactId,
          message_type: messageType,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          source: 'whatsapp_message',
        },
      });

      // Record failure metrics
      const duration = (Date.now() - startTime) / 1000;
      this.messageDurationHistogram.observe(
        { message_type: messageType },
        duration,
      );
      this.messagesFailedCounter.inc({ message_type: messageType });

      throw error;
    }
  }

  /**
   * Send a WhatsApp message based on the message type
   */
  private async sendMessage(
    order: OrderData,
    contactId: string,
    messageType: string,
    job?: Job<WhatsAppMessageJobData>,
  ): Promise<SendMessageResult> {
    switch (messageType) {
      case 'order_confirmation':
        const orderData =
          await this.templateService.prepareOrderConfirmationData(order);

        // Only log individual sends in development
        if (!this.configService.isProduction) {
          this.logger.log(
            `Sending WhatsApp order confirmation template to contact ${contactId} for order ${order.order_id}`,
          );
        }

        return await this.cbbService.sendOrderConfirmation(
          contactId,
          orderData,
        );

      case 'status_update':
        // For future implementation with template
        const statusMessage =
          this.templateService.buildStatusUpdateMessage(order);
        this.logger.warn(
          'Status update template not yet implemented, message prepared but not sent:',
          statusMessage,
        );
        throw new Error('Status update template not yet implemented');

      case 'document_ready':
        // For future implementation with template
        const documentMessage =
          this.templateService.buildDocumentReadyMessage(order);
        this.logger.warn(
          'Document ready template not yet implemented, message prepared but not sent:',
          documentMessage,
        );
        throw new Error('Document ready template not yet implemented');

      case 'visa_approval':
        if (!job?.data) {
          throw new Error('Visa approval requires job data');
        }

        const {
          templateParams,
          documentUrl,
          cbbId,
          templateName,
          applicationIndex,
          totalApplications
        } = job.data;

        // Validate required fields
        if (!templateName || !documentUrl || !templateParams) {
          throw new Error('Template name, parameters, and document URL are required for visa approval');
        }

        // Only log individual sends in development
        if (!this.configService.isProduction) {
          this.logger.log(
            `Sending WhatsApp visa approval template to contact ${cbbId || contactId} for order ${order.order_id}`,
          );
        }

        // Send visa approval with document attachment - exactly like order confirmation but with document
        const correlationData = `visa_approval:${order.order_id}:${applicationIndex || 0}:${Date.now()}`;

        const visaResult = await this.cbbService.sendWhatsAppTemplateWithDocument(
          cbbId || contactId,
          templateName,
          'he', // Hebrew
          templateParams,
          documentUrl,
          `visa_${order.order_id}_${applicationIndex ? applicationIndex + 1 : 1}.pdf`,
          correlationData,
        );

        // Update order visa notification status (only on the last message)
        const isLastMessage = !totalApplications ||
                            applicationIndex === undefined ||
                            applicationIndex === totalApplications - 1;

        if (visaResult.message_id && isLastMessage) {
          await this.supabaseService.serviceClient
            .from('orders')
            .update({
              visa_notification_sent: true,
              visa_notification_sent_at: new Date().toISOString(),
              visa_notification_message_id: visaResult.message_id,
            })
            .eq('order_id', order.order_id);

          this.logger.log(
            `Marked order ${order.order_id} as visa notification sent (${totalApplications || 1} applications)`,
          );
        }

        return visaResult;

      default:
        throw new Error(`Unknown message type: ${messageType}`);
    }
  }

  /**
   * Check if a message has already been sent for this order
   */
  private async isMessageAlreadySent(
    order: OrderData,
    messageType: string,
    templateName?: string,
  ): Promise<boolean> {
    // Special check for visa approvals - they're tracked in the orders table
    if (messageType === 'visa_approval') {
      const { data: orderData, error: orderError } = await this.supabaseService.serviceClient
        .from('orders')
        .select('visa_notification_sent')
        .eq('order_id', order.order_id)
        .single();

      if (!orderError && orderData?.visa_notification_sent === true) {
        return true;
      }
    }

    const { data, error } = await this.supabaseService.serviceClient
      .from('whatsapp_messages')
      .select('id, confirmation_sent, status, updated_at')
      .eq('order_id', order.order_id)
      .eq('template_name', this.getTemplateNameForMessageType(messageType, templateName))
      .maybeSingle();

    if (error) {
      this.logger.warn(
        `Failed to check WhatsApp message status for order ${order.order_id}: ${error.message}`,
      );
      return false; // Allow retry if we can't check
    }

    if (!data) {
      return false;
    }
    
    // Message was successfully sent
    if (data.confirmation_sent === true || data.status === 'sent') {
      return true;
    }
    
    // Check if a 'pending' status is stale (older than 2 minutes)
    // This handles cases where a job crashed while sending
    if (data.status === 'pending' && data.updated_at) {
      const updatedAt = new Date(data.updated_at);
      const now = new Date();
      const ageInMs = now.getTime() - updatedAt.getTime();
      const maxPendingAgeMs = 2 * 60 * 1000; // 2 minutes
      
      if (ageInMs > maxPendingAgeMs) {
        this.logger.warn(
          `Found stale pending message for order ${order.order_id} (age: ${Math.round(ageInMs/1000)}s), allowing retry`,
        );
        return false; // Allow retry for stale pending messages
      }
      
      // Fresh pending status - another job is processing
      this.logger.log(
        `Message for order ${order.order_id} is being processed by another job (pending for ${Math.round(ageInMs/1000)}s)`,
      );
      return true; // Skip to avoid duplicate
    }
    
    // Status is 'queued' or other - allow processing
    return false;
  }

  /**
   * Create or update idempotency record BEFORE sending message
   */
  private async createIdempotencyRecord(
    orderId: string,
    messageType: string,
    phoneNumber?: string,
    templateName?: string,
  ): Promise<string | null> {
    const actualTemplateName = this.getTemplateNameForMessageType(messageType, templateName);
    const now = new Date().toISOString();
    const tempMessageId = `temp_${orderId}_${messageType}_${Date.now()}`;

    // First check if record exists for this order + template combination
    const { data: existing } = await this.supabaseService.serviceClient
      .from('whatsapp_messages')
      .select('id, status, message_id')
      .eq('order_id', orderId)
      .eq('template_name', actualTemplateName)
      .maybeSingle();

    if (existing) {
      // If record exists and is in 'pending' or 'sent' status, skip
      if (existing.status === 'sent' || existing.status === 'pending') {
        this.logger.log(
          `Message for order ${orderId} already ${existing.status}, skipping`,
        );
        return null;
      }
      
      // Update existing record to pending with new message_id
      const { error } = await this.supabaseService.serviceClient
        .from('whatsapp_messages')
        .update({
          message_id: tempMessageId,
          status: 'pending',
          confirmation_sent: false,
          updated_at: now,
        })
        .eq('id', existing.id);

      if (error) {
        this.logger.error(
          `Failed to update idempotency record for order ${orderId}:`,
          error,
        );
        throw error;
      }

      this.logger.debug(
        `Updated idempotency record for order ${orderId}, message_id: ${tempMessageId}`,
      );
      return tempMessageId;
    }

    // Create new record if it doesn't exist
    const { error } = await this.supabaseService.serviceClient
      .from('whatsapp_messages')
      .insert({
        order_id: orderId,
        phone_number: phoneNumber || '',
        template_name: actualTemplateName,
        message_id: tempMessageId,
        status: 'pending',
        confirmation_sent: false,
        created_at: now,
        updated_at: now,
      });

    if (error) {
      // Check if it's a duplicate key error (race condition)
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        this.logger.log(
          `Another job is already processing message for order ${orderId}, skipping`,
        );
        return null;
      }
      
      this.logger.error(
        `Failed to create idempotency record for order ${orderId}:`,
        error,
      );
      throw error;
    }

    this.logger.debug(
      `Created idempotency record for order ${orderId}, message_id: ${tempMessageId}`,
    );
    return tempMessageId;
  }

  /**
   * Remove idempotency record if sending fails
   */
  private async removeIdempotencyRecord(
    orderId: string,
    messageType: string,
    templateName?: string,
  ): Promise<void> {
    const actualTemplateName = this.getTemplateNameForMessageType(messageType, templateName);

    const { error } = await this.supabaseService.serviceClient
      .from('whatsapp_messages')
      .delete()
      .eq('order_id', orderId)
      .eq('template_name', actualTemplateName)
      .eq('status', 'pending');

    if (error) {
      this.logger.warn(
        `Failed to remove idempotency record for order ${orderId}:`,
        error,
      );
    }
  }

  /**
   * Get template name for message type
   */
  private getTemplateNameForMessageType(messageType: string, templateName?: string): string {
    // If explicit template name provided, use it
    if (templateName) {
      return templateName;
    }

    switch (messageType) {
      case 'order_confirmation':
        return 'order_confirmation_global';
      case 'visa_approval':
        // Don't hardcode - allow different visa templates
        return 'visa_approval_file_phone'; // Default only
      case 'status_update':
        return 'status_update'; // When implemented
      case 'document_ready':
        return 'document_ready'; // When implemented
      default:
        return messageType;
    }
  }

  /**
   * Get order by order ID
   */
  private async getOrderByOrderId(orderId: string): Promise<OrderData | null> {
    const { data, error } = await this.supabaseService.serviceClient
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch order ${orderId}:`, error);
      return null;
    }

    return data;
  }

  /**
   * Update WhatsApp message tracking in database
   */
  private async updateOrderWhatsAppStatus(
    orderId: string,
    messageType: string,
    messageId: string,
    templateName?: string,
  ): Promise<void> {
    // Get order details for phone number
    const order = await this.getOrderByOrderId(orderId);
    if (!order) {
      throw new Error(
        `Order ${orderId} not found for WhatsApp tracking update`,
      );
    }

    const now = new Date().toISOString();
    const actualTemplateName = this.getTemplateNameForMessageType(messageType, templateName);

    // Insert or update WhatsApp message record
    const messageData = {
      order_id: orderId,
      phone_number: order.client_phone || '',
      template_name: actualTemplateName,
      message_id: messageId,
      status: 'sent',
      confirmation_sent: true,
      confirmation_sent_at: now,
      sent_at: now,
      alerts_enabled: order.whatsapp_alerts_enabled || false,
      created_at: now,
      updated_at: now,
    };

    const { error } = await this.supabaseService.serviceClient
      .from('whatsapp_messages')
      .upsert(messageData, {
        onConflict: 'order_id,template_name',
        ignoreDuplicates: false,
      });

    if (error) {
      this.logger.error(
        `Failed to update WhatsApp message tracking for order ${orderId}:`,
        error,
      );
      throw error;
    } else if (!this.configService.isProduction) {
      // Only log status updates in development
      this.logger.log(
        `Created WhatsApp message record for order ${orderId}: ${messageType}, message_id=${messageId}`,
      );
    }
  }

  /**
   * Update CBB contact notification flag after successful message sending
   */
  private async updateCBBNotificationFlag(orderId: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.serviceClient
        .from('cbb_contacts')
        .update({
          new_order_notification_sent: true,
          new_order_notification_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);

      if (error) {
        // Don't throw error - this is not critical enough to fail the message processing
        this.logger.warn(
          `Failed to update CBB notification flag for order ${orderId}: ${error.message}`,
        );
      } else if (!this.configService.isProduction) {
        this.logger.debug(`Updated CBB notification flag for order ${orderId}`);
      }
    } catch (error) {
      // Log but don't fail the message processing
      this.logger.error(
        `Error updating CBB notification flag for order ${orderId}:`,
        error,
      );
    }
  }
}
