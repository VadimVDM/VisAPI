import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { AirtableLookupService } from '../../../airtable/airtable.service';
import { AirtableLookupStatus } from '../../../airtable/dto/airtable-lookup-response.dto';
import { CbbClientService } from '@visapi/backend-core-cbb';
import { IssuesMessageBuilderService } from './issues-message-builder.service';
import {
  ApplicantIssuesWebhookDto,
  ApplicantIssuesResponseDto,
} from '../dto/applicant-issues.dto';
import { Tables, TablesInsert, Json } from '@visapi/shared-types';

/**
 * Service for handling applicant issues webhooks from Visanet
 * Processes issue reports and sends WhatsApp notifications via CBB
 */
@Injectable()
export class ApplicantIssuesService {
  private readonly logger = new Logger(ApplicantIssuesService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly airtableLookup: AirtableLookupService,
    private readonly cbbClient: CbbClientService,
    private readonly messageBuilder: IssuesMessageBuilderService,
  ) {}

  /**
   * Process applicant issues webhook
   * 1. Store in database
   * 2. Lookup applicant in Airtable
   * 3. Build WhatsApp message
   * 4. Send via CBB
   */
  async processApplicantIssues(
    dto: ApplicantIssuesWebhookDto,
    correlationId: string,
  ): Promise<ApplicantIssuesResponseDto> {
    const { applicantId, issues } = dto;

    this.logger.log(
      `[${correlationId}] Processing issues for applicant ${applicantId}`,
    );

    try {
      // Step 1: Create initial record in database
      const issueRecord = await this.createIssueRecord(dto, correlationId);
      this.logger.debug(
        `[${correlationId}] Created issue record: ${issueRecord.id}`,
      );

      // Step 2: Lookup applicant in Airtable by applicantId
      // Note: For now, we use the completed() endpoint which searches the completed view
      // TODO: Airtable may need a field mapping for applicantId
      this.logger.debug(
        `[${correlationId}] Looking up applicant ${applicantId} in Airtable completed view`,
      );

      const airtableResult = await this.airtableLookup.completed(
        'orderId', // For now, we'll need the user to provide orderId instead of applicantId
        applicantId, // This should be the order ID, not applicant ID
        { correlationId },
      );

      if (
        airtableResult.status !== AirtableLookupStatus.FOUND ||
        !airtableResult.record
      ) {
        this.logger.warn(
          `[${correlationId}] Applicant ${applicantId} not found in Airtable completed view`,
        );

        // Update record as failed
        await this.updateIssueRecord(issueRecord.id, {
          status: 'failed',
          error_message: 'Applicant not found in Airtable',
          error_code: 'APPLICANT_NOT_FOUND',
        });

        return {
          success: false,
          message: `Applicant ${applicantId} not found in Airtable`,
          issueRecordId: issueRecord.id,
        };
      }

      // Extract applicant data from Airtable
      const record = airtableResult.record as unknown as Record<
        string,
        unknown
      >;
      const applicantName = this.extractApplicantName(record);
      const applicantPhone = this.extractApplicantPhone(record);
      const applicantEmail = this.extractApplicantEmail(record);
      const fields = record.fields as Record<string, unknown>;
      const orderId = fields['ID'] as string;

      this.logger.log(
        `[${correlationId}] Found applicant: ${applicantName}, phone: ${applicantPhone}, order: ${orderId}`,
      );

      // Update record with lookup data
      await this.updateIssueRecord(issueRecord.id, {
        applicant_name: applicantName,
        applicant_phone: applicantPhone,
        applicant_email: applicantEmail,
        order_id: orderId,
        status: 'lookup_completed',
        applicant_metadata: fields as Json,
      });

      // Step 3: Extract country name from Airtable record
      // Look for country in various possible fields
      const countryName = this.extractCountryName(record);

      // Step 4: Build WhatsApp template variables
      const templateVariables = this.messageBuilder.buildTemplateVariables(
        applicantName || 'לקוח יקר',
        countryName || 'היעד', // Fallback to "destination" if no country found
        issues,
      );

      this.logger.debug(
        `[${correlationId}] Built WhatsApp template variables for ${templateVariables.categoryHeader}`,
      );

      // Step 5: Send WhatsApp message via CBB using template
      if (!applicantPhone) {
        this.logger.warn(
          `[${correlationId}] No phone number found for applicant ${applicantId}`,
        );

        await this.updateIssueRecord(issueRecord.id, {
          status: 'failed',
          error_message: 'No phone number found for applicant',
          error_code: 'NO_PHONE_NUMBER',
        });

        return {
          success: false,
          message: 'No phone number found for applicant',
          issueRecordId: issueRecord.id,
        };
      }

      // Normalize phone: remove leading + if present
      const normalizedPhone = applicantPhone.replace(/^\+/, '');

      // Build correlation data for message ID tracking
      const whatsappCorrelationId = `${orderId}:${normalizedPhone}:applicant_issues:${Date.now()}`;

      this.logger.debug(
        `[${correlationId}] Sending WhatsApp to ${normalizedPhone}`,
      );

      // Get template name
      const templateName = this.messageBuilder.getTemplateName();

      // Send via WhatsApp template
      const whatsappResponse = await this.cbbClient.sendWhatsAppTemplate(
        normalizedPhone,
        templateName,
        'he', // Hebrew
        [
          templateVariables.applicantName,
          templateVariables.countryName,
          templateVariables.categoryHeader,
          templateVariables.issuesList,
        ],
        whatsappCorrelationId,
      );

      this.logger.log(
        `[${correlationId}] WhatsApp message sent successfully to ${normalizedPhone}`,
      );

      // Extract message ID from response (CBB API response structure)
      const messageId = whatsappResponse?.message_id?.toString();

      // Update record with WhatsApp delivery info
      await this.updateIssueRecord(issueRecord.id, {
        whatsapp_notification_sent: true,
        whatsapp_notification_sent_at: new Date().toISOString(),
        whatsapp_contact_id: normalizedPhone,
        whatsapp_correlation_id: whatsappCorrelationId,
        whatsapp_message_id: messageId,
        whatsapp_template_used: templateName,
        status: 'notification_sent',
        processed_at: new Date().toISOString(),
      });

      const totalIssues = this.messageBuilder.countTotalIssues(issues);

      return {
        success: true,
        message: 'Issues received and WhatsApp notification sent',
        issueRecordId: issueRecord.id,
        details: {
          applicantId,
          applicantName: applicantName || undefined,
          orderId,
          totalIssues,
          whatsappSent: true,
        },
      };
    } catch (error) {
      this.logger.error(
        `[${correlationId}] Failed to process applicant issues for ${applicantId}:`,
        error,
      );

      return {
        success: false,
        message: `Failed to process applicant issues: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Create issue record in database
   */
  private async createIssueRecord(
    dto: ApplicantIssuesWebhookDto,
    correlationId: string,
  ): Promise<Tables<'applicant_issues'>> {
    const record: TablesInsert<'applicant_issues'> = {
      applicant_id: dto.applicantId,
      issues: dto.issues as unknown as Json, // Store as JSONB
      status: 'received',
      metadata: {
        correlation_id: correlationId,
        received_at: new Date().toISOString(),
      } as Json,
    };

    const { data, error } = await this.supabase.serviceClient
      .from('applicant_issues')
      .insert(record)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create issue record:`, error);
      throw new Error(`Failed to create issue record: ${error.message}`);
    }

    return data;
  }

