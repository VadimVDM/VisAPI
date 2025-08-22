import { Injectable, Logger } from '@nestjs/common';
import { CbbClientService } from '@visapi/backend-core-cbb';
import { CBBContactSyncResult, QUEUE_NAMES, JOB_NAMES } from '@visapi/shared-types';
import { SupabaseService } from '@visapi/core-supabase';
import { LogService } from '@visapi/backend-logging';
import { QueueService } from '../queue.service';
import { CBBFieldMapperService } from './cbb-field-mapper.service';

interface OrderData {
  order_id: string;
  client_phone: string;
  client_name: string;
  client_email: string;
  product_country: string;
  product_doc_type: string;
  product_intent?: string;
  product_entries?: string;
  product_validity?: string;
  product_days_to_use?: number;
  visa_quantity: number;
  urgency: string;
  amount: number;
  currency: string;
  entry_date: string;
  branch: string;
  form_id: string;
  webhook_received_at: string;
  whatsapp_alerts_enabled: boolean;
  applicants_data?: any;
  cbb_synced?: boolean;
  cbb_contact_id?: string;
  whatsapp_confirmation_sent?: boolean;
  whatsapp_confirmation_sent_at?: string;
  whatsapp_message_id?: string;
}

/**
 * Service responsible for orchestrating CBB contact synchronization
 * Handles the sync flow, database operations, and WhatsApp queuing
 */
@Injectable()
export class CBBSyncOrchestratorService {
  private readonly logger = new Logger(CBBSyncOrchestratorService.name);

  constructor(
    private readonly cbbService: CbbClientService,
    private readonly supabaseService: SupabaseService,
    private readonly logService: LogService,
    private readonly queueService: QueueService,
    private readonly fieldMapper: CBBFieldMapperService,
  ) {}

