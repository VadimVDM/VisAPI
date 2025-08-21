import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WhatsAppJobData, WhatsAppJobResult } from '@visapi/shared-types';
import { 
  CbbClientService, 
  ContactResolverService, 
  TemplateService,
  CbbApiError,
  ContactNotFoundError 
} from '@visapi/backend-core-cbb';

@Injectable()
export class WhatsAppProcessor {
  private readonly logger = new Logger(WhatsAppProcessor.name);

  constructor(
    private readonly cbbClient: CbbClientService,
    private readonly contactResolver: ContactResolverService,
    private readonly templateService: TemplateService
  ) {}

  async process(job: Job<WhatsAppJobData>): Promise<WhatsAppJobResult> {
    const { to, message, template, variables, fileUrl, fileType } = job.data;

    this.logger.log(`Processing WhatsApp message to: ${to}`);

    try {
      // Resolve phone number to CBB contact
      const contact = await this.contactResolver.resolveContact(to);
      this.logger.debug(`Resolved contact ID ${contact.id} for phone: ${to}`);

      let messageResponse;

      // Send message based on type
      if (fileUrl && fileType) {
        messageResponse = await this.sendFileMessage(contact.id, fileUrl, fileType);
      } else if (template) {
        messageResponse = await this.sendTemplateMessage(contact.id, template, variables);
      } else if (message) {
        messageResponse = await this.sendTextMessage(contact.id, message);
      } else {
        throw new Error('No message content provided (missing message, template, or fileUrl)');
      }

      const result: WhatsAppJobResult = {
        success: true,
        contactId: contact.id,
        messageId: messageResponse.message_id || `cbb_${Date.now()}`,
        to,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(`WhatsApp message sent successfully to ${to} (contact ${contact.id})`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message to ${to}:`, error);

      const result: WhatsAppJobResult = {
        success: false,
        contactId: 0,
        to,
        timestamp: new Date().toISOString(),
        error: this.formatErrorMessage(error),
      };

      // Re-throw error to trigger job retry unless it's a permanent failure
      if (this.isPermanentFailure(error)) {
        this.logger.warn(`Permanent failure for WhatsApp message to ${to}, not retrying`);
        return result;
      }

      throw error;
    }
  }

  /**
   * Send text message to contact
   */
  private async sendTextMessage(contactId: number, text: string) {
    this.logger.debug(`Sending text message to contact ${contactId}: ${text.substring(0, 50)}...`);
    return await this.cbbClient.sendTextMessage(contactId, text);
  }

  /**
   * Send template/flow message to contact
   */
  private async sendTemplateMessage(
    contactId: number, 
    templateName: string, 
    variables?: Record<string, any>
  ) {
    this.logger.debug(`Sending template "${templateName}" to contact ${contactId}`, variables);

    try {
      // Get flow ID for template
      const flowId = await this.templateService.getTemplateFlowId(templateName);
      
      // Process variables if needed (for future template customization)
      if (variables) {
        await this.templateService.processTemplateVariables(templateName, variables);
      }

      return await this.cbbClient.sendFlow(contactId, flowId);
    } catch (error) {
      if (error.message.includes('not found')) {
        // Template not found, fall back to text message if variables include a fallback
        const fallbackMessage = variables?.fallback_message || variables?.message;
        if (fallbackMessage) {
          this.logger.warn(`Template "${templateName}" not found, using fallback message`);
          return await this.sendTextMessage(contactId, fallbackMessage);
        }
      }
      throw error;
    }
  }

  /**
   * Send file/media message to contact
   */
  private async sendFileMessage(
    contactId: number, 
    fileUrl: string, 
    fileType: 'image' | 'document' | 'video' | 'audio'
  ) {
    this.logger.debug(`Sending ${fileType} file to contact ${contactId}: ${fileUrl}`);
    return await this.cbbClient.sendFileMessage(contactId, fileUrl, fileType);
  }

  /**
   * Format error message for job result
   */
  private formatErrorMessage(error: any): string {
    if (error instanceof CbbApiError) {
      return `CBB API Error (${error.statusCode}): ${error.message}`;
    }
    
    if (error instanceof ContactNotFoundError) {
      return `Contact resolution failed: ${error.message}`;
    }

    return error.message || 'Unknown WhatsApp processing error';
  }

  /**
   * Determine if error is permanent and should not be retried
   */
  private isPermanentFailure(error: any): boolean {
    // Don't retry client errors (400-499) or contact resolution failures
    if (error instanceof CbbApiError && error.statusCode >= 400 && error.statusCode < 500) {
      return true;
    }

    // Don't retry invalid phone numbers or malformed requests
    if (error instanceof ContactNotFoundError) {
      return false; // Actually, we should retry these as contact creation might succeed later
    }

    // Specific error patterns that indicate permanent failures
    const permanentErrorPatterns = [
      'invalid phone number',
      'malformed request',
      'unauthorized',
      'forbidden',
      'template not found',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return permanentErrorPatterns.some(pattern => errorMessage.includes(pattern));
  }
}