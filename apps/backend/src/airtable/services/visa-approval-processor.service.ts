import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { ConfigService } from '@visapi/core-config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES, Json } from '@visapi/shared-types';
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
   * @param records Array of completed records from Airtable
   * @param force If true, bypasses idempotency checks (for manual resends)
   */
  async processCompletedRecords(records: CompletedRecord[], force = false): Promise<void> {
    this.logger.log(`Processing ${records.length} completed records for visa approvals (force=${force})`);

    const errors: Array<{ recordId: string; error: string }> = [];

    for (const record of records) {
      try {
        await this.processRecord(record, force);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to process record ${record.id}:`,
          errorMsg,
        );
        errors.push({ recordId: record.id, error: errorMsg });
      }
    }

    // If any errors occurred, throw them so the caller knows
    if (errors.length > 0) {
      throw new Error(`Failed to process ${errors.length} record(s): ${JSON.stringify(errors)}`);
    }
  }

  /**
   * Process a single completed record
   * @param force If true, bypasses automated checks and forces resend
   */
  private async processRecord(record: CompletedRecord, force = false): Promise<void> {
    const orderId = record.fields.ID;
    if (!orderId) {
      this.logger.debug(`Skipping record ${record.id} - no order ID`);
      return;
    }

    this.logger.log(`Processing record for order ${orderId}`);

    // Check if we have expanded application data
    const applications = record.expanded?.Applications_expanded;
    if (!applications || applications.length === 0) {
      this.logger.warn(`No applications found for order ${orderId} - expanded data: ${JSON.stringify(record.expanded)}`);
      return;
    }

    this.logger.log(`Found ${applications.length} applications for order ${orderId}`);

    // Build visa details from applications
    const visaDetails = this.buildVisaDetails(applications);
    if (visaDetails.applications.length === 0) {
      this.logger.debug(`No valid visa details found for order ${orderId}`);
      return;
    }

    // Update order with visa details
    await this.updateOrderWithVisaDetails(orderId, visaDetails);

    // Check if we should send notification (skip check if forced)
    const shouldNotify = force || await this.shouldSendNotification(orderId);
    this.logger.log(`Should send notification for ${orderId}: ${shouldNotify} (force=${force})`);

    if (shouldNotify) {
      this.logger.log(`Queueing visa notifications for ${orderId} (force=${force})`);
      try {
        await this.queueVisaNotification(orderId, visaDetails, force);
        this.logger.log(`Successfully queued visa notifications for ${orderId}`);
      } catch (error) {
        this.logger.error(`Failed to queue visa notifications for ${orderId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Build visa details from expanded applications
   */
  private buildVisaDetails(applications: ExpandedApplication[]): VisaDetails {
    const visaApplications: VisaApplication[] = [];

    this.logger.debug(`Building visa details from ${applications.length} applications`);

    for (const app of applications) {
      // ID field contains the application/visa ID (e.g., 27H8Q49T88908986)
      const visaId = app.fields['ID'];
      const visaUrl = app.fields['Visa URL'];
      // Use the same ID for both visa ID and application ID
      const applicationId = app.fields['ID'] || app.fields['Application ID'];

      this.logger.debug(`Application fields:`, {
        hasVisaId: !!visaId,
        hasVisaUrl: !!visaUrl,
        hasApplicationId: !!applicationId,
        visaId,
        applicationId,
      });

      if (visaId && visaUrl && applicationId) {
        // Extract first and last names from arrays
        const firstNameField = app.fields['First name'];
        const firstName = Array.isArray(firstNameField)
          ? firstNameField[0]?.trim()
          : typeof firstNameField === 'string'
            ? firstNameField
            : app.fields['First Name'];

        const surnameField = app.fields['Surname'];
        const lastName = Array.isArray(surnameField)
          ? surnameField[0]?.trim()
          : typeof surnameField === 'string'
            ? surnameField
            : app.fields['Last Name'];

        // Build full applicant name
        const orderNameField = app.fields['Order Name'];
        const applicantName = (firstName && lastName)
          ? `${firstName} ${lastName}`
          : app.fields['Applicant Name'] ||
            (Array.isArray(orderNameField) ? orderNameField[0] : undefined) ||
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
      .serviceClient
      .from('orders')
      .update({
        visa_details: visaDetails as unknown as Json,
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
      .serviceClient
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
   * @param force If true, bypasses idempotency checks in processor (for manual resends)
   */
  private async queueVisaNotification(
    orderId: string,
    visaDetails: VisaDetails,
    force = false,
  ): Promise<void> {
    this.logger.log(`Starting queueVisaNotification for ${orderId} with ${visaDetails.applications.length} applications (force=${force})`);

    // Get order and CBB contact details
    const { data: order, error } = await this.supabase
      .serviceClient
      .from('orders')
      .select(`
        *,
        cbb_contacts:cbb_contact_uuid (
          cbb_contact_id,
          client_phone,
          client_name,
          alerts_enabled
        )
      `)
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      throw new Error(`Failed to get order for notification: ${error?.message}`);
    }

    interface CbbContactType {
      cbb_contact_id: string;
      client_phone: string;
      client_name?: string;
      alerts_enabled?: boolean;
    }

    // Handle both single object and array response from Supabase
    const cbbContactsData = (order as Record<string, unknown>)?.cbb_contacts;

    this.logger.debug(`CBB contacts data for ${orderId}:`, JSON.stringify(cbbContactsData));

    const cbbContact = Array.isArray(cbbContactsData)
      ? cbbContactsData[0] as CbbContactType
      : cbbContactsData as CbbContactType | undefined;

    if (!cbbContact) {
      this.logger.warn(`No CBB contact found for order ${orderId}`);
      return;
    }

    if (!cbbContact.client_phone) {
      this.logger.error(`CBB contact for ${orderId} has no phone number:`, JSON.stringify(cbbContact));
      throw new Error(`CBB contact missing phone number for order ${orderId}`);
    }

    if (cbbContact.alerts_enabled === false) {
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
          cbbContact?.client_name || (order as Record<string, unknown>)?.first_name as string || 'לקוח יקר',
          country || 'המדינה המבוקשת',
        ] as string[];
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
        JOB_NAMES.SEND_WHATSAPP_VISA_APPROVAL,
        {
          orderId,
          contactId: cbbContact?.cbb_contact_id,
          messageType: 'visa_approval' as const,
          cbbId: cbbContact?.cbb_contact_id || '',
          phone: cbbContact?.client_phone || '',
          templateName,
          templateParams,
          documentUrl: application.visaUrl,
          visaDetails,
          applicationIndex: i, // Track which application this is
          totalApplications: maxApplications,
          force, // Flag to bypass idempotency checks for manual resends
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

    // NOTE: Do NOT mark order as notified here!
    // The WhatsAppMessageProcessor will update visa_notification_sent flag
    // in updateOrderWhatsAppStatus() after the message is actually sent to CBB.
    // Setting it here causes a race condition where the flag is true before sending completes.
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