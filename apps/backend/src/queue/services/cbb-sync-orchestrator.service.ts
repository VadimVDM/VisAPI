import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CbbClientService, getFieldDefinition } from '@visapi/backend-core-cbb';
import {
  CBBContactSyncResult,
  CBBContactData,
  CBBCustomField,
} from '@visapi/shared-types';
import { SupabaseService } from '@visapi/core-supabase';
import { LogService } from '@visapi/backend-logging';
import { CBBSyncMetricsService } from './cbb-sync-metrics.service';
import { WhatsAppTranslationService } from './whatsapp-translation.service';
import { CbbContactSyncService } from './cbb-contact-sync.service';
import { CbbWhatsAppService } from './cbb-whatsapp.service';
import { OrderData, ApplicantData } from './cbb-order.types';
import { CBBContactRecord } from '@visapi/backend-queue';

// Define a proper type for the CBB contact record from Supabase
interface CBBContact {
  id: string;
  order_id: string;
  client_phone: string;
  client_email: string;
  client_name: string;
  product_country: string;
  product_doc_type?: string;
  product_intent?: string;
  product_entries?: string;
  product_validity?: string;
  is_urgent: boolean;
  processing_days: number;
  language_code: string;
  country_name_translated?: string;
  visa_type_translated?: string;
  processing_days_translated?: string;
  branch: string;
  order_days: number;
  alerts_enabled: boolean;
  cbb_synced: boolean;
  cbb_sync_attempts: number;
  cbb_sync_error_count: number;
  cbb_contact_id?: string;
  cbb_sync_last_attempt_at?: string;
  cbb_sync_last_error?: string;
  new_order_notification_sent?: boolean;
  new_order_notification_sent_at?: string;
  created_at: string;
  updated_at: string;
}

type CbbContactUpdate = Partial<
  Pick<
    CBBContact,
    | 'cbb_contact_id'
    | 'cbb_synced'
    | 'cbb_sync_attempts'
    | 'cbb_sync_error_count'
    | 'cbb_sync_last_error'
    | 'alerts_enabled'
    | 'new_order_notification_sent'
  > & {
    cbb_sync_last_attempt_at?: Date;
    new_order_notification_sent_at?: Date;
    updated_at?: string;
  }
>;

/**
 * Service responsible for orchestrating CBB contact synchronization
 * Handles the sync flow, database operations, and WhatsApp queuing
 */
@Injectable()
export class CBBSyncOrchestratorService {
  constructor(
    @InjectPinoLogger(CBBSyncOrchestratorService.name)
    private readonly logger: PinoLogger,
    private readonly cbbService: CbbClientService,
    private readonly supabaseService: SupabaseService,
    private readonly logService: LogService,
    private readonly metricsService: CBBSyncMetricsService,
    private readonly translationService: WhatsAppTranslationService,
    private readonly contactSyncService: CbbContactSyncService,
    private readonly whatsappService: CbbWhatsAppService,
  ) {}

  private async getCBBContact(orderId: string): Promise<CBBContact | null> {
    const { data, error } = await this.supabaseService.serviceClient
      .from('cbb_contacts')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      this.logger.error(
        { error },
        `Failed to get CBB contact for order ${orderId}`,
      );
    }

