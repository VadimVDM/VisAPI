import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookEvent, EnhancedMessageStatus, ConversationCategory } from '../types/whatsapp.types';

export interface MessageTrackingData {
  orderId?: string;
  messageId: string;
  phoneNumber: string;
  templateName?: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  conversationId?: string;
  conversationCategory?: ConversationCategory;
  pricingModel?: 'CBP' | 'PMP';
  isBillable?: boolean;
  webhookEvents: any[];
}

export interface ConversationData {
  conversationId: string;
  phoneNumber: string;
  category: ConversationCategory;
  pricingModel: 'CBP' | 'PMP';
  isBillable: boolean;
  pricingType?: string;
  expiresAt?: Date;
  createdAt: Date;
}

@Injectable()
export class DeliveryTrackerService {
  private readonly logger = new Logger(DeliveryTrackerService.name);
  private messageTracking: Map<string, MessageTrackingData> = new Map();
  private conversationTracking: Map<string, ConversationData> = new Map();

  constructor(private readonly configService: ConfigService) {}

  trackMessageSent(
    messageId: string,
    phoneNumber: string,
    orderId?: string,
    templateName?: string,
  ): void {
    this.logger.log(`Tracking message sent: ${messageId} to ${phoneNumber}`);

    this.messageTracking.set(messageId, {
      messageId,
      phoneNumber,
      orderId,
      templateName,
      status: 'sent',
      sentAt: new Date(),
      webhookEvents: [],
    });
  }

  updateMessageStatus(status: EnhancedMessageStatus): void {
    const tracking = this.messageTracking.get(status.id);
    
    if (!tracking) {
      this.logger.warn(`No tracking found for message ${status.id}`);
      this.messageTracking.set(status.id, {
        messageId: status.id,
        phoneNumber: status.recipient,
        status: status.status,
        webhookEvents: [],
      });
      return;
    }

    this.logger.log(`Updating message ${status.id} status to ${status.status}`);

    tracking.status = status.status;
    
    switch (status.status) {
      case 'delivered':
        tracking.deliveredAt = status.timestamp;
        break;
      case 'read':
        tracking.readAt = status.timestamp;
        break;
      case 'failed':
        tracking.failedAt = status.timestamp;
        tracking.failureReason = status.error?.message || 'Unknown error';
        break;
    }

    if (status.conversationId) {
      tracking.conversationId = status.conversationId;
      tracking.conversationCategory = status.conversationCategory;
      tracking.pricingModel = status.pricingModel;
      tracking.isBillable = status.isBillable;

      this.trackConversation(
        status.conversationId,
        tracking.phoneNumber,
        status.conversationCategory || ConversationCategory.UTILITY,
        status.pricingModel || 'CBP',
        status.isBillable || false,
      );
    }

    this.messageTracking.set(status.id, tracking);
  }

  processWebhookEvent(event: WebhookEvent): void {
    try {
      if (!event.entry || event.entry.length === 0) {
        return;
      }

      for (const entry of event.entry) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            this.processMessageWebhook(change.value);
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Error processing webhook event: ${error.message}`);
    }
  }

  private processMessageWebhook(value: any): void {
    const statuses = value.statuses || [];
    
    for (const status of statuses) {
      const messageId = status.id;
      const tracking = this.messageTracking.get(messageId);

      if (tracking) {
        tracking.webhookEvents.push(status);

        const enhancedStatus: EnhancedMessageStatus = {
          id: messageId,
          status: this.mapWebhookStatus(status.status),
          timestamp: new Date(status.timestamp * 1000),
          recipient: status.recipient_id,
          conversationId: status.conversation?.id,
          conversationCategory: status.conversation?.category,
          pricingModel: status.pricing?.pricing_model,
          isBillable: status.pricing?.billable,
          error: status.errors?.[0],
        };

        this.updateMessageStatus(enhancedStatus);
      }
    }

    const messages = value.messages || [];
    for (const message of messages) {
      this.logger.log(`Received incoming message ${message.id} from ${message.from}`);
    }
  }

  private mapWebhookStatus(status: string): 'queued' | 'sent' | 'delivered' | 'read' | 'failed' {
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

  trackConversation(
    conversationId: string,
    phoneNumber: string,
    category: ConversationCategory,
    pricingModel: 'CBP' | 'PMP',
    isBillable: boolean,
    expiresAt?: Date,
  ): void {
    this.logger.log(`Tracking conversation ${conversationId} for ${phoneNumber}`);

    this.conversationTracking.set(conversationId, {
      conversationId,
      phoneNumber,
      category,
      pricingModel,
      isBillable,
      expiresAt,
      createdAt: new Date(),
    });
  }

  getMessageTracking(messageId: string): MessageTrackingData | undefined {
    return this.messageTracking.get(messageId);
  }

  getConversationTracking(conversationId: string): ConversationData | undefined {
    return this.conversationTracking.get(conversationId);
  }

  getMessagesByOrder(orderId: string): MessageTrackingData[] {
    const messages: MessageTrackingData[] = [];
    
    for (const tracking of this.messageTracking.values()) {
      if (tracking.orderId === orderId) {
        messages.push(tracking);
      }
    }

    return messages;
  }

  getMessagesByPhone(phoneNumber: string): MessageTrackingData[] {
    const messages: MessageTrackingData[] = [];
    
    for (const tracking of this.messageTracking.values()) {
      if (tracking.phoneNumber === phoneNumber) {
        messages.push(tracking);
      }
    }

    return messages;
  }

  getFailedMessages(since?: Date): MessageTrackingData[] {
    const messages: MessageTrackingData[] = [];
    
    for (const tracking of this.messageTracking.values()) {
      if (tracking.status === 'failed') {
        if (!since || (tracking.failedAt && tracking.failedAt >= since)) {
          messages.push(tracking);
        }
      }
    }

    return messages;
  }

  getMessageStats(): {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  } {
    let sent = 0;
    let delivered = 0;
    let read = 0;
    let failed = 0;

    for (const tracking of this.messageTracking.values()) {
      switch (tracking.status) {
        case 'sent':
          sent++;
          break;
        case 'delivered':
          delivered++;
          break;
        case 'read':
          read++;
          break;
        case 'failed':
          failed++;
          break;
      }
    }

    return {
      total: this.messageTracking.size,
      sent,
      delivered,
      read,
      failed,
    };
  }

  getConversationStats(): {
    total: number;
    byCategory: Record<ConversationCategory, number>;
    billable: number;
    free: number;
  } {
    const byCategory: Record<ConversationCategory, number> = {
      [ConversationCategory.AUTHENTICATION]: 0,
      [ConversationCategory.MARKETING]: 0,
      [ConversationCategory.UTILITY]: 0,
      [ConversationCategory.SERVICE]: 0,
    };

    let billable = 0;
    let free = 0;

    for (const conversation of this.conversationTracking.values()) {
      byCategory[conversation.category]++;
      
      if (conversation.isBillable) {
        billable++;
      } else {
        free++;
      }
    }

    return {
      total: this.conversationTracking.size,
      byCategory,
      billable,
      free,
    };
  }

  clearOldTracking(olderThan: Date): void {
    for (const [messageId, tracking] of this.messageTracking.entries()) {
      if (tracking.sentAt && tracking.sentAt < olderThan) {
        this.messageTracking.delete(messageId);
      }
    }

    for (const [conversationId, conversation] of this.conversationTracking.entries()) {
      if (conversation.createdAt < olderThan) {
        this.conversationTracking.delete(conversationId);
      }
    }

    this.logger.log(`Cleared tracking data older than ${olderThan.toISOString()}`);
  }
}