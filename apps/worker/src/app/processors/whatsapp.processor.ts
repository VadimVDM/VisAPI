import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  WhatsAppJobData,
  WhatsAppJobResult,
  MessageResponse,
} from '@visapi/shared-types';
import {
  CbbClientService,
  ContactResolverService,
  TemplateService,
  CbbApiError,
  ContactNotFoundError,
} from '@visapi/backend-core-cbb';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type TemplateVariables = Record<string, JsonValue>;
type WhatsAppProcessorJobData = Omit<WhatsAppJobData, 'variables'> & {
  variables?: TemplateVariables;
};

@Injectable()
export class WhatsAppProcessor {
  private readonly logger = new Logger(WhatsAppProcessor.name);

  constructor(
    private readonly cbbClient: CbbClientService,
    private readonly contactResolver: ContactResolverService,
    private readonly templateService: TemplateService,
  ) {}

  async process(
    job: Job<WhatsAppProcessorJobData>,
  ): Promise<WhatsAppJobResult> {
    const { to, message, template, variables, fileUrl, fileType } = job.data;

    this.logger.log(`Processing WhatsApp message to: ${to}`);

    try {
      // Resolve phone number to CBB contact
      const contact = await this.contactResolver.resolveContact(to);
      this.logger.debug(`Resolved contact ID ${contact.id} for phone: ${to}`);

      let messageResponse: MessageResponse;

      // Send message based on type
      if (fileUrl && fileType) {
        messageResponse = await this.sendFileMessage(
          contact.id,
          fileUrl,
          fileType,
        );
      } else if (template) {
        messageResponse = await this.sendTemplateMessage(
          contact.id,
          template,
          variables,
        );
      } else if (message) {
        messageResponse = await this.sendTextMessage(contact.id, message);
      } else {
        throw new Error(
          'No message content provided (missing message, template, or fileUrl)',
        );
      }

      const messageId = messageResponse.message_id ?? `cbb_${Date.now()}`;
      const result: WhatsAppJobResult = {
        success: true,
        contactId: contact.id,
        messageId,
        to,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(
        `WhatsApp message sent successfully to ${to} (contact ${contact.id})`,
      );
      return result;
    } catch (error: unknown) {
      const errorMessage = this.toErrorMessage(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send WhatsApp message to ${to}: ${errorMessage}`,
        errorStack,
      );

      const result: WhatsAppJobResult = {
        success: false,
        contactId: 0,
        to,
        timestamp: new Date().toISOString(),
        error: this.formatErrorMessage(error),
      };

      // Re-throw error to trigger job retry unless it's a permanent failure
      if (this.isPermanentFailure(error)) {
        this.logger.warn(
          `Permanent failure for WhatsApp message to ${to}, not retrying`,
        );
        return result;
      }

      throw error;
    }
  }

  /**
   * Send text message to contact
   */
  private async sendTextMessage(
    contactId: number,
    text: string,
  ): Promise<MessageResponse> {
    this.logger.debug(
      `Sending text message to contact ${contactId}: ${text.substring(0, 50)}...`,
    );
    return this.cbbClient.sendTextMessage(contactId, text);
  }

  /**
   * Send template/flow message to contact
   */
  private async sendTemplateMessage(
    contactId: number,
    templateName: string,
    variables?: TemplateVariables,
  ): Promise<MessageResponse> {
    if (variables) {
      this.logger.debug(
        `Sending template "${templateName}" to contact ${contactId}`,
        variables,
      );
    } else {
      this.logger.debug(
        `Sending template "${templateName}" to contact ${contactId} with no variables`,
      );
    }

    try {
      // Get flow ID for template
      const flowId = await this.templateService.getTemplateFlowId(templateName);

      // Process variables if needed (for future template customization)
      if (variables) {
        await this.templateService.processTemplateVariables(
          templateName,
          variables,
        );
      }

      return this.cbbClient.sendFlow(contactId, flowId);
    } catch (error: unknown) {
      const message = this.toErrorMessage(error);
      if (message.toLowerCase().includes('not found')) {
        // Template not found, fall back to text message if variables include a fallback
        const fallbackMessage = this.extractFallbackMessage(variables);
        if (fallbackMessage) {
          this.logger.warn(
            `Template "${templateName}" not found, using fallback message`,
          );
          return this.sendTextMessage(contactId, fallbackMessage);
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
    fileType: 'image' | 'document' | 'video' | 'audio',
  ): Promise<MessageResponse> {
    this.logger.debug(
      `Sending ${fileType} file to contact ${contactId}: ${fileUrl}`,
    );
    return this.cbbClient.sendFileMessage(contactId, fileUrl, fileType);
  }

  /**
   * Format error message for job result
   */
  private formatErrorMessage(error: unknown): string {
    if (error instanceof CbbApiError) {
      return `CBB API Error (${error.statusCode}): ${error.message}`;
    }

    if (error instanceof ContactNotFoundError) {
      return `Contact resolution failed: ${error.message}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown WhatsApp processing error';
  }

  /**
   * Determine if error is permanent and should not be retried
   */
  private isPermanentFailure(error: unknown): boolean {
    // Don't retry client errors (400-499) or contact resolution failures
    if (
      error instanceof CbbApiError &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      return true;
    }

    // Don't retry invalid phone numbers or malformed requests
    if (error instanceof ContactNotFoundError) {
      return false; // Allow retry - contact creation might succeed later
    }

    // Specific error patterns that indicate permanent failures
    const permanentErrorPatterns = [
      'invalid phone number',
      'malformed request',
      'unauthorized',
      'forbidden',
      'template not found',
    ];

    const errorMessage = this.toErrorMessage(error).toLowerCase();
    return permanentErrorPatterns.some((pattern) =>
      errorMessage.includes(pattern),
    );
  }

  private extractFallbackMessage(variables?: TemplateVariables): string | null {
    if (!variables) {
      return null;
    }

    const fallbackCandidate =
      variables['fallback_message'] ?? variables['message'] ?? null;

    return typeof fallbackCandidate === 'string' ? fallbackCandidate : null;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown WhatsApp processing error';
    }
  }
}