  /**
   * Update issue record in database
   */
  private async updateIssueRecord(
    id: string,
    updates: Partial<Tables<'applicant_issues'>>,
  ): Promise<void> {
    const { error } = await this.supabase.serviceClient
      .from('applicant_issues')
      .update(updates)
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to update issue record ${id}:`, error);
      throw new Error(`Failed to update issue record: ${error.message}`);
    }
  }

  /**
   * Extract applicant name from Airtable record
   */
  private extractApplicantName(record: Record<string, unknown>): string | null {
    // Try different possible field names
    const possibleNames = [
      'Name',
      'Full Name',
      'Applicant Name',
      'First Name',
      'name',
    ];

    const fields = record.fields as Record<string, unknown>;

    for (const fieldName of possibleNames) {
      const value = fields[fieldName];
      if (value && typeof value === 'string') {
        return value;
      }
    }

    // Try to construct from First + Last name
    const firstName = fields['First Name'] || fields['first_name'];
    const lastName = fields['Last Name'] || fields['last_name'];

    if (
      firstName &&
      typeof firstName === 'string' &&
      lastName &&
      typeof lastName === 'string'
    ) {
      return `${firstName} ${lastName}`.trim();
    }

    if (firstName && typeof firstName === 'string') {
      return firstName;
    }

    return null;
  }

  /**
   * Extract applicant phone from Airtable record
   */
  private extractApplicantPhone(
    record: Record<string, unknown>,
  ): string | null {
    // Try different possible field names
    const possiblePhones = [
      'Phone',
      'Phone Number',
      'Mobile',
      'Cell Phone',
      'phone',
      'mobile',
    ];

    const fields = record.fields as Record<string, unknown>;

    for (const fieldName of possiblePhones) {
      const value = fields[fieldName];
      if (value && typeof value === 'string') {
        return value;
      }
    }

    return null;
  }

  /**
   * Extract applicant email from Airtable record
   */
  private extractApplicantEmail(
    record: Record<string, unknown>,
  ): string | null {
    // Try different possible field names
    const possibleEmails = ['Email', 'Email Address', 'email', 'E-mail'];

    const fields = record.fields as Record<string, unknown>;

    for (const fieldName of possibleEmails) {
      const value = fields[fieldName];
      if (value && typeof value === 'string') {
        return value;
      }
    }

    return null;
  }

  /**
   * Extract destination country name from Airtable record
   */
  private extractCountryName(record: Record<string, unknown>): string | null {
    // Try different possible field names for country
    const possibleCountries = [
      'Country',
      'Destination Country',
      'Visa Country',
      'country',
      'destination',
    ];

    const fields = record.fields as Record<string, unknown>;

    for (const fieldName of possibleCountries) {
      const value = fields[fieldName];
      if (value && typeof value === 'string') {
        return value;
      }
    }

    return null;
  }
}
