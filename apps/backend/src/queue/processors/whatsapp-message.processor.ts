import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CbbClientService } from '@visapi/backend-core-cbb';
import { WhatsAppMessageJobData } from '@visapi/shared-types';
import { SupabaseService } from '@visapi/core-supabase';
import { LogService } from '@visapi/backend-logging';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { WhatsAppTemplateService } from '../services/whatsapp-template.service';

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
  product_days_to_use?: number | null;
  whatsapp_confirmation_sent?: boolean | null;
  whatsapp_status_update_sent?: boolean | null;
  whatsapp_document_ready_sent?: boolean | null;
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

interface OrderUpdateData {
  updated_at: string;
  whatsapp_confirmation_sent?: boolean;
  whatsapp_confirmation_sent_at?: string;
  whatsapp_message_id?: string;
  whatsapp_status_update_sent?: boolean;
  whatsapp_status_update_sent_at?: string;
  whatsapp_document_ready_sent?: boolean;
  whatsapp_document_ready_sent_at?: string;
}

@Injectable()
@Processor('WHATSAPP_MESSAGES')
export class WhatsAppMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppMessageProcessor.name);

  constructor(
    private readonly cbbService: CbbClientService,
    private readonly supabaseService: SupabaseService,
    private readonly logService: LogService,
    private readonly templateService: WhatsAppTemplateService,
    @InjectMetric('visapi_whatsapp_messages_sent_total')
    private readonly messagesSentCounter: Counter<string>,
    @InjectMetric('visapi_whatsapp_messages_failed_total')
    private readonly messagesFailedCounter: Counter<string>,
    @InjectMetric('visapi_whatsapp_message_duration_seconds')
    private readonly messageDurationHistogram: Histogram<string>,
  ) {
    super();
  }

  async process(job: Job<WhatsAppMessageJobData>): Promise<ProcessResult> {
    const startTime = Date.now();
    const { orderId, contactId, messageType = 'order_confirmation' } = job.data;

    // Only log individual job processing in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`Processing WhatsApp message job ${job.id}`, {
        order_id: orderId,
        contact_id: contactId,
        message_type: messageType,
      });
    }

    try {
      // Validate required fields
      if (!orderId || !contactId) {
        throw new Error('Missing required fields: orderId and contactId are required');
      }

      // Check if message type has a template
      if (!this.templateService.hasTemplate(messageType)) {
        this.logger.warn(`Message type '${messageType}' needs template implementation. Skipping for now.`);
        
        return {
          status: 'skipped',
          orderId,
          contactId,
          messageType,
          reason: 'Template not yet implemented'
        };
      }

      // Fetch order details
      const order = await this.getOrderByOrderId(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Check for duplicate messages
      if (await this.isMessageAlreadySent(order, messageType)) {
        this.logger.log(`${messageType} already sent for order ${orderId}, skipping`);
        return {
          status: 'skipped',
          orderId,
          contactId,
          messageType,
          reason: 'Already sent'
        };
      }

      // Send the appropriate message
      const result = await this.sendMessage(order, contactId, messageType);

      // Update order with WhatsApp tracking info
      await this.updateOrderWhatsAppStatus(orderId, messageType, result.message_id || 'sent');

      // Only log success in development
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`WhatsApp ${messageType} sent successfully for order ${orderId}`, {
          contact_id: contactId,
          message_id: result.message_id,
        });
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
      this.messageDurationHistogram.observe({ message_type: messageType }, duration);
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Failed to send WhatsApp ${messageType} for order ${orderId}`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

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
      this.messageDurationHistogram.observe({ message_type: messageType }, duration);
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
    messageType: string
  ): Promise<SendMessageResult> {
    switch (messageType) {
      case 'order_confirmation':
        const orderData = await this.templateService.prepareOrderConfirmationData(order);
        
        // Only log individual sends in development
        if (process.env.NODE_ENV !== 'production') {
          this.logger.log(`Sending WhatsApp order confirmation template to contact ${contactId} for order ${order.order_id}`);
        }
        
        return await this.cbbService.sendOrderConfirmation(contactId, orderData);

      case 'status_update':
        // For future implementation with template
        const statusMessage = this.templateService.buildStatusUpdateMessage(order);
        this.logger.warn('Status update template not yet implemented, message prepared but not sent:', statusMessage);
        throw new Error('Status update template not yet implemented');

      case 'document_ready':
        // For future implementation with template
        const documentMessage = this.templateService.buildDocumentReadyMessage(order);
        this.logger.warn('Document ready template not yet implemented, message prepared but not sent:', documentMessage);
        throw new Error('Document ready template not yet implemented');

      default:
        throw new Error(`Unknown message type: ${messageType}`);
    }
  }

  /**
   * Check if a message has already been sent for this order
   */
  private async isMessageAlreadySent(order: OrderData, messageType: string): Promise<boolean> {
    switch (messageType) {
      case 'order_confirmation':
        return order.whatsapp_confirmation_sent === true;
      case 'status_update':
        return order.whatsapp_status_update_sent === true;
      case 'document_ready':
        return order.whatsapp_document_ready_sent === true;
      default:
        return false;
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
   * Update order with WhatsApp message status
   */
  private async updateOrderWhatsAppStatus(
    orderId: string,
    messageType: string,
    messageId: string
  ): Promise<void> {
    const updateData: OrderUpdateData = {
      updated_at: new Date().toISOString(),
    };

    // Set specific fields based on message type
    switch (messageType) {
      case 'order_confirmation':
        updateData.whatsapp_confirmation_sent = true;
        updateData.whatsapp_confirmation_sent_at = new Date().toISOString();
        updateData.whatsapp_message_id = messageId;
        break;
      case 'status_update':
        updateData.whatsapp_status_update_sent = true;
        updateData.whatsapp_status_update_sent_at = new Date().toISOString();
        break;
      case 'document_ready':
        updateData.whatsapp_document_ready_sent = true;
        updateData.whatsapp_document_ready_sent_at = new Date().toISOString();
        break;
    }

    const { error } = await this.supabaseService.serviceClient
      .from('orders')
      .update(updateData)
      .eq('order_id', orderId);

    if (error) {
      this.logger.error(
        `Failed to update WhatsApp status for order ${orderId}:`,
        error,
      );
      throw error;
    } else if (process.env.NODE_ENV !== 'production') {
      // Only log status updates in development
      this.logger.log(
        `Updated WhatsApp status for order ${orderId}: ${messageType}=true, message_id=${messageId}`
      );
    }
  }
}