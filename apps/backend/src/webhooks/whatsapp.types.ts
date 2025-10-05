export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  field:
    | 'messages'
    | 'message_template_status_update'
    | 'account_update'
    | 'business_capability_update';
  value: WhatsAppValue;
}

export interface WhatsAppValue {
  messaging_product: 'whatsapp';
  metadata: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  errors?: WhatsAppError[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppError {
  code: number;
  title: string;
  message: string;
  error_data: {
    details: string;
  };
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: {
    body: string;
  };
  type:
    | 'text'
    | 'image'
    | 'document'
    | 'audio'
    | 'video'
    | 'sticker'
    | 'reaction'
    | 'unknown';
  // Other message types can be added here
}

export interface WhatsAppStatus {
  id: string;
  recipient_id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'warning';
  timestamp: string;
  conversation?: WhatsAppConversation;
  pricing?: WhatsAppPricing;
  errors?: WhatsAppError[];
  biz_opaque_callback_data?: string;
}

export interface WhatsAppConversation {
  id: string;
  origin: {
    type: 'user_initiated' | 'business_initiated' | 'referral_conversion';
  };
  expiration_timestamp?: string;
}

export interface WhatsAppPricing {
  billable: boolean;
  pricing_model: 'CBP';
  category: 'user_initiated' | 'business_initiated' | 'referral_conversion';
}

export interface TemplateStatusUpdate {
  message_template_name: string;
  message_template_language: string;
  event: 'APPROVED' | 'REJECTED' | 'PENDING';
  reason?: string;
}

export interface AccountUpdate {
  ban_info?: {
    waba_ban_state: string;
    waba_ban_date: string;
  };
}

export interface BusinessCapabilityUpdate {
  max_daily_conversation_per_phone?: number;
  max_phone_numbers_per_business?: number;
}

export interface EnhancedMessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'warning';
  timestamp: Date;
  recipient: string;
  conversationId?: string;
  conversationCategory?:
    | 'user_initiated'
    | 'business_initiated'
    | 'referral_conversion';
  pricingModel?: 'CBP';
  isBillable?: boolean;
  error?: WhatsAppError;
  messageIdUpdated: boolean;
}