    return data as CBBContact | null;
  }

  private async saveCBBContact(
    order: OrderData,
    translations: {
      countryNameTranslated?: string;
      visaTypeTranslated?: string;
      processingDaysTranslated?: string;
    } = {},
  ): Promise<CBBContact | null> {
    const language = this.mapBranchToLanguage(order.branch);
    // Use processing_days from order (from product.wait in webhook), default to 3
    const processingDays = order.processing_days || 3;

    const contactData: Omit<
      CBBContact,
      'id' | 'created_at' | 'updated_at' | 'cbb_contact_uuid'
    > = {
      order_id: order.order_id,
      client_phone: order.client_phone,
      client_email: order.client_email,
      client_name: order.client_name,
      product_country: order.product_country,
      product_doc_type: order.product_doc_type || undefined,
      product_intent: order.product_intent ?? undefined,
      product_entries: order.product_entries ?? undefined,
      product_validity: order.product_validity ?? undefined,
      is_urgent: order.is_urgent === true, // Store boolean directly
      processing_days: processingDays,
      language_code: language, // Use language code directly from mapBranchToLanguage (he/ru/sv/en)
      country_name_translated: translations.countryNameTranslated,
      visa_type_translated: translations.visaTypeTranslated,
      processing_days_translated: translations.processingDaysTranslated,
      branch: order.branch,
      order_days: processingDays,
      alerts_enabled: order.whatsapp_alerts_enabled ?? true, // Internal tracking for WhatsApp notifications
      cbb_synced: false,
      cbb_sync_attempts: 0,
      cbb_sync_error_count: 0,
    };

    const { data, error } = await this.supabaseService.serviceClient
      .from('cbb_contacts')
      .upsert(contactData, { onConflict: 'order_id' })
      .select()
      .single();

    if (error) {
      this.logger.error(
        { error },
        `Failed to save CBB contact for order ${order.order_id}`,
      );
      return null;
    }

    return data as CBBContact;
  }

  private async updateCBBSyncStatus(
    orderId: string,
    updates: CbbContactUpdate,
  ): Promise<void> {
    const updateData: Record<string, unknown> = { ...updates };

    if (updates.cbb_sync_last_attempt_at) {
      updateData.cbb_sync_last_attempt_at =
        updates.cbb_sync_last_attempt_at.toISOString();
    }
    if (updates.new_order_notification_sent_at) {
      updateData.new_order_notification_sent_at =
        updates.new_order_notification_sent_at.toISOString();
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const { error } = await this.supabaseService.serviceClient
      .from('cbb_contacts')
      .update(updateData)
      .eq('order_id', orderId);

    if (error) {
      this.logger.error(
        { error },
        `Failed to update CBB sync status for order ${orderId}`,
      );
    }
  }

  /**
   * Main sync orchestration method with enhanced error handling
   */
  async syncOrderToCBB(orderId: string): Promise<CBBContactSyncResult> {
    this.logger.info(`Starting CBB contact sync for order: ${orderId}`);

    // Start metrics tracking
    const endTimer = this.metricsService.startSync();

    // 1. Fetch order details
    const order = await this.getOrderByOrderId(orderId);
    if (!order) {
      const duration = endTimer();
      this.metricsService.recordSyncComplete(
        'failed',
        'skipped',
        'unknown',
        duration,
      );
      this.metricsService.recordSyncError('order_not_found', 'unknown');
      throw new Error(`Order ${orderId} not found`);
    }

    const branch = order.branch || 'unknown';

    // 2. Early branch validation - only process IL branch orders
    if (branch.toLowerCase() !== 'il') {
      this.logger.info(
        `CBB sync skipped - non-IL branch order ${orderId} (branch: ${branch})`,
      );
      const duration = endTimer();
      this.metricsService.recordSyncComplete(
        'success',
        'skipped',
        branch,
        duration,
      );
      return {
        status: 'success',
        action: 'skipped',
        contactId: undefined,
      };
    }

    // 3. Check or create CBB contact record (cached for reuse)
    let cbbContact = await this.getCBBContact(orderId);

    // If no CBB contact record exists, create it first
    if (!cbbContact) {
      this.logger.info(`Creating CBB contact record for order: ${orderId}`);

      // Generate translations for Hebrew localization
      const language = this.mapBranchToLanguage(order.branch);
      const translations: {
        countryNameTranslated?: string;
        visaTypeTranslated?: string;
        processingDaysTranslated?: string;
      } = {};

      if (language === 'he') {
        translations.countryNameTranslated =
          this.translationService.getCountryNameHebrew(order.product_country);
        translations.visaTypeTranslated =
          this.translationService.getVisaTypeHebrew(
            order.product_doc_type || 'evisa',
            order.product_intent || undefined,
            order.product_country,
            order.product_entries || undefined,
            order.product_validity || undefined,
            undefined, // Don't use visa_usage_deadline_days (days_to_use - incorrect data)
          );

        // Use processing_days directly from order (from product.wait in webhook)
        const processingDays = order.processing_days || 3;

        // Format Hebrew processing days message
        if (processingDays === 1) {
          // Special formatting for 1 day: "תוך יום עסקים אחד"
          translations.processingDaysTranslated = 'תוך יום עסקים אחד';
        } else {
          // For 2+ days: "תוך X ימי עסקים"
          translations.processingDaysTranslated = `תוך ${processingDays} ימי עסקים`;
        }
      }

      cbbContact = await this.saveCBBContact(order, translations);
      if (!cbbContact) {
        const duration = endTimer();
        this.metricsService.recordSyncComplete(
          'failed',
          'skipped',
          branch,
          duration,
        );
        this.metricsService.recordSyncError('database_create_failed', branch);
        throw new Error(
          `Failed to create CBB contact record for order ${orderId}`,
        );
      }
    }

    // 4. Update sync attempt tracking
    await this.updateCBBSyncStatus(orderId, {
      cbb_sync_attempts: (cbbContact.cbb_sync_attempts || 0) + 1,
      cbb_sync_last_attempt_at: new Date(),
    });
    this.metricsService.recordSyncAttempt(branch);

    // 5. Check if already synced
    if (cbbContact.cbb_synced === true && cbbContact.cbb_contact_id) {
      this.logger.info(
        `Order ${orderId} already synced with contact ${cbbContact.cbb_contact_id}`,
      );
      const duration = endTimer();
      this.metricsService.recordSyncComplete(
        'success',
        'skipped',
        branch,
        duration,
      );
      return {
        status: 'success',
        action: 'skipped',
        contactId: cbbContact.cbb_contact_id,
      };
    }

    try {
      // 6. Prepare contact data
      const contactData = this.mapOrderToContact(order);

      // 7. Create or update contact with error handling
      const { contact, isNewContact, error } =
        await this.contactSyncService.createOrUpdateContact(
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

      // 8. Validate WhatsApp availability
      let hasWhatsApp = false;
      try {
        hasWhatsApp = await this.cbbService.validateWhatsApp(
          order.client_phone,
        );
        this.metricsService.recordWhatsAppAvailability(hasWhatsApp, branch);
      } catch (whatsappError) {
        this.logger.warn(
          `WhatsApp validation failed for ${order.client_phone}: ${(whatsappError as Error).message}`,
        );
        this.metricsService.recordWhatsAppAvailability(false, branch);
        // Continue without WhatsApp
      }

      // 9. Update CBB contact record with results
      await this.updateCBBSyncStatus(orderId, {
        cbb_contact_id: contact?.id,
        cbb_synced: true,
        cbb_sync_last_error: error || undefined,
      });

      // 10. Link the order to the CBB contact record
      if (contact && !error && cbbContact) {
        await this.updateOrderCBBContactLink(orderId, cbbContact.id);
      }

      // 11. Queue WhatsApp confirmation if applicable
      this.logger.info(`Pre-WhatsApp queue check for order ${orderId}:`, {
        has_contact: !!contact,
        contact_id: contact?.id,
        has_error: !!error,
        error_message: error,
      });

      if (contact && !error) {
        await this.whatsappService.queueOrderConfirmation(
          order,
          contact.id,
          hasWhatsApp,
          cbbContact as CBBContactRecord,
        );
      } else {
        this.logger.warn(
          `Skipping WhatsApp queue for order ${orderId}: contact=${!!contact}, error=${error}`,
        );
      }

      // 12. Log success
      await this.logSyncSuccess(
        order,
        contact?.id || '',
        isNewContact,
        hasWhatsApp,
        cbbContact,
      );

      // Record metrics
      const duration = endTimer();
      const status = error ? 'partial' : hasWhatsApp ? 'success' : 'success';
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
      this.metricsService.recordSyncComplete(
        'failed',
        'skipped',
        branch,
        duration,
      );
      this.metricsService.recordSyncError(errorType, branch);
      await this.recordSyncError(orderId, (error as Error).message);
      throw error;
    }
  }

  private async queueWhatsAppConfirmation(
    order: OrderData,
    contactId: string,
    hasWhatsApp: boolean,
    cbbContact: CBBContact,
  ): Promise<void> {
    await this.whatsappService.queueOrderConfirmation(
      order,
      contactId,
      hasWhatsApp,
      cbbContact as CBBContactRecord,
    );
  }

  /**
   * Log successful sync to database
   */
  private async logSyncSuccess(
    order: OrderData,
    contactId: string,
    isNewContact: boolean,
    hasWhatsApp: boolean,
    cbbContact: CBBContact, // Passed from caller to avoid re-fetching
  ): Promise<void> {
    const action = isNewContact ? 'created' : 'updated';
    const whatsappQueued =
      hasWhatsApp &&
      order.whatsapp_alerts_enabled &&
      order.branch?.toLowerCase() === 'il' &&
      cbbContact?.alerts_enabled !== false &&
      cbbContact?.new_order_notification_sent !== true; // Will be true after notification is queued

    // Only log detailed sync info in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.info(
        `CBB contact sync successful for order ${order.order_id}`,
        {
          contact_id: contactId,
          action,
          has_whatsapp: hasWhatsApp,
          whatsapp_queued: whatsappQueued,
          new_order_notification_sent: cbbContact?.new_order_notification_sent,
        },
      );
    }

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
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

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
      this.logger.error({ error }, `Failed to fetch order ${orderId}`);
      return null;
    }

    return data as OrderData;
  }

  /**
   * Update sync attempt tracking - now handled by fieldMapper
   * @deprecated This method is no longer used and will be removed.
   */
  private updateSyncAttempt(orderId: string): void {
    this.logger.debug(
      `Sync attempt update is now handled by the orchestrator for order ${orderId}. This method is deprecated.`,
    );
  }

  /**
   * Record sync error in database
   */
  private async recordSyncError(
    orderId: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      const cbbContact = await this.getCBBContact(orderId);
      const currentErrorCount = cbbContact?.cbb_sync_error_count || 0;

      await this.updateCBBSyncStatus(orderId, {
        cbb_sync_error_count: currentErrorCount + 1,
        cbb_sync_last_error: errorMessage.substring(0, 500),
      });
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        `Failed to record sync error for order ${orderId}`,
      );
    }
  }

  /**
   * Categorize error type for metrics
   */
  private categorizeError(error: unknown): string {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (message.includes('timeout')) return 'timeout';
    if (message.includes('network')) return 'network';
    if (message.includes('unauthorized') || message.includes('401'))
      return 'auth';
    if (message.includes('rate limit') || message.includes('429'))
      return 'rate_limit';
    if (message.includes('not found') || message.includes('404'))
      return 'not_found';
    if (message.includes('validation') || message.includes('invalid'))
      return 'validation';
    if (message.includes('database') || message.includes('supabase'))
      return 'database';
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
    const updateData: {
      cbb_contact_id: string | null;
      cbb_synced: boolean;
      updated_at: string;
      cbb_sync_last_error?: string | null;
    } = {
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
        { error },
        `Failed to update CBB status for order ${orderId}`,
      );
      throw error;
    } else {
      this.logger.info(
        `Updated CBB status for order ${orderId}: synced=${synced}, contact_id=${contactId}`,
      );
    }
  }

  /**
   * Update order with CBB contact UUID link
   */
  private async updateOrderCBBContactLink(
    orderId: string,
    cbbContactUuid: string,
  ): Promise<void> {
    const { error } = await this.supabaseService.serviceClient
      .from('orders')
      .update({
        cbb_contact_uuid: cbbContactUuid,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    if (error) {
      this.logger.error(
        { error },
        `Failed to link order ${orderId} to CBB contact ${cbbContactUuid}`,
      );
      // Don't throw error - this is not critical enough to fail the entire sync
    } else {
      this.logger.info(
        `Linked order ${orderId} to CBB contact ${cbbContactUuid}`,
      );
    }
  }

  /**
   * Map branch code to language code for translations
   */
  private mapBranchToLanguage(branch?: string): string {
    switch (branch?.toLowerCase()) {
      case 'il':
        return 'he';
      case 'ru':
        return 'ru';
      case 'se':
        return 'sv';
      case 'co':
      default:
        return 'en';
    }
  }

  private mapOrderToContact(order: OrderData): CBBContactData {
    // Use the direct is_urgent boolean field from orders table
    const isUrgent = order.is_urgent === true;
    const orderDateUnix = this.convertDateToUnix(
      order.entry_date ?? '',
      order.order_id,
    );
    // Use webhook_received_at for the actual order creation time
    const orderCreationDateUnix = this.convertDateToUnix(
      order.webhook_received_at,
      order.order_id,
    );
    const gender = this.extractGender(
      order.applicants_data || [],
      order.order_id,
    );
    const language = this.mapBranchToLanguage(order.branch);
    const countryFlag = this.getCountryFlag(order.product_country);
    // CRITICAL FIX: Use product_validity string ONLY, not visa_usage_deadline_days
    // visa_usage_deadline_days contains days_to_use from Vizi (often incorrect)
    // We should only use the validity string field for customer-facing validity info
    const visaValidityWithUnits = this.getVisaValidityWithUnits(
      order.product_validity ?? undefined,
      undefined, // DO NOT pass visa_usage_deadline_days - use validity string only
    );

    // Use processing_days from database (calculated by business rules engine)
    // If not available, calculate based on urgency
    // Use processing_days from order (from product.wait in webhook), default to 3
    const processingDays = order.processing_days || 3;

    // Use actual product data from the order
    const visaIntent = order.product_intent || 'tourism';
    const visaEntries = order.product_entries || 'single';
    const stayLimit = order.product_data?.stay_limit || 30; // Default to 30 days if not specified

    this.logger.debug(
      `Mapped order ${order.order_id}: intent=${visaIntent}, entries=${visaEntries}, validity=${visaValidityWithUnits}, processing=${processingDays} days, stay_limit=${stayLimit} days`,
    );

    return {
      id: order.client_phone,
      phone: order.client_phone,
      name: order.client_name,
      email: order.client_email,
      gender: gender,
      language: language,
      customFields: this.buildCustomFields(order, {
        isUrgent,
        orderDateUnix,
        orderCreationDateUnix,
        visaIntent,
        visaEntries,
        visaValidityWithUnits,
        countryFlag,
        processingDays,
        stayLimit,
      }),
    };
  }

  /**
   * Build custom fields for CBB contact sync using new CBBCustomField[] array format
   *
   * Uses field registry to get stable field IDs for each custom field.
   * This provides explicit field ID control and type safety at the orchestrator level.
   *
   * @returns Array of CBBCustomField objects with {id, name, value} structure
   * @see libs/backend/core-cbb/src/lib/CLAUDE-FIELD-REGISTRY.md for field registry docs
   */
  private buildCustomFields(
    order: OrderData,
    computed: {
      isUrgent: boolean;
      orderDateUnix?: number;
      orderCreationDateUnix?: number;
      visaIntent: string;
      visaEntries: string;
      visaValidityWithUnits: string;
      countryFlag: string;
      processingDays: number;
      stayLimit: number;
    },
  ): CBBCustomField[] {
    const fields: CBBCustomField[] = [];

    // Helper to add field with registry lookup
    const addField = (
      name: string,
      value: string | number | boolean | undefined,
    ) => {
      if (value === undefined || value === null) {
        return; // Skip undefined/null values
      }

      const fieldDef = getFieldDefinition(name);
      if (!fieldDef) {
        this.logger.warn(
          `Field '${name}' not found in registry - skipping (value: ${value})`,
        );
        return;
      }

      fields.push({
        id: fieldDef.id,
        name: fieldDef.name,
        value,
      });
    };

    // Text fields (type 0)
    addField('customer_name', order.client_name);
    addField('visa_country', order.product_country);
    addField('visa_type', order.product_doc_type || 'tourist');
    addField('OrderNumber', order.order_id);
    addField('visa_intent', computed.visaIntent);
    addField('visa_entries', computed.visaEntries);
    addField('visa_validity', computed.visaValidityWithUnits); // CUF ID: 816014
    addField('visa_flag', computed.countryFlag);
    addField('Email', order.client_email); // System field ID: -12

    // Number fields (type 1)
    addField('visa_quantity', order.visa_quantity || 1);
    addField('order_days', computed.processingDays); // CUF ID: 271948
    addField('order_sum_ils', order.amount || 0); // CUF ID: 358366
    addField('stay_limit', computed.stayLimit); // CUF ID: 189039

    // Boolean fields (type 4) - CBB expects 1 for true, 0 for false
    addField('order_urgent', computed.isUrgent ? 1 : 0); // CUF ID: 763048
    addField('wa_alerts', order.whatsapp_alerts_enabled ? 1 : 0); // CUF ID: 662459

    // Date fields (type 3) - Unix timestamps in seconds
    addField('order_date', computed.orderDateUnix);
    addField('order_date_time', computed.orderCreationDateUnix); // CUF ID: 100644

    return fields;
  }

  private convertDateToUnix(
    dateString: string,
    orderId: string,
  ): number | undefined {
    if (!dateString) {
      return undefined;
    }

    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const unixTimestamp = Math.floor(date.getTime() / 1000);
        this.logger.debug(
          `Converted entry_date ${dateString} to Unix timestamp: ${unixTimestamp} for order ${orderId}`,
        );
        return unixTimestamp;
      }
    } catch (error) {
      this.logger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        `Failed to convert entry_date to Unix timestamp: ${dateString} for order ${orderId}`,
      );
    }

    return undefined;
  }

  private extractGender(
    applicantsData: ApplicantData[],
    orderId: string,
  ): string | undefined {
    if (
      !applicantsData ||
      !Array.isArray(applicantsData) ||
      !applicantsData[0]
    ) {
      return undefined;
    }

    const firstApplicant = applicantsData[0];
    if (firstApplicant.passport?.sex) {
      // Convert passport sex (m/f) to CBB gender format
      const gender =
        firstApplicant.passport.sex === 'm'
          ? 'male'
          : firstApplicant.passport.sex === 'f'
            ? 'female'
            : undefined;

      this.logger.debug(
        `Extracted gender for ${orderId}: ${gender} from passport sex: ${firstApplicant.passport.sex}`,
      );

      return gender;
    }

    return undefined;
  }

  private getCountryFlag(country: string): string {
    const normalizedCountry = country?.toLowerCase().trim();
    const countryFlags: Record<string, string> = {
      india: '🇮🇳',
      usa: '🇺🇸',
      us: '🇺🇸',
      'united states': '🇺🇸',
      'u.s.': '🇺🇸',
      uk: '🇬🇧',
      'united kingdom': '🇬🇧',
      britain: '🇬🇧',
      canada: '🇨🇦',
      israel: '🇮🇱',
      thailand: '🇹🇭',
      'south korea': '🇰🇷',
      korea: '🇰🇷',
      vietnam: '🇻🇳',
      'saudi arabia': '🇸🇦',
      saudi: '🇸🇦',
      indonesia: '🇮🇩',
      bahrain: '🇧🇭',
      'new zealand': '🇳🇿',
      cambodia: '🇰🇭',
      schengen: '🇪🇺',
      'schengen area': '🇪🇺',
      morocco: '🇲🇦',
      'sri lanka': '🇱🇰',
      togo: '🇹🇬',
    };
    return countryFlags[normalizedCountry] || '';
  }

  private getVisaValidityWithUnits(
    validity?: string,
    daysToUse?: number,
  ): string {
    // If specific days are provided, format with "days" unit (priority logic)
    if (daysToUse) {
      if (daysToUse === 30) {
        return '1 month';
      } else if (daysToUse === 60) {
        return '2 months';
      } else if (daysToUse === 90) {
        return '3 months';
      } else if (daysToUse === 180) {
        return '6 months';
      } else if (daysToUse === 365) {
        return '1 year';
      } else if (daysToUse === 730) {
        return '2 years';
      } else if (daysToUse === 1095) {
        return '3 years';
      } else if (daysToUse === 1825) {
        return '5 years';
      } else if (daysToUse === 3650) {
        return '10 years';
      } else if (daysToUse === 14 || daysToUse === 15) {
        return '2 weeks';
      } else {
        return `${daysToUse} days`;
      }
    }

    // Normalize validity string: lowercase, trim, remove all underscores
    // This handles formats like "2_years", "3_months", etc. from Vizi API
    const normalizedValidity = validity?.toLowerCase().trim().replace(/_/g, '');

    // Map validity period to formatted string with units
    switch (normalizedValidity) {
      case 'month':
      case '1month':
        return '1 month';
      case 'year':
      case '1year':
        return '1 year';
      case '2weeks':
      case '15days':
        return '2 weeks';
      case '2months':
        return '2 months';
      case '3months':
        return '3 months';
      case '6months':
        return '6 months';
      case '2years':
        return '2 years';
      case '3years':
        return '3 years';
      case '5years':
        return '5 years';
      case '10years':
        return '10 years';
      default:
        // Log unrecognized formats for debugging
        if (validity) {
          this.logger.warn(
            `Unrecognized validity format: "${validity}" (normalized: "${normalizedValidity}") - using default "30 days"`,
          );
        }
        return '30 days'; // Default to 30 days
    }
  }
}
