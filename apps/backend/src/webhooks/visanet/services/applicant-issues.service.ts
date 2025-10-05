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
   * 2. Check if custom phone override provided
   * 3. Try local DB lookup first (orders.applicants_data)
   * 4. Fallback to Airtable if not found in DB
   * 5. Build WhatsApp message
   * 6. Send via CBB
   */
  async processApplicantIssues(
    dto: ApplicantIssuesWebhookDto,
    correlationId: string,
  ): Promise<ApplicantIssuesResponseDto> {
    const { applicantId, issues, phone: customPhone } = dto;

    this.logger.log(
      `[${correlationId}] Processing issues for applicant ${applicantId}${customPhone ? ` with custom phone override` : ''}`,
    );

    try {
      // Step 1: Create initial record in database
      const issueRecord = await this.createIssueRecord(dto, correlationId);
      this.logger.debug(
        `[${correlationId}] Created issue record: ${issueRecord.id}`,
      );

      let applicantName: string | null = null;
      let applicantPhone: string | null = null;
      let applicantEmail: string | null = null;
      let orderId: string | null = null;
      let countryName: string | null = null;

      // Step 2: Determine phone number priority
      // Priority: custom phone > DB lookup > Airtable lookup
      if (customPhone) {
        this.logger.log(
          `[${correlationId}] Using custom phone override: ${customPhone}`,
        );
        applicantPhone = customPhone;

        // Still need to get name and country, try DB first
        const dbResult = await this.lookupOrderByApplicantId(
          applicantId,
          correlationId,
        );
        if (dbResult.found) {
          applicantName = dbResult.clientName || null;
          orderId = dbResult.orderId || null;
          countryName = dbResult.productCountry || null;
        }
      } else {
        // Step 3: Try local database lookup first
        const dbResult = await this.lookupOrderByApplicantId(
          applicantId,
          correlationId,
        );

        if (dbResult.found) {
          // Found in local DB - use this data
          this.logger.log(
            `[${correlationId}] Using data from local database for order ${dbResult.orderId}`,
          );
          applicantPhone = dbResult.clientPhone || null;
          applicantName = dbResult.clientName || null;
          orderId = dbResult.orderId || null;
          countryName = dbResult.productCountry || null;

          // Update record with DB data
          await this.updateIssueRecord(issueRecord.id, {
            applicant_name: applicantName,
            applicant_phone: applicantPhone,
            order_id: orderId,
            status: 'lookup_completed',
            applicant_metadata: {
              source: 'database',
              product_country: countryName,
            } as Json,
          });
        }
      }

      // Step 4: Fallback to Airtable if no phone found yet
      if (!applicantPhone) {
        this.logger.debug(
          `[${correlationId}] No phone found in DB, falling back to Airtable lookup`,
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
            `[${correlationId}] Applicant ${applicantId} not found in Airtable`,
          );

          // Update record as failed
          await this.updateIssueRecord(issueRecord.id, {
            status: 'failed',
            error_message: 'Applicant not found in database or Airtable',
            error_code: 'APPLICANT_NOT_FOUND',
          });

          return {
            success: false,
            message: `Applicant ${applicantId} not found in database or Airtable`,
            issueRecordId: issueRecord.id,
          };
        }

        // Extract applicant data from Airtable
        const record = airtableResult.record as unknown as Record<
          string,
          unknown
        >;
        applicantName = this.extractApplicantName(record);
        applicantPhone = this.extractApplicantPhone(record);
        applicantEmail = this.extractApplicantEmail(record);
        const fields = record.fields as Record<string, unknown>;
        orderId = fields['ID'] as string;
        countryName = this.extractCountryName(record);

        this.logger.log(
          `[${correlationId}] Found applicant in Airtable: ${applicantName}, phone: ${applicantPhone}, order: ${orderId}`,
        );

        // Update record with Airtable data
        await this.updateIssueRecord(issueRecord.id, {
          applicant_name: applicantName,
          applicant_phone: applicantPhone,
          applicant_email: applicantEmail,
          order_id: orderId,
          status: 'lookup_completed',
          applicant_metadata: {
            source: 'airtable',
            ...fields,
          } as Json,
        });
      }

      // Step 5: Build WhatsApp template variables
      const templateVariables = this.messageBuilder.buildTemplateVariables(
        applicantName || 'לקוח יקר',
        countryName || 'היעד', // Fallback to "destination" if no country found
        issues,
      );

      this.logger.debug(
        `[${correlationId}] Built WhatsApp template variables for ${templateVariables.categoryHeader}`,
      );

      // Step 6: Send WhatsApp message via CBB using template
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
          orderId: orderId || undefined,
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

  /**
   * Lookup order by applicant ID in local database
   * Searches orders.applicants_data JSONB column for matching applicant ID
   */
  private async lookupOrderByApplicantId(
    applicantId: string,
    correlationId: string,
  ): Promise<{
    found: boolean;
    orderId?: string;
    clientPhone?: string;
    clientName?: string;
    productCountry?: string;
  }> {
    this.logger.debug(
      `[${correlationId}] Searching orders table for applicant ID: ${applicantId}`,
    );

    // Query orders table where applicants_data JSONB contains the applicant ID
    const { data, error } = await this.supabase.serviceClient
      .from('orders')
      .select('order_id, client_phone, client_name, product_country')
      .contains('applicants_data', [{ id: applicantId }])
      .limit(1)
      .single();

    if (error) {
      // Not found is expected, other errors should be logged
      if (error.code !== 'PGRST116') {
        this.logger.error(
          `[${correlationId}] Error searching orders for applicant ${applicantId}:`,
          error,
        );
      }
      return { found: false };
    }

    if (!data) {
      this.logger.debug(
        `[${correlationId}] No order found for applicant ${applicantId} in local database`,
      );
      return { found: false };
    }

    this.logger.log(
      `[${correlationId}] Found order ${data.order_id} for applicant ${applicantId} in local database`,
    );

    return {
      found: true,
      orderId: data.order_id,
      clientPhone: data.client_phone,
      clientName: data.client_name,
      productCountry: data.product_country,
    };
  }
}
