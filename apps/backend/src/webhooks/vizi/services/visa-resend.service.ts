import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { AirtableLookupService } from '../../../airtable/airtable.service';
import { VisaApprovalProcessorService } from '../../../airtable/services/visa-approval-processor.service';
import { AirtableLookupStatus } from '../../../airtable/dto/airtable-lookup-response.dto';
import { VisaResendDto, VisaResendResultDto } from '../dto/visa-resend.dto';
import {
  CompletedRecord,
  ExpandedApplication,
} from '../../../airtable/types/airtable.types';

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
    const { orderId, phone: rawPhone, applicationIds } = dto;

    if (!orderId) {
      throw new BadRequestException('Order ID is required');
    }

    // Normalize phone: remove + prefix if present (CBB uses phone without + as contact ID)
    const phone = rawPhone?.replace(/^\+/, '');

    // Log filtering mode
    if (applicationIds && applicationIds.length > 0) {
      this.logger.log(
        `[${correlationId}] Starting visa approval resend for order ${orderId} with filtering to ${applicationIds.length} specific application(s): ${applicationIds.join(', ')}${phone ? ` | override phone: ${phone}` : ''}`,
      );
    } else {
      this.logger.log(
        `[${correlationId}] Starting visa approval resend for order ${orderId} (no filtering - will resend ALL applications)${phone ? ` with override phone ${phone}` : ''}`,
      );
    }

    try {
      // Step 1: Lookup order in Airtable with expansion
      this.logger.debug(
        `[${correlationId}] Looking up order ${orderId} in Airtable`,
      );
      const airtableResult = await this.airtableLookup.lookup(
        'orderId', // This gets normalized to 'ID' field in Airtable
        orderId,
        { correlationId },
      );

      if (
        airtableResult.status !== AirtableLookupStatus.FOUND ||
        !airtableResult.record
      ) {
        this.logger.warn(
          `[${correlationId}] Order ${orderId} not found in Airtable`,
        );
        throw new NotFoundException(`Order ${orderId} not found in Airtable`);
      }

      // Check if we have expanded application data
      // Cast to ExpandedApplication[] to work with typed fields
      const applications = (airtableResult.applications ||
        []) as unknown as ExpandedApplication[];
      if (applications.length === 0) {
        this.logger.warn(
          `[${correlationId}] No applications found for order ${orderId}`,
        );
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
        `[${correlationId}] Found ${applications.length} total applications for order ${orderId}`,
      );

      // Filter applications if applicationIds provided
      let filteredApplications = applications;
      let skippedApplicationIds: string[] = [];

      if (applicationIds && applicationIds.length > 0) {
        const originalCount = applications.length;

        // Extract Application IDs from the applications
        const availableAppIds = applications.map(
          (app) => app.fields.ID || app.fields['Application ID'] || '',
        );

        // Validate that all requested Application IDs exist
        const invalidIds = applicationIds.filter(
          (id) => !availableAppIds.includes(id),
        );

        if (invalidIds.length > 0) {
          this.logger.warn(
            `[${correlationId}] Invalid Application IDs requested: ${invalidIds.join(', ')}`,
          );
          throw new BadRequestException(
            `Application ID(s) not found in order ${orderId}: ${invalidIds.join(', ')}. Available IDs: ${availableAppIds.join(', ')}`,
          );
        }

        // Filter to only requested applications
        filteredApplications = applications.filter((app) => {
          const appId = app.fields.ID || app.fields['Application ID'] || '';
          return applicationIds.includes(appId);
        });

        // Track skipped applications
        skippedApplicationIds = applications
          .filter((app) => {
            const appId = app.fields.ID || app.fields['Application ID'] || '';
            return !applicationIds.includes(appId);
          })
          .map(
            (app) => app.fields.ID || app.fields['Application ID'] || 'unknown',
          );

        this.logger.log(
          `[${correlationId}] Filtered ${originalCount} applications down to ${filteredApplications.length} matching requested IDs`,
        );

        if (skippedApplicationIds.length > 0) {
          this.logger.debug(
            `[${correlationId}] Skipped ${skippedApplicationIds.length} applications: ${skippedApplicationIds.join(', ')}`,
          );
        }

        // Validate we have at least one application after filtering
        if (filteredApplications.length === 0) {
          this.logger.warn(
            `[${correlationId}] No applications matched the provided Application IDs`,
          );
          return {
            success: false,
            orderId,
            message: 'No applications matched the provided Application IDs',
            details: {
              applicationsFound: originalCount,
              applicationsFiltered: 0,
              messagesSent: 0,
              filteredApplicationIds: [],
              skippedApplicationIds,
              visaNotificationReset: false,
              expandedData: true,
            },
          };
        }
      }

      // Step 2: Reset visa_notification_sent flag in our database
      const { error: resetError } = await this.supabase.serviceClient
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
        throw new Error(
          `Failed to reset visa notification status: ${resetError.message}`,
        );
      }

      this.logger.debug(
        `[${correlationId}] Reset visa_notification_sent flag for order ${orderId}`,
      );

      // Step 3: Build the completed record format that the processor expects
      // Use FILTERED applications (or all applications if no filtering)
      const completedRecord: CompletedRecord = {
        id: airtableResult.record.id,
        fields: {
          ...airtableResult.record.fields,
          ID: orderId,
        },
        createdTime:
          airtableResult.record.createdTime || new Date().toISOString(),
        expanded: {
          Applications_expanded: filteredApplications, // Use filtered applications
        },
      };

      // Step 4: Process the record using the existing visa processor
      // Pass force=true to bypass idempotency checks (this is a manual resend)
      // Pass phone to override recipient if provided
      this.logger.log(
        `[${correlationId}] Processing visa approvals for order ${orderId} (force=true for manual resend)`,
      );

      await this.visaProcessor.processCompletedRecords(
        [completedRecord],
        true,
        phone,
      );

      this.logger.log(
        `[${correlationId}] Successfully triggered visa resend for order ${orderId} (${filteredApplications.length} application(s))`,
      );

      return {
        success: true,
        orderId,
        message: applicationIds
          ? `Successfully triggered visa approval resend for ${filteredApplications.length} selected application(s) in order ${orderId}`
          : `Successfully triggered visa approval resend for order ${orderId}`,
        details: {
          applicationsFound: applications.length,
          applicationsFiltered: applicationIds
            ? filteredApplications.length
            : undefined,
          messagesSent: Math.min(filteredApplications.length, 10), // Max 10 messages as per processor
          filteredApplicationIds: applicationIds
            ? filteredApplications.map(
                (app) =>
                  app.fields.ID || app.fields['Application ID'] || 'unknown',
              )
            : undefined,
          skippedApplicationIds:
            skippedApplicationIds.length > 0
              ? skippedApplicationIds
              : undefined,
          visaNotificationReset: true,
          expandedData: true,
        },
      };
    } catch (error) {
      // If it's already a known error type, re-throw it
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
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