  /**
   * Main sync orchestration method
   */
  async syncOrderToCBB(orderId: string): Promise<CBBContactSyncResult> {
    this.logger.log(`Starting CBB contact sync for order: ${orderId}`);

    // 1. Fetch order details
    const order = await this.getOrderByOrderId(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // 2. Check if already synced
    if (order.cbb_synced === true) {
      this.logger.log(`Order ${orderId} already synced`);
      return {
        status: 'success',
        action: 'skipped',
        contactId: order.cbb_contact_id,
      };
    }

    // 3. Prepare contact data
    const contactData = this.fieldMapper.mapOrderToContact(order);

    // 4. Create or update contact
    const { contact, isNewContact } = await this.createOrUpdateContact(
      order.client_phone,
      contactData,
      orderId,
    );

    // 5. Validate WhatsApp availability
    const hasWhatsApp = await this.cbbService.validateWhatsApp(order.client_phone);

    // 6. Update order with results
    await this.updateOrderCBBStatus(orderId, contact.id, true);

    // 7. Queue WhatsApp confirmation if applicable
    await this.queueWhatsAppConfirmation(order, contact.id, hasWhatsApp);

    // 8. Log success
    await this.logSyncSuccess(order, contact.id, isNewContact, hasWhatsApp);

    return {
      status: hasWhatsApp ? 'success' : 'no_whatsapp',
      action: isNewContact ? 'created' : 'updated',
      contactId: contact.id,
      hasWhatsApp,
    };
  }

  /**
   * Create or update CBB contact
   */
  private async createOrUpdateContact(
    phoneNumber: string,
    contactData: any,
    orderId: string,
  ): Promise<{ contact: any; isNewContact: boolean }> {
    // Check if contact exists
    let contact = await this.cbbService.getContactById(phoneNumber);
    
    if (contact) {
      // CBB API limitation: Can only update custom fields, not basic fields
      this.logger.warn(
        `Contact ${phoneNumber} exists. CBB API only allows updating custom fields.`,
      );

      // Check if basic fields differ
      if (contact.name !== contactData.name || contact.email !== contactData.email) {
        this.logger.warn(
          `Cannot update basic fields for existing contact ${phoneNumber}. ` +
            `Current: name="${contact.name}", email="${contact.email}". ` +
            `New: name="${contactData.name}", email="${contactData.email}"`,
        );
      }

      // Update custom fields only
      contact = await this.cbbService.updateContactComplete(contactData);
      this.logger.log(`Updated CBB contact custom fields for order ${orderId}`);
      
      return { contact, isNewContact: false };
    } else {
      // Create new contact
      contact = await this.cbbService.createContactWithFields(contactData);
      this.logger.log(`Created new CBB contact for order ${orderId}`);
      
      return { contact, isNewContact: true };
    }
  }

  /**
   * Queue WhatsApp order confirmation if conditions are met
   */
  private async queueWhatsAppConfirmation(
    order: OrderData,
    contactId: string,
    hasWhatsApp: boolean,
  ): Promise<void> {
    // Check all conditions for sending WhatsApp confirmation
    if (
      !hasWhatsApp ||
      !order.whatsapp_alerts_enabled ||
      order.branch?.toLowerCase() !== 'il' ||
      order.whatsapp_confirmation_sent
    ) {
      if (order.whatsapp_confirmation_sent) {
        this.logger.log(
          `WhatsApp confirmation already sent for order ${order.order_id}, skipping`,
        );
      }
      return;
    }

    try {
      await this.queueService.addJob(
        QUEUE_NAMES.WHATSAPP_MESSAGES,
        JOB_NAMES.SEND_WHATSAPP_ORDER_CONFIRMATION,
        {
          orderId: order.order_id,
          contactId: contactId,
          messageType: 'order_confirmation',
        },
        {
          delay: 1000, // 1 second delay after sync
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
      this.logger.log(
        `Queued WhatsApp order confirmation for ${order.order_id} to contact ${contactId}`,
      );
    } catch (error) {
      // Don't fail the sync if we can't queue the message
      this.logger.error(
        `Failed to queue WhatsApp message for order ${order.order_id}:`,
        error,
      );
    }
  }

  /**
   * Log successful sync to database
   */
  private async logSyncSuccess(
    order: OrderData,
    contactId: string,
    isNewContact: boolean,
    hasWhatsApp: boolean,
  ): Promise<void> {
    const action = isNewContact ? 'created' : 'updated';
    const whatsappQueued = 
      hasWhatsApp && 
      order.whatsapp_alerts_enabled && 
      order.branch?.toLowerCase() === 'il' && 
      !order.whatsapp_confirmation_sent;

    this.logger.log(`CBB contact sync successful for order ${order.order_id}`, {
      contact_id: contactId,
      action,
      has_whatsapp: hasWhatsApp,
      whatsapp_queued: whatsappQueued,
    });

    await this.logService.createLog({
      level: 'info',
      message: `CBB contact sync ${hasWhatsApp ? 'successful' : 'completed - no WhatsApp'}`,
      metadata: {
        order_id: order.order_id,
        cbb_contact_id: contactId,
        action,
        has_whatsapp: hasWhatsApp,
        client_phone: order.client_phone,
        client_name: order.client_name,
        source: 'cbb_sync',
      },
    });
  }

  /**
   * Handle sync errors and log them
   */
  async handleSyncError(orderId: string, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    this.logger.error(`CBB contact sync failed for order ${orderId}`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    await this.logService.createLog({
      level: 'error',
      message: 'CBB contact sync failed',
      metadata: {
        order_id: orderId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        source: 'cbb_sync',
      },
    });
  }

  /**
   * Fetch order from database
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
   * Update order with CBB sync status
   */
  private async updateOrderCBBStatus(
    orderId: string,
    contactId: string,
    synced: boolean,
  ): Promise<void> {
    const { error } = await this.supabaseService.serviceClient
      .from('orders')
      .update({
        cbb_contact_id: contactId,
        cbb_synced: synced,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    if (error) {
      this.logger.error(
        `Failed to update CBB status for order ${orderId}:`,
        error,
      );
      throw error;
    } else {
      this.logger.log(
        `Updated CBB status for order ${orderId}: synced=${synced}, contact_id=${contactId}`,
      );
    }
  }
}