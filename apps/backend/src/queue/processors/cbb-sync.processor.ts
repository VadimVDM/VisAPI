import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CbbClientService } from '@visapi/backend-core-cbb';
import { CBBContactData, CBBContactSyncResult } from '@visapi/shared-types';
import { SupabaseService } from '@visapi/core-supabase';
import { LogService } from '@visapi/backend-logging';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

interface CBBSyncJobData {
  orderId: string;
}

interface OrderData {
  order_id: string;
  client_phone: string;
  client_name: string;
  client_email: string;
  product_country: string;
  product_doc_type: string;
  product_intent?: string;  // New field
  product_entries?: string; // New field
  product_validity?: string; // New field
  product_days_to_use?: number; // New field
  visa_quantity: number;
  urgency: string;
  amount: number;
  currency: string;
  entry_date: string;
  branch: string;
  form_id: string;
  webhook_received_at: string;
  whatsapp_alerts_enabled: boolean;
  passport_data?: any; // Legacy field - not used anymore
  applicants_data?: any; // JSONB field - could be array or null
  cbb_synced?: boolean;  // Made optional since it might be null in DB
  cbb_contact_id?: string;
}

@Injectable()
@Processor('cbb-sync')
export class CBBSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(CBBSyncProcessor.name);

  constructor(
    private readonly cbbService: CbbClientService,
    private readonly supabaseService: SupabaseService,
    private readonly logService: LogService,
    @InjectMetric('cbb_sync_total')
    private readonly syncTotalCounter: Counter<string>,
    @InjectMetric('cbb_sync_success')
    private readonly syncSuccessCounter: Counter<string>,
    @InjectMetric('cbb_sync_failures')
    private readonly syncFailureCounter: Counter<string>,
    @InjectMetric('cbb_sync_duration')
    private readonly syncDurationHistogram: Histogram<string>,
    @InjectMetric('cbb_contacts_created')
    private readonly contactsCreatedCounter: Counter<string>,
    @InjectMetric('cbb_contacts_updated')
    private readonly contactsUpdatedCounter: Counter<string>,
    @InjectMetric('cbb_whatsapp_available')
    private readonly whatsappAvailableCounter: Counter<string>,
    @InjectMetric('cbb_whatsapp_unavailable')
    private readonly whatsappUnavailableCounter: Counter<string>,
  ) {
    super();
  }

  async process(job: Job<CBBSyncJobData>): Promise<CBBContactSyncResult> {
    const { orderId } = job.data;
    const startTime = Date.now();

    this.logger.log(`Starting CBB contact sync for order: ${orderId}`);
    this.syncTotalCounter.inc();

    // Log to database
    await this.logService.createLog({
      level: 'info',
      message: 'Starting CBB contact sync',
      metadata: {
        order_id: orderId,
        job_id: job.id,
        source: 'cbb_sync',
      },
    });

    try {
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
      const contactData = this.prepareContactData(order);

      // 4. Check if contact exists
      let contact = await this.cbbService.getContactById(order.client_phone);
      let isNewContact = false;

      if (contact) {
        // CBB API limitation: Can only update custom fields, not basic fields
        this.logger.warn(
          `Contact ${order.client_phone} exists. CBB API only allows updating custom fields.`,
        );

        // Check if basic fields differ
        if (
          contact.name !== contactData.name ||
          contact.email !== contactData.email
        ) {
          this.logger.warn(
            `Cannot update basic fields for existing contact ${order.client_phone}. ` +
              `Current: name="${contact.name}", email="${contact.email}". ` +
              `New: name="${contactData.name}", email="${contactData.email}"`,
          );
        }

        // Update custom fields only (CBB API limitation)
        contact = await this.cbbService.updateContactComplete(contactData);
        this.logger.log(
          `Updated CBB contact custom fields for order ${orderId}`,
        );
        this.contactsUpdatedCounter.inc();
      } else {
        // Create new contact
        contact = await this.cbbService.createContactWithFields(contactData);
        isNewContact = true;
        this.logger.log(`Created new CBB contact for order ${orderId}`);
        this.contactsCreatedCounter.inc();
      }

      // 5. Validate WhatsApp
      const hasWhatsApp = await this.cbbService.validateWhatsApp(
        order.client_phone,
      );

      if (hasWhatsApp) {
        this.whatsappAvailableCounter.inc();
      } else {
        this.whatsappUnavailableCounter.inc();
      }

      // 6. Update order with results
      await this.updateOrderCBBStatus(orderId, contact.id, true);

      // 7. Log success
      this.logger.log(`CBB contact sync successful for order ${orderId}`, {
        contact_id: contact.id,
        action: isNewContact ? 'created' : 'updated',
        has_whatsapp: hasWhatsApp,
      });

      // Log to database
      await this.logService.createLog({
        level: 'info',
        message: `CBB contact sync ${hasWhatsApp ? 'successful' : 'completed - no WhatsApp'}`,
        metadata: {
          order_id: orderId,
          cbb_contact_id: contact.id,
          action: isNewContact ? 'created' : 'updated',
          has_whatsapp: hasWhatsApp,
          client_phone: order.client_phone,
          client_name: order.client_name,
          source: 'cbb_sync',
        },
      });

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      this.syncDurationHistogram.observe(duration);
      this.syncSuccessCounter.inc();

      return {
        status: hasWhatsApp ? 'success' : 'no_whatsapp',
        action: isNewContact ? 'created' : 'updated',
        contactId: contact.id,
        hasWhatsApp,
      };
    } catch (error) {
      // Handle errors
      await this.handleSyncError(orderId, error);
      this.syncFailureCounter.inc();

      const duration = (Date.now() - startTime) / 1000;
      this.syncDurationHistogram.observe(duration);

      throw error;
    }
  }

  private prepareContactData(order: OrderData): CBBContactData {
    // Determine if order is urgent (for CBB boolean field)
    const isUrgent = order.urgency === 'urgent' || order.urgency === 'express';

    // Calculate order_date Unix timestamp (in seconds)
    let orderDateUnix: number | undefined;
    if (order.entry_date) {
      try {
        const date = new Date(order.entry_date);
        if (!isNaN(date.getTime())) {
          orderDateUnix = Math.floor(date.getTime() / 1000); // Convert to seconds
          this.logger.debug(
            `Converted entry_date ${order.entry_date} to Unix timestamp: ${orderDateUnix}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to convert entry_date to Unix timestamp: ${order.entry_date}`,
        );
      }
    }

    // Extract gender from first applicant's passport data
    let gender: string | undefined;
    if (
      order.applicants_data &&
      Array.isArray(order.applicants_data) &&
      order.applicants_data[0]
    ) {
      const firstApplicant = order.applicants_data[0];
      if (firstApplicant.passport?.sex) {
        // Convert passport sex (m/f) to CBB gender format
        gender =
          firstApplicant.passport.sex === 'm'
            ? 'male'
            : firstApplicant.passport.sex === 'f'
              ? 'female'
              : undefined;
        this.logger.debug(
          `Extracted gender for ${order.order_id}: ${gender} from passport sex: ${firstApplicant.passport.sex}`,
        );
      }
    }

    // Map language based on branch - optional field, only set if we have a mapping
    // IL = Hebrew, RU = Russian, SE = Swedish, CO/others = English
    let language: string | undefined;
    switch (order.branch?.toLowerCase()) {
      case 'il':
        language = 'Hebrew';
        break;
      case 'ru':
        language = 'Russian';
        break;
      case 'se':
        language = 'Swedish';
        break;
      case 'co':
      default:
        // For CO (Colombia) and other branches, use English
        // Only set if explicitly needed, otherwise let CBB handle defaults
        language = 'English US';
    }
    this.logger.debug(`Mapped branch ${order.branch} to language: ${language}`);

    // Map country to flag emoji
    const countryToFlag = this.getCountryFlag(order.product_country);
    
    // Use ACTUAL product data from the order, not guessing from applicant data!
    let visaIntent = order.product_intent || 'tourism';
    let visaEntries = order.product_entries || 'single';
    let visaValidity = order.product_validity || 'month';
    
    // Convert validity to days if needed
    let visaValidityDays = '30'; // Default
    if (order.product_days_to_use) {
      visaValidityDays = String(order.product_days_to_use);
    } else if (visaValidity === 'month') {
      visaValidityDays = '30';
    } else if (visaValidity === 'year') {
      visaValidityDays = '365';
    } else if (visaValidity === '3months') {
      visaValidityDays = '90';
    } else if (visaValidity === '6months') {
      visaValidityDays = '180';
    }
    
    // Log what we're using for debugging
    this.logger.debug(
      `Using product data for ${order.order_id}: intent=${visaIntent}, entries=${visaEntries}, validity=${visaValidity} (${visaValidityDays} days)`
    );

    return {
      id: order.client_phone,
      phone: order.client_phone,
      name: order.client_name,
      email: order.client_email,
      gender: gender,
      language: language,
      cufs: {
        // CBB Custom Fields - Must match exact field names from CBB API
        // Text fields (type 0)
        customer_name: order.client_name,
        visa_country: order.product_country,
        visa_type: order.product_doc_type || 'tourist',
        OrderNumber: order.order_id,

        // Number fields (type 1)
        visa_quantity: order.visa_quantity || 1,

        // Boolean field (type 4) - CBB expects 1 for true, 0 for false
        order_urgent: isUrgent ? 1 : 0,

        // Additional order information (text fields)
        order_priority: order.urgency || 'standard',

        // Date field (type 2) expects Unix timestamp in seconds
        order_date: orderDateUnix,

        // New visa fields - using actual product data
        visa_intent: visaIntent,
        visa_entries: visaEntries,
        visa_validity: visaValidityDays,  // Use the converted days value
        visa_flag: countryToFlag,

        // System fields
        Email: order.client_email, // System field ID -12
      },
    };
  }

  private getCountryFlag(country: string): string {
    // Normalize country name
    const normalizedCountry = country?.toLowerCase().trim();
    
    // Map of country names to flag emojis
    const countryFlags: Record<string, string> = {
      'india': '🇮🇳',
      'usa': '🇺🇸',
      'us': '🇺🇸',
      'united states': '🇺🇸',
      'u.s.': '🇺🇸',
      'uk': '🇬🇧',
      'united kingdom': '🇬🇧',
      'britain': '🇬🇧',
      'canada': '🇨🇦',
      'israel': '🇮🇱',
      'thailand': '🇹🇭',
      'south korea': '🇰🇷',
      'korea': '🇰🇷',
      'vietnam': '🇻🇳',
      'saudi arabia': '🇸🇦',
      'saudi': '🇸🇦',
      'indonesia': '🇮🇩',
      'bahrain': '🇧🇭',
      'new zealand': '🇳🇿',
      'cambodia': '🇰🇭',
      'schengen': '🇪🇺',
      'schengen area': '🇪🇺',
      'morocco': '🇲🇦',
      'sri lanka': '🇱🇰',
      'togo': '🇹🇬',
    };
    
    return countryFlags[normalizedCountry] || '';
  }

  private async handleSyncError(orderId: string, error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    this.logger.error(`CBB contact sync failed for order ${orderId}`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Log error to database - detailed error info goes to logs, not orders table
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

  private async updateOrderCBBStatus(
    orderId: string,
    contactId: string,
    synced: boolean,
  ) {
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
        `Updated CBB status for order ${orderId}: synced=${synced}, contact_id=${contactId}`
      );
    }
  }
}
