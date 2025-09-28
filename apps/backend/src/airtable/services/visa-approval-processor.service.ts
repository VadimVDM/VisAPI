import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { ConfigService } from '@visapi/core-config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES } from '@visapi/shared-types';

interface VisaApplication {
  applicationId: string;
  visaId: string;
  visaUrl: string;
  status: string;
  country?: string;
}

interface VisaDetails {
  applications: VisaApplication[];
  processedAt: string;
  sourceView: string;
}

interface CompletedRecord {
  id: string;
  fields: {
    ID?: string;
    'Applications ↗'?: string[];
    Email?: string;
    Phone?: string;
    Status?: string;
    'פרט נוסף לשליחה'?: string;
  };
  expanded?: {
    Applications_expanded?: Array<{
      id: string;
      fields: {
        'Visa ID'?: string;
        'Visa URL'?: string;
        'Application ID'?: string;
        Status?: string;
        Country?: string;
      };
    }>;
  };
}

@Injectable()
export class VisaApprovalProcessorService {
  private readonly logger = new Logger(VisaApprovalProcessorService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_NAMES.WHATSAPP_MESSAGES)
    private readonly whatsappQueue: Queue,
  ) {}

  /**
   * Process new completed records and handle visa approvals
   */
  async processCompletedRecords(records: CompletedRecord[]): Promise<void> {
    this.logger.log(`Processing ${records.length} completed records for visa approvals`);

    for (const record of records) {
      try {
        await this.processRecord(record);
      } catch (error) {
        this.logger.error(`Failed to process record ${record.id}:`, error);
      }
    }
  }

  /**
   * Process a single completed record
   */
  private async processRecord(record: CompletedRecord): Promise<void> {
    const orderId = record.fields.ID;
    if (!orderId) {
      this.logger.debug(`Skipping record ${record.id} - no order ID`);
      return;
    }

    // Check if we have expanded application data
    const applications = record.expanded?.Applications_expanded;
    if (!applications || applications.length === 0) {
      this.logger.debug(`No applications found for order ${orderId}`);
      return;
    }

    // Build visa details from applications
    const visaDetails = this.buildVisaDetails(applications);
    if (visaDetails.applications.length === 0) {
      this.logger.debug(`No valid visa details found for order ${orderId}`);
      return;
    }

    // Update order with visa details
    await this.updateOrderWithVisaDetails(orderId, visaDetails);

    // Check if we should send notification
    const shouldNotify = await this.shouldSendNotification(orderId);
    if (shouldNotify) {
      await this.queueVisaNotification(orderId, visaDetails);
    }
  }

  /**
   * Build visa details from expanded applications
   */
  private buildVisaDetails(applications: any[]): VisaDetails {
    const visaApplications: VisaApplication[] = [];

    for (const app of applications) {
      const visaId = app.fields['Visa ID'];
      const visaUrl = app.fields['Visa URL'];
      const applicationId = app.fields['Application ID'];

      if (visaId && visaUrl && applicationId) {
        visaApplications.push({
          applicationId,
          visaId,
          visaUrl,
          status: app.fields.Status || 'Approved',
          country: app.fields.Country,
        });
      }
    }

    return {
      applications: visaApplications,
      processedAt: new Date().toISOString(),
      sourceView: 'viwgYjpU6K6nXq8ii', // completed view ID
    };
  }

  /**
   * Update order with visa details
   */
  private async updateOrderWithVisaDetails(
    orderId: string,
    visaDetails: VisaDetails,
  ): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .from('orders')
      .update({
        visa_details: visaDetails,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update order ${orderId}: ${error.message}`);
    }

    this.logger.log(`Updated order ${orderId} with visa details`);
  }

  /**
   * Check if we should send visa notification
   */
  private async shouldSendNotification(orderId: string): Promise<boolean> {
    const { data: order, error } = await this.supabase
      .getClient()
      .from('orders')
      .select('visa_notification_sent, cbb_contact_uuid, notifications_enabled')
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      this.logger.error(`Failed to check notification status for ${orderId}:`, error);
      return false;
    }

    // Check conditions:
    // 1. Notification not already sent
    // 2. Has CBB contact synced
    // 3. Notifications are enabled
    return (
      !order.visa_notification_sent &&
      order.cbb_contact_uuid !== null &&
      order.notifications_enabled !== false
    );
  }

  /**
   * Queue visa approval notification for WhatsApp
   */
  private async queueVisaNotification(
    orderId: string,
    visaDetails: VisaDetails,
  ): Promise<void> {
    // Get order and CBB contact details
    const { data: order, error } = await this.supabase
      .getClient()
      .from('orders')
      .select(`
        *,
        cbb_contacts!cbb_contact_uuid (
          cbb_id,
          phone,
          name_hebrew,
          notifications_enabled
        )
      `)
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      throw new Error(`Failed to get order for notification: ${error?.message}`);
    }

    const cbbContact = order.cbb_contacts;
    if (!cbbContact || !cbbContact.notifications_enabled) {
      this.logger.debug(`Skipping notification for ${orderId} - CBB notifications disabled`);
      return;
    }

    // For now, only send if there's exactly 1 application
    if (visaDetails.applications.length !== 1) {
      this.logger.log(
        `Skipping visa notification for ${orderId} - has ${visaDetails.applications.length} applications (only single application supported)`,
      );
      return;
    }

    const application = visaDetails.applications[0];
    const country = application.country || this.extractCountryFromOrder(order);

    // Queue WhatsApp message using the correct job data structure
    await this.whatsappQueue.add(
      'send-visa-approval',
      {
        orderId,
        contactId: cbbContact.cbb_id, // Use contactId as primary field
        messageType: 'visa_approval' as const,
        cbbId: cbbContact.cbb_id,
        phone: cbbContact.phone,
        templateName: 'visa_approval_file_phone',
        templateParams: [
          cbbContact.name_hebrew || order.first_name,
          country || 'המדינה המבוקשת',
        ],
        documentUrl: application.visaUrl,
        visaDetails,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Queued visa approval notification for order ${orderId}`);
  }

  /**
   * Extract country from order data
   */
  private extractCountryFromOrder(order: any): string | null {
    // Try different fields that might contain country
    if (order.destination_country) return order.destination_country;
    if (order.country) return order.country;
    if (order.visa_type?.includes('UK')) return 'בריטניה';
    if (order.visa_type?.includes('US')) return 'ארצות הברית';
    if (order.visa_type?.includes('Morocco')) return 'מרוקו';
    return null;
  }
}