import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { ConfigService } from '@visapi/core-config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@visapi/shared-types';
import {
  CompletedRecord,
  ExpandedApplication,
  VisaApplication,
  VisaDetails,
} from '../types/airtable.types';

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
        this.logger.error(
          `Failed to process record ${record.id}:`,
          error instanceof Error ? error.message : String(error),
        );
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
  private buildVisaDetails(applications: ExpandedApplication[]): VisaDetails {
    const visaApplications: VisaApplication[] = [];

    for (const app of applications) {
      const visaId = app.fields['Visa ID'];
      const visaUrl = app.fields['Visa URL'];
      const applicationId = app.fields['Application ID'];

      if (visaId && visaUrl && applicationId) {
        // Try to get applicant name from various fields
        const applicantName = app.fields['Applicant Name'] ||
                             app.fields['First Name'] ||
                             app.fields['Last Name'] ||
                             `Applicant ${visaApplications.length + 1}`;

        visaApplications.push({
          applicationId,
          visaId,
          visaUrl,
          applicantName,
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
    const { error } = await this.supabase
      .client
      .from('orders')
      .update({
        visa_details: visaDetails as any,
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
      .client
      .from('orders')
      .select('visa_notification_sent, cbb_contact_uuid')
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      this.logger.error(
        `Failed to check notification status for ${orderId}:`,
        error?.message || 'Order not found',
      );
      return false;
    }

    // Check conditions:
    // 1. Notification not already sent
    // 2. Has CBB contact synced
    return (
      !order.visa_notification_sent &&
      order.cbb_contact_uuid !== null
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
      .client
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

    const cbbContact = (order as any)?.cbb_contacts;
    if (!cbbContact || !cbbContact.notifications_enabled) {
      this.logger.debug(`Skipping notification for ${orderId} - CBB notifications disabled`);
      return;
    }

    // Support up to 10 applications
    const maxApplications = Math.min(visaDetails.applications.length, 10);

    this.logger.log(
      `Queueing ${maxApplications} visa notifications for order ${orderId}`,
    );

    // Queue messages for each application
    for (let i = 0; i < maxApplications; i++) {
      const application = visaDetails.applications[i];
      const country = application.country || this.extractCountryFromOrder(order as Record<string, unknown>);
      const isFirstMessage = i === 0;

      // Determine template and params based on message index
      let templateName: string;
      let templateParams: string[];

      if (isFirstMessage) {
        // First message uses the original template
        templateName = 'visa_approval_file_phone';
        templateParams = [
          cbbContact?.name_hebrew || (order as any)?.first_name || 'לקוח יקר',
          country || 'המדינה המבוקשת',
        ];
      } else {
        // Subsequent messages use the multi template
        // NOTE: Template must be approved in WhatsApp Business
        // Format: "קובץ הויזה של {{1}} מצורף בחלקה העליון של הודעה זו 📎"
        templateName = 'visa_approval_file_multi_he';
        templateParams = [
          // this.getNumberEmoji(i + 1), // Application number emoji (1-based) - commented out for now
          application.applicantName || `Applicant ${i + 1}`,
        ];
      }

      // Queue WhatsApp message with appropriate delay
      const delayMs = isFirstMessage ? 0 : i * 5000; // 5 seconds between messages

      await this.whatsappQueue.add(
        'send-visa-approval',
        {
          orderId,
          contactId: cbbContact?.cbb_id,
          messageType: 'visa_approval' as const,
          cbbId: cbbContact?.cbb_id,
          phone: cbbContact?.phone,
          templateName,
          templateParams,
          documentUrl: application.visaUrl,
          visaDetails,
          applicationIndex: i, // Track which application this is
          totalApplications: maxApplications,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          delay: delayMs, // Add delay for subsequent messages
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.debug(
        `Queued visa notification ${i + 1}/${maxApplications} for ${orderId} with ${delayMs}ms delay`,
      );
    }

    this.logger.log(
      `Queued ${maxApplications} visa approval notifications for order ${orderId}`,
    );
  }

  /**
   * Get number emoji for application index
   */
  private getNumberEmoji(num: number): string {
    const numberEmojis = [
      '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣',
      '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟',
    ];
    return numberEmojis[num - 1] || `${num}.`;
  }

  /**
   * Extract country from order data
   */
  private extractCountryFromOrder(order: Record<string, unknown>): string | null {
    // Try different fields that might contain country
    if (typeof order.destination_country === 'string') return order.destination_country;
    if (typeof order.country === 'string') return order.country;
    if (typeof order.visa_type === 'string') {
      if (order.visa_type.includes('UK')) return 'בריטניה';
      if (order.visa_type.includes('US')) return 'ארצות הברית';
      if (order.visa_type.includes('Morocco')) return 'מרוקו';
    }
    return null;
  }
}