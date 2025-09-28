import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { AirtableLookupService } from '../../../airtable/airtable.service';
import { VisaApprovalProcessorService } from '../../../airtable/services/visa-approval-processor.service';
import { AirtableLookupStatus } from '../../../airtable/dto/airtable-lookup-response.dto';
import { VisaResendDto, VisaResendResultDto } from '../dto/visa-resend.dto';
import { CompletedRecord } from '../../../airtable/types/airtable.types';

interface AirtableApplication {
  id?: string;
  fields?: Record<string, unknown>;
  'Visa ID'?: string;
  'Visa URL'?: string;
  'Application ID'?: string;
  'Applicant Name'?: string;
  'First Name'?: string;
  'Last Name'?: string;
  Status?: string;
  Country?: string;
}

@Injectable()
export class ViziVisaResendService {
  private readonly logger = new Logger(ViziVisaResendService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly airtableLookup: AirtableLookupService,
    private readonly visaProcessor: VisaApprovalProcessorService,
  ) {}

  /**
   * Manually resend visa approval notifications for an order
   * 1. Lookup order in Airtable (regular table, not completed)
   * 2. Reset visa_notification_sent flag to false
   * 3. Process visa notifications using existing processor
   */
  async resendVisaApproval(
    dto: VisaResendDto,
    correlationId: string,
  ): Promise<VisaResendResultDto> {
    const { orderId } = dto;

    if (!orderId) {
      throw new BadRequestException('Order ID is required');
    }

    this.logger.log(`[${correlationId}] Starting visa approval resend for order ${orderId}`);

    try {
      // Step 1: Lookup order in Airtable with expansion
      this.logger.debug(`[${correlationId}] Looking up order ${orderId} in Airtable`);
      const airtableResult = await this.airtableLookup.lookup(
        'orderId',
        orderId,
        { correlationId },
      );

      if (airtableResult.status !== AirtableLookupStatus.FOUND || !airtableResult.record) {
        this.logger.warn(`[${correlationId}] Order ${orderId} not found in Airtable`);
        throw new NotFoundException(`Order ${orderId} not found in Airtable`);
      }

      // Check if we have expanded application data
      const applications = airtableResult.applications;
      if (!applications || applications.length === 0) {
        this.logger.warn(`[${correlationId}] No applications found for order ${orderId}`);
        return {
          success: false,
          orderId,
          message: 'No visa applications found for this order',
          details: {
            applicationsFound: 0,
            messagesSent: 0,
            visaNotificationReset: false,
            expandedData: false,
          },
        };
      }

      this.logger.log(
        `[${correlationId}] Found ${applications.length} applications for order ${orderId}`,
      );

      // Step 2: Reset visa_notification_sent flag in our database
      const { error: resetError } = await this.supabase.client
        .from('orders')
        .update({
          visa_notification_sent: false,
          visa_notification_sent_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);

      if (resetError) {
        this.logger.error(
          `[${correlationId}] Failed to reset visa notification flag for ${orderId}:`,
          resetError,
        );
        throw new Error(`Failed to reset visa notification status: ${resetError.message}`);
      }

      this.logger.debug(
        `[${correlationId}] Reset visa_notification_sent flag for order ${orderId}`,
      );

      // Step 3: Build the completed record format that the processor expects
      const completedRecord: CompletedRecord = {
        id: airtableResult.record.id,
        fields: {
          ...airtableResult.record.fields,
          ID: orderId,
        },
        createdTime: airtableResult.record.createdTime || new Date().toISOString(),
        expanded: {
          Applications_expanded: applications.map((app: unknown) => {
            const typedApp = app as AirtableApplication;

            // Helper to safely get string value
            const getString = (value: unknown): string | undefined => {
              if (typeof value === 'string') return value;
              if (value === null || value === undefined) return undefined;
              return String(value);
            };

            return {
              id: typedApp.id || `app-${Math.random()}`,
              fields: {
                'Visa ID': getString(typedApp.fields?.['Visa ID']) || getString(typedApp['Visa ID']),
                'Visa URL': getString(typedApp.fields?.['Visa URL']) || getString(typedApp['Visa URL']),
                'Application ID': getString(typedApp.fields?.['Application ID']) || getString(typedApp['Application ID']),
                'Applicant Name': getString(typedApp.fields?.['Applicant Name']) || getString(typedApp['Applicant Name']),
                'First Name': getString(typedApp.fields?.['First Name']) || getString(typedApp['First Name']),
                'Last Name': getString(typedApp.fields?.['Last Name']) || getString(typedApp['Last Name']),
                Status: getString(typedApp.fields?.['Status']) || getString(typedApp['Status']) || 'Approved',
                Country: getString(typedApp.fields?.['Country']) || getString(typedApp['Country']),
              },
            };
          }),
        },
      };

      // Step 4: Process the record using the existing visa processor
      this.logger.log(
        `[${correlationId}] Processing visa approvals for order ${orderId}`,
      );

      await this.visaProcessor.processCompletedRecords([completedRecord]);

      this.logger.log(
        `[${correlationId}] Successfully triggered visa resend for order ${orderId}`,
      );

      return {
        success: true,
        orderId,
        message: `Successfully triggered visa approval resend for order ${orderId}`,
        details: {
          applicationsFound: applications.length,
          messagesSent: Math.min(applications.length, 10), // Max 10 messages as per processor
          visaNotificationReset: true,
          expandedData: true,
        },
      };
    } catch (error) {
      // If it's already a known error type, re-throw it
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Otherwise, log and throw a generic error
      this.logger.error(
        `[${correlationId}] Failed to resend visa approval for ${orderId}:`,
        error,
      );

      return {
        success: false,
        orderId,
        message: `Failed to resend visa approval: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        details: {
          applicationsFound: 0,
          messagesSent: 0,
          visaNotificationReset: false,
          expandedData: false,
        },
      };
    }
  }
}