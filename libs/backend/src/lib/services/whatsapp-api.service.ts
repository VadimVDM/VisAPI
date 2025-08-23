import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  WhatsAppConfig,
  MessageResponse,
  EnhancedMessageStatus,
  TemplateParameter,
  ConversationCategory,
  MediaResponse,
  BusinessInfo,
  TemplateAnalytics,
  ConversationInfo,
  TemplateComponent,
} from '../types/whatsapp.types';

@Injectable()
export class WhatsAppApiService {
  private readonly logger = new Logger(WhatsAppApiService.name);
  private readonly config: WhatsAppConfig;
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      phoneNumberId: this.configService.get('WABA_PHONE_NUMBER_ID', ''),
      businessId: this.configService.get('WABA_BUSINESS_ID', ''),
      accessToken: this.configService.get('WABA_ACCESS_TOKEN', ''),
      verifyToken: this.configService.get('WABA_VERIFY_TOKEN', 'Np2YWkYAmLA6UjQ2reZcD7TRP3scWdKdeALugqmc9U'),
      apiVersion: this.configService.get('WABA_API_VERSION', 'v23.0'),
      webhookSecret: this.configService.get('WABA_WEBHOOK_SECRET', ''),
      appSecret: this.configService.get('WABA_APP_SECRET', ''),
      webhookEndpoint: this.configService.get('WABA_WEBHOOK_ENDPOINT', '/api/v1/webhooks/whatsapp'),
      businessVerificationRequired: this.configService.get('WABA_BUSINESS_VERIFICATION_REQUIRED', 'true') === 'true',
      enableFlows: this.configService.get('WABA_ENABLE_FLOWS', 'true') === 'true',
      enableCatalogMessaging: this.configService.get('WABA_ENABLE_CATALOG_MESSAGING', 'true') === 'true',
      conversationTrackingEnabled: this.configService.get('WABA_CONVERSATION_TRACKING_ENABLED', 'true') === 'true',
      templateQualityMonitoring: this.configService.get('WABA_TEMPLATE_QUALITY_MONITORING', 'true') === 'true',
      automatedTemplateSyncInterval: parseInt(this.configService.get('WABA_AUTOMATED_TEMPLATE_SYNC_INTERVAL', '3600'), 10),
    };

    this.baseUrl = `https://graph.facebook.com/${this.config.apiVersion}`;
  }

  async sendTemplateMessage(
    phoneNumber: string,
    templateName: string,
    languageCode: string,
    parameters: TemplateParameter[],
    conversationCategory?: ConversationCategory,
  ): Promise<MessageResponse> {
    try {
      const cleanPhoneNumber = this.cleanPhoneNumber(phoneNumber);
      
      const components: TemplateComponent[] = [];
      
      if (parameters.length > 0) {
        components.push({
          type: 'body',
          parameters,
        });
      }

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components,
        },
      };

      if (conversationCategory) {
        (payload as any).conversation_category = conversationCategory;
      }

      this.logger.log(`Sending template message to ${cleanPhoneNumber} using template ${templateName}`);

      const response = await firstValueFrom(
        this.httpService.post<MessageResponse>(
          `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
          payload,
          {
            headers: {
              'Authorization': `Bearer ${this.config.accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Message sent successfully: ${response.data.messages[0]?.id}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to send template message: ${error.message}`, error.response?.data);
      throw error;
    }
  }

  async sendTextMessage(phoneNumber: string, text: string): Promise<MessageResponse> {
    try {
      const cleanPhoneNumber = this.cleanPhoneNumber(phoneNumber);

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhoneNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      };

      this.logger.log(`Sending text message to ${cleanPhoneNumber}`);

      const response = await firstValueFrom(
        this.httpService.post<MessageResponse>(
          `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
          payload,
          {
            headers: {
              'Authorization': `Bearer ${this.config.accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Text message sent successfully: ${response.data.messages[0]?.id}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to send text message: ${error.message}`, error.response?.data);
      throw error;
    }
  }

  async getMessageStatus(messageId: string): Promise<EnhancedMessageStatus> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/${messageId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.accessToken}`,
            },
            params: {
              fields: 'id,status,timestamp,recipient_id,conversation,pricing',
            },
          },
        ),
      );

      const data = response.data;
      
      return {
        id: data.id,
        status: this.mapMessageStatus(data.status),
        timestamp: new Date(data.timestamp * 1000),
        recipient: data.recipient_id,
        conversationId: data.conversation?.id,
        conversationCategory: data.conversation?.origin?.type,
        pricingModel: data.pricing?.pricing_model,
        isBillable: data.pricing?.billable,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get message status: ${error.message}`, error.response?.data);
      throw error;
    }
  }

  async uploadMedia(file: Buffer, mimeType: string): Promise<MediaResponse> {
    try {
      const formData = new FormData();
      // Convert Buffer to Uint8Array for Blob compatibility
      const uint8Array = new Uint8Array(file);
      const blob = new Blob([uint8Array], { type: mimeType });
      formData.append('file', blob);
      formData.append('messaging_product', 'whatsapp');

      const response = await firstValueFrom(
        this.httpService.post<MediaResponse>(
          `${this.baseUrl}/${this.config.phoneNumberId}/media`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${this.config.accessToken}`,
            },
          },
        ),
      );

      this.logger.log(`Media uploaded successfully: ${response.data.id}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to upload media: ${error.message}`, error.response?.data);
      throw error;
    }
  }

  async downloadMedia(mediaId: string): Promise<Buffer> {
    try {
      const mediaUrlResponse = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/${mediaId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.accessToken}`,
            },
          },
        ),
      );

      const mediaUrl = mediaUrlResponse.data.url;

      const mediaResponse = await firstValueFrom(
        this.httpService.get(mediaUrl, {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
          responseType: 'arraybuffer',
        }),
      );

      return Buffer.from(mediaResponse.data);
    } catch (error: any) {
      this.logger.error(`Failed to download media: ${error.message}`, error.response?.data);
      throw error;
    }
  }

  async getBusinessInfo(): Promise<BusinessInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/${this.config.businessId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.accessToken}`,
            },
            params: {
              fields: 'id,name,vertical,verification_status,message_template_namespace,messaging_limit_tier,quality_rating,status',
            },
          },
        ),
      );

      return {
        id: response.data.id,
        name: response.data.name,
        vertical: response.data.vertical,
        verification_status: response.data.verification_status,
        message_template_limit: response.data.message_template_namespace?.limit || 0,
        messaging_limit_tier: response.data.messaging_limit_tier,
        quality_rating: response.data.quality_rating,
        status: response.data.status,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get business info: ${error.message}`, error.response?.data);
      throw error;
    }
  }

  async getTemplateAnalytics(templateName: string): Promise<TemplateAnalytics> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/${this.config.businessId}/template_analytics`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.accessToken}`,
            },
            params: {
              template_names: templateName,
              fields: 'name,sent,delivered,read,quality_score,updated_at',
            },
          },
        ),
      );

      const analytics = response.data.data[0];

      return {
        template_name: analytics.name,
        sent_count: analytics.sent,
        delivered_count: analytics.delivered,
        read_count: analytics.read,
        quality_score: analytics.quality_score,
        click_through_rate: analytics.click_through_rate,
        last_updated: new Date(analytics.updated_at),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get template analytics: ${error.message}`, error.response?.data);
      throw error;
    }
  }

  async getConversationInfo(phoneNumber: string): Promise<ConversationInfo | null> {
    try {
      const cleanPhoneNumber = this.cleanPhoneNumber(phoneNumber);
      
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/${this.config.phoneNumberId}/conversations`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.accessToken}`,
            },
            params: {
              fields: 'id,origin,category,expiration_timestamp,pricing',
              recipient: cleanPhoneNumber,
            },
          },
        ),
      );

      if (response.data.data && response.data.data.length > 0) {
        const conversation = response.data.data[0];
        
        return {
          id: conversation.id,
          origin: conversation.origin,
          category: conversation.category as ConversationCategory,
          expiration_timestamp: new Date(conversation.expiration_timestamp * 1000),
          is_billable: conversation.pricing?.billable || false,
          pricing_model: conversation.pricing?.pricing_model || 'CBP',
        };
      }

      return null;
    } catch (error: any) {
      this.logger.error(`Failed to get conversation info: ${error.message}`, error.response?.data);
      return null;
    }
  }

  private cleanPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
    
    if (!cleaned.startsWith('972')) {
      if (cleaned.startsWith('0')) {
        cleaned = '972' + cleaned.substring(1);
      } else {
        cleaned = '972' + cleaned;
      }
    }

    return cleaned;
  }

  private mapMessageStatus(status: string): 'queued' | 'sent' | 'delivered' | 'read' | 'failed' {
    const statusMap: Record<string, 'queued' | 'sent' | 'delivered' | 'read' | 'failed'> = {
      'accepted': 'queued',
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'failed': 'failed',
      'deleted': 'failed',
    };

    return statusMap[status.toLowerCase()] || 'queued';
  }
}