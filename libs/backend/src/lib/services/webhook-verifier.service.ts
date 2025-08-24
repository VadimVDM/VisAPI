import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WebhookEvent, WebhookVerifyDto } from '../types/whatsapp.types';

@Injectable()
export class WebhookVerifierService {
  private readonly logger = new Logger(WebhookVerifierService.name);
  private readonly verifyToken: string;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.verifyToken = this.configService.get('WABA_VERIFY_TOKEN', 'Np2YWkYAmLA6UjQ2reZcD7TRP3scWdKdeALugqmc9U');
    // Use WABA_WEBHOOK_SECRET first, fallback to WABA_APP_SECRET for backwards compatibility
    this.webhookSecret = this.configService.get('WABA_WEBHOOK_SECRET', '') || 
                         this.configService.get('WABA_APP_SECRET', '');
    
    if (!this.webhookSecret) {
      this.logger.warn('⚠️ WABA_WEBHOOK_SECRET not configured - webhook signature verification will fail');
      this.logger.warn('Please set WABA_WEBHOOK_SECRET to your Meta App Secret from: https://developers.facebook.com/apps/YOUR_APP_ID/settings/basic/');
    } else {
      this.logger.log(`✅ Webhook secret configured (length: ${this.webhookSecret.length})`);
    }
  }

  verifyWebhookChallenge(query: WebhookVerifyDto): string {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    this.logger.log(`Webhook verification attempt - Mode: ${mode}, Token: ${token?.substring(0, 10)}...`);

    if (mode !== 'subscribe') {
      this.logger.error(`Invalid hub.mode: ${mode}`);
      throw new UnauthorizedException('Invalid hub.mode');
    }

    if (token !== this.verifyToken) {
      this.logger.error('Invalid verify token');
      throw new UnauthorizedException('Invalid verify token');
    }

    this.logger.log('Webhook verification successful');
    return challenge;
  }

  async verifyWebhookSignature(
    payload: string,
    signature: string | undefined,
    timestamp?: string,
  ): Promise<boolean> {
    // If no webhook secret is configured, skip verification (development only)
    if (!this.webhookSecret) {
      this.logger.warn('⚠️ WABA_WEBHOOK_SECRET not configured - skipping signature verification');
      this.logger.warn('This is INSECURE and should only be used for development/debugging');
      return true; // Allow webhook through for debugging
    }

    // If no signature provided but secret is configured, reject
    if (!signature) {
      this.logger.error('Missing webhook signature in request headers');
      this.logger.debug('Expected header: X-Hub-Signature-256');
      return false;
    }

    try {
      // Meta's webhook signature is calculated as: sha256=HMAC-SHA256(payload, app_secret)
      // No timestamp is included in the signature calculation
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      // Remove 'sha256=' prefix if present
      const providedSignature = signature.replace('sha256=', '');

      // Both signatures must be valid hex strings of same length
      let isValid = false;
      try {
        isValid = crypto.timingSafeEqual(
          Buffer.from(providedSignature, 'hex'),
          Buffer.from(expectedSignature, 'hex'),
        );
      } catch (bufferError) {
        this.logger.error(`Signature buffer comparison error: ${bufferError.message}`);
        this.logger.debug(`Provided signature length: ${providedSignature.length}`);
        this.logger.debug(`Expected signature length: ${expectedSignature.length}`);
        return false;
      }

      if (!isValid) {
        this.logger.error(`Webhook signature verification failed`);
        this.logger.debug(`Expected: sha256=${expectedSignature}`);
        this.logger.debug(`Received: ${signature}`);
        this.logger.debug(`Secret length: ${this.webhookSecret.length} chars`);
      } else {
        this.logger.log('✅ Webhook signature verified successfully');
      }

      return isValid;
    } catch (error: any) {
      this.logger.error(`Error verifying webhook signature: ${error.message}`);
      return false;
    }
  }

  extractEventType(event: WebhookEvent): string {
    try {
      if (!event.entry || event.entry.length === 0) {
        return 'unknown';
      }

      const changes = event.entry[0].changes;
      if (!changes || changes.length === 0) {
        return 'unknown';
      }

      return changes[0].field || 'unknown';
    } catch (error: any) {
      this.logger.error(`Error extracting event type: ${error.message}`);
      return 'unknown';
    }
  }

  extractMessageStatus(event: WebhookEvent): {
    messageId: string;
    status: string;
    timestamp: Date;
    recipientId?: string;
    error?: any;
  } | null {
    try {
      const changes = event.entry?.[0]?.changes;
      if (!changes || changes.length === 0) {
        return null;
      }

      const value = changes[0].value;
      if (!value || changes[0].field !== 'messages') {
        return null;
      }

      const statuses = value.statuses;
      if (!statuses || statuses.length === 0) {
        return null;
      }

      const status = statuses[0];
      return {
        messageId: status.id,
        status: status.status,
        timestamp: new Date(status.timestamp * 1000),
        recipientId: status.recipient_id,
        error: status.errors?.[0],
      };
    } catch (error: any) {
      this.logger.error(`Error extracting message status: ${error.message}`);
      return null;
    }
  }

  extractIncomingMessage(event: WebhookEvent): {
    messageId: string;
    from: string;
    timestamp: Date;
    type: string;
    text?: string;
    media?: any;
  } | null {
    try {
      const changes = event.entry?.[0]?.changes;
      if (!changes || changes.length === 0) {
        return null;
      }

      const value = changes[0].value;
      if (!value || changes[0].field !== 'messages') {
        return null;
      }

      const messages = value.messages;
      if (!messages || messages.length === 0) {
        return null;
      }

      const message = messages[0];
      return {
        messageId: message.id,
        from: message.from,
        timestamp: new Date(message.timestamp * 1000),
        type: message.type,
        text: message.text?.body,
        media: message[message.type],
      };
    } catch (error: any) {
      this.logger.error(`Error extracting incoming message: ${error.message}`);
      return null;
    }
  }

  extractTemplateStatusUpdate(event: WebhookEvent): {
    templateName: string;
    language: string;
    status: string;
    reason?: string;
  } | null {
    try {
      const changes = event.entry?.[0]?.changes;
      if (!changes || changes.length === 0) {
        return null;
      }

      const value = changes[0].value;
      if (!value || changes[0].field !== 'message_template_status_update') {
        return null;
      }

      return {
        templateName: value.message_template_name,
        language: value.message_template_language,
        status: value.event,
        reason: value.reason,
      };
    } catch (error: any) {
      this.logger.error(`Error extracting template status update: ${error.message}`);
      return null;
    }
  }

  validateWebhookTimestamp(timestamp: string, maxAgeSeconds = 300): boolean {
    try {
      const webhookTime = parseInt(timestamp, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const age = currentTime - webhookTime;

      if (age > maxAgeSeconds) {
        this.logger.warn(`Webhook timestamp too old: ${age} seconds`);
        return false;
      }

      if (age < -60) {
        this.logger.warn(`Webhook timestamp in the future: ${age} seconds`);
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error(`Error validating webhook timestamp: ${error.message}`);
      return false;
    }
  }
}