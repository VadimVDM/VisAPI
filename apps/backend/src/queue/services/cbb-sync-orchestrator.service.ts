import { Injectable, Logger } from '@nestjs/common';
import { CbbClientService } from '@visapi/backend-core-cbb';
import { CBBContactSyncResult, QUEUE_NAMES, JOB_NAMES } from '@visapi/shared-types';
import { SupabaseService } from '@visapi/core-supabase';
import { LogService } from '@visapi/backend-logging';
import { QueueService } from '../queue.service';
import { CBBFieldMapperService } from './cbb-field-mapper.service';
import { CBBSyncMetricsService } from './cbb-sync-metrics.service';

interface OrderData {
  order_id: string;
  client_phone: string;
  client_name: string;
  client_email: string;
  product_country: string;
  product_doc_type: string | null;
  product_intent?: string | null;
  product_entries?: string | null;
  product_validity?: string | null;
  product_days_to_use?: number | null;
  visa_quantity: number | null;
  amount: number;
  currency: string;
  entry_date: string | null;
  branch: string;
  form_id: string;
  webhook_received_at: string;
  whatsapp_alerts_enabled: boolean | null;
  applicants_data?: any;
  cbb_synced?: boolean | null;
  cbb_contact_id?: string | null;
  whatsapp_confirmation_sent?: boolean | null;
  whatsapp_confirmation_sent_at?: string | null;
  whatsapp_message_id?: string | null;
  product_data?: any; // JSON field containing product details including urgency
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
    private readonly metricsService: CBBSyncMetricsService,
  ) {}

  /**
   * Main sync orchestration method with enhanced error handling
   */
  async syncOrderToCBB(orderId: string): Promise<CBBContactSyncResult> {
    this.logger.log(`Starting CBB contact sync for order: ${orderId}`);
    
    // Start metrics tracking
    const endTimer = this.metricsService.startSync();

    // 1. Fetch order details
    const order = await this.getOrderByOrderId(orderId);
    if (!order) {
      const duration = endTimer();
      this.metricsService.recordSyncComplete('failed', 'skipped', 'unknown', duration);
      this.metricsService.recordSyncError('order_not_found', 'unknown');
      throw new Error(`Order ${orderId} not found`);
    }

    const branch = order.branch || 'unknown';
    
    // 2. Check or create CBB contact record
    let cbbContact = await this.fieldMapper.getCBBContact(orderId);
    
    // If no CBB contact record exists, create it first
    if (!cbbContact) {
      this.logger.log(`Creating CBB contact record for order: ${orderId}`);
      cbbContact = await this.fieldMapper.saveCBBContact(order);
      if (!cbbContact) {
        const duration = endTimer();
        this.metricsService.recordSyncComplete('failed', 'skipped', branch, duration);
        this.metricsService.recordSyncError('database_create_failed', branch);
        throw new Error(`Failed to create CBB contact record for order ${orderId}`);
      }
    }
    
    // 3. Update sync attempt tracking
    await this.fieldMapper.updateCBBSyncStatus(orderId, {
      cbb_sync_attempts: (cbbContact?.cbb_sync_attempts || 0) + 1,
      cbb_sync_last_attempt_at: new Date()
    });
    this.metricsService.recordSyncAttempt(branch);

    // 4. Check if already synced
    if (cbbContact?.cbb_synced === true && cbbContact.cbb_contact_id) {
      this.logger.log(`Order ${orderId} already synced with contact ${cbbContact.cbb_contact_id}`);
      const duration = endTimer();
      this.metricsService.recordSyncComplete('success', 'skipped', branch, duration);
      return {
        status: 'success',
        action: 'skipped',
        contactId: cbbContact.cbb_contact_id,
      };
    }

    try {
      // 5. Prepare contact data
      const contactData = this.fieldMapper.mapOrderToContact(order);

      // 6. Create or update contact with error handling
      const { contact, isNewContact, error } = await this.createOrUpdateContactSafe(
        order.client_phone,
        contactData,
        orderId,
      );

      if (error) {
        // Log the error but don't fail completely
        await this.recordSyncError(orderId, error);
        
        // If contact creation failed, we can't continue
        if (!contact) {
          throw new Error(`Failed to create/update contact: ${error}`);
        }
        
        // If we have a contact but with errors (e.g., field update failed), continue
        this.logger.warn(
          `Partial sync success for order ${orderId}: contact ${contact.id} created/found but with errors: ${error}`,
        );
      }

      // 7. Validate WhatsApp availability
      let hasWhatsApp = false;
      try {
        hasWhatsApp = await this.cbbService.validateWhatsApp(order.client_phone);
        this.metricsService.recordWhatsAppAvailability(hasWhatsApp, branch);
      } catch (whatsappError) {
        this.logger.warn(
          `WhatsApp validation failed for ${order.client_phone}: ${(whatsappError as Error).message}`,
        );
        this.metricsService.recordWhatsAppAvailability(false, branch);
        // Continue without WhatsApp
      }

      // 8. Update CBB contact record with results
      await this.fieldMapper.updateCBBSyncStatus(orderId, {
        cbb_contact_id: contact?.id,
        cbb_synced: true,
        cbb_sync_last_error: error || undefined
      });

      // 9. Link the order to the CBB contact record
      if (contact && !error && cbbContact) {
        await this.updateOrderCBBContactLink(orderId, cbbContact.id);
      }

      // 10. Queue WhatsApp confirmation if applicable
      if (contact && !error) {
        await this.queueWhatsAppConfirmation(order, contact.id, hasWhatsApp);
      }

      // 11. Log success
      await this.logSyncSuccess(order, contact?.id, isNewContact, hasWhatsApp);

      // Record metrics
      const duration = endTimer();
      const status = error ? 'partial' : (hasWhatsApp ? 'success' : 'success');
      const action = isNewContact ? 'created' : 'updated';
      this.metricsService.recordSyncComplete(status, action, branch, duration);

      return {
        status: hasWhatsApp ? 'success' : 'no_whatsapp',
        action: isNewContact ? 'created' : 'updated',
        contactId: contact?.id,
        hasWhatsApp,
      };
    } catch (error) {
      // Record the error and re-throw
      const duration = endTimer();
      const errorType = this.categorizeError(error);
      this.metricsService.recordSyncComplete('failed', 'skipped', branch, duration);
      this.metricsService.recordSyncError(errorType, branch);
      await this.recordSyncError(orderId, (error as Error).message);
      throw error;
    }
  }

  /**
   * Create or update CBB contact with safe error handling
   */
  private async createOrUpdateContactSafe(
    phoneNumber: string,
    contactData: any,
    orderId: string,
  ): Promise<{ contact: any; isNewContact: boolean; error?: string }> {
    try {
      const result = await this.createOrUpdateContact(phoneNumber, contactData, orderId);
      return { ...result, error: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to create/update contact for order ${orderId}: ${errorMessage}`,
        error,
      );
      
      // Try to at least get the contact if it exists
      try {
        const existingContact = await this.cbbService.getContactById(phoneNumber);
        if (existingContact) {
          return {
            contact: existingContact,
            isNewContact: false,
            error: `Found existing contact but update failed: ${errorMessage}`,
          };
        }
      } catch (fetchError) {
        // Even fetching failed
        this.logger.error(`Could not even fetch contact ${phoneNumber}:`, fetchError);
      }
      
      return {
        contact: null,
        isNewContact: false,
        error: errorMessage,
      };
    }
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
    this.metricsService.recordContactOperation('fetch', contact ? 'success' : 'failed');
    
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
      try {
        contact = await this.cbbService.updateContactComplete(contactData);
        this.metricsService.recordContactOperation('update', 'success');
        this.logger.log(`Updated CBB contact custom fields for order ${orderId}`);
      } catch (updateError) {
        this.metricsService.recordContactOperation('update', 'failed');
        throw updateError;
      }
      
      return { contact, isNewContact: false };
    } else {
      // Create new contact
      try {
        contact = await this.cbbService.createContactWithFields(contactData);
        this.metricsService.recordContactOperation('create', 'success');
        this.logger.log(`Created new CBB contact for order ${orderId}`);
      } catch (createError) {
        this.metricsService.recordContactOperation('create', 'failed');
        throw createError;
      }
      
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
    // Log the conditions for debugging
    this.logger.log(`Checking WhatsApp confirmation conditions for order ${order.order_id}:`, {
      hasWhatsApp,
      whatsapp_alerts_enabled: order.whatsapp_alerts_enabled,
      branch: order.branch,
      branch_lowercase: order.branch?.toLowerCase(),
      is_il_branch: order.branch?.toLowerCase() === 'il',
      whatsapp_confirmation_sent: order.whatsapp_confirmation_sent,
    });

    // Check all conditions for sending WhatsApp confirmation
    if (
      !hasWhatsApp ||
      !order.whatsapp_alerts_enabled ||
      order.branch?.toLowerCase() !== 'il' ||
      order.whatsapp_confirmation_sent
    ) {
      if (!hasWhatsApp) {
        this.logger.log(
          `Contact doesn't have WhatsApp for order ${order.order_id}, skipping`,
        );
      } else if (!order.whatsapp_alerts_enabled) {
        this.logger.log(
          `WhatsApp alerts disabled for order ${order.order_id}, skipping`,
        );
      } else if (order.branch?.toLowerCase() !== 'il') {
        this.logger.log(
          `Non-IL branch (${order.branch}) for order ${order.order_id}, skipping`,
        );
      } else if (order.whatsapp_confirmation_sent) {
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
   * Update sync attempt tracking - now handled by fieldMapper
   * @deprecated Use fieldMapper.updateCBBSyncStatus instead
   */
  private async updateSyncAttempt(orderId: string): Promise<void> {
    // This is now handled in the main sync method via fieldMapper
    this.logger.debug(`Sync attempt update handled by fieldMapper for order ${orderId}`);
  }

  /**
   * Record sync error in database
   */
  private async recordSyncError(orderId: string, errorMessage: string): Promise<void> {
    // Get current error count from CBB contact record
    const cbbContact = await this.fieldMapper.getCBBContact(orderId);
    const currentErrorCount = cbbContact?.cbb_sync_error_count || 0;
    
    // Update error info in cbb_contacts table
    await this.fieldMapper.updateCBBSyncStatus(orderId, {
      cbb_sync_error_count: currentErrorCount + 1,
      cbb_sync_last_error: errorMessage.substring(0, 500) // Limit error message length
    });
  }

  /**
   * Categorize error type for metrics
   */
  private categorizeError(error: unknown): string {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('network')) return 'network';
    if (message.includes('unauthorized') || message.includes('401')) return 'auth';
    if (message.includes('rate limit') || message.includes('429')) return 'rate_limit';
    if (message.includes('not found') || message.includes('404')) return 'not_found';
    if (message.includes('validation') || message.includes('invalid')) return 'validation';
    if (message.includes('database') || message.includes('supabase')) return 'database';
    if (message.includes('cbb') || message.includes('api')) return 'api_error';
    
    return 'unknown';
  }

  /**
   * Update order with CBB sync status
   */
  private async updateOrderCBBStatus(
    orderId: string,
    contactId: string | null,
    synced: boolean,
    errorMessage?: string,
  ): Promise<void> {
    const updateData: any = {
      cbb_contact_id: contactId,
      cbb_synced: synced,
      updated_at: new Date().toISOString(),
    };

    // Clear error fields on success
    if (synced && !errorMessage) {
      updateData.cbb_sync_last_error = null;
    } else if (errorMessage) {
      updateData.cbb_sync_last_error = errorMessage.substring(0, 500);
    }

    const { error } = await this.supabaseService.serviceClient
      .from('orders')
      .update(updateData)
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

  /**
   * Update order with CBB contact UUID link
   */
  private async updateOrderCBBContactLink(orderId: string, cbbContactUuid: string): Promise<void> {
    const { error } = await this.supabaseService.serviceClient
      .from('orders')
      .update({ 
        cbb_contact_uuid: cbbContactUuid,
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    if (error) {
      this.logger.error(
        `Failed to link order ${orderId} to CBB contact ${cbbContactUuid}:`,
        error,
      );
      // Don't throw error - this is not critical enough to fail the entire sync
    } else {
      this.logger.log(
        `Linked order ${orderId} to CBB contact ${cbbContactUuid}`,
      );
    }
  }
}