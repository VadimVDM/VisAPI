import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CbbClientService } from '@visapi/backend-core-cbb';
import { CBBSyncMetricsService } from './cbb-sync-metrics.service';
import { CBBContact, CBBContactData } from '@visapi/shared-types';

export interface CbbContactSyncResult {
  contact: CBBContact | null;
  isNewContact: boolean;
  error?: string;
}

@Injectable()
export class CbbContactSyncService {
  constructor(
    @InjectPinoLogger(CbbContactSyncService.name)
    private readonly logger: PinoLogger,
    private readonly cbbService: CbbClientService,
    private readonly metricsService: CBBSyncMetricsService,
  ) {}

  async createOrUpdateContact(
    phoneNumber: string,
    contactData: CBBContactData,
    orderId: string,
  ): Promise<CbbContactSyncResult> {
    try {
      return await this.upsertContact(phoneNumber, contactData, orderId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to create/update contact for order ${orderId}: ${errorMessage}`,
        error,
      );

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
        this.logger.error(
          `Could not fetch contact ${phoneNumber} after failure:`,
          fetchError,
        );
      }

      return {
        contact: null,
        isNewContact: false,
        error: errorMessage,
      };
    }
  }

  private async upsertContact(
    phoneNumber: string,
    contactData: CBBContactData,
    orderId: string,
  ): Promise<CbbContactSyncResult> {
    let contact = await this.cbbService.getContactById(phoneNumber);
    this.metricsService.recordContactOperation(
      'fetch',
      contact ? 'success' : 'failed',
    );

    if (contact) {
      this.logger.warn(
        `Contact ${phoneNumber} exists. CBB API only allows updating custom fields.`,
      );

      if (
        contact.name !== contactData.name ||
        contact.email !== contactData.email
      ) {
        this.logger.warn(
          `Cannot update basic fields for existing contact ${phoneNumber}. ` +
            `Current: name="${contact.name}", email="${contact.email}". ` +
            `New: name="${contactData.name}", email="${contactData.email}"`,
        );
      }

      try {
        contact = await this.cbbService.updateContactComplete(contactData);
        this.metricsService.recordContactOperation('update', 'success');
        this.logger.info(
          `Updated CBB contact custom fields for order ${orderId}`,
        );
      } catch (updateError) {
        this.metricsService.recordContactOperation('update', 'failed');
        throw updateError;
      }

      return { contact, isNewContact: false };
    }

    try {
      contact = await this.cbbService.createContactWithFields(contactData);
      this.metricsService.recordContactOperation('create', 'success');
      this.logger.info(`Created new CBB contact for order ${orderId}`);
    } catch (createError) {
      this.metricsService.recordContactOperation('create', 'failed');
      throw createError;
    }

    return { contact, isNewContact: true };
  }
}
