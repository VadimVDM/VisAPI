export interface Contact {
  id: number;
  page_id: number;
  first_name: string;
  last_name: string;
  channel: number; // 0=Messenger, 2=SMS, 5=WhatsApp, 7=GBM, 8=Telegram, 9=Webchat
  profile_pic: string;
  locale: string;
  gender: number; // 0=Female, 1=Male, 2=Unknown
  timezone: number;
  last_sent: number; // Unix timestamp in milliseconds
  last_delivered: number;
  last_seen: number;
  last_interaction: number;
  subscribed_date: string; // UTC format: "2022-10-12 14:40:00"
  subscribed: number; // 1=Subscribed, 2=Unsubscribed
  tags: Tag[];
  custom_fields: CustomField[];
  phone?: string; // May not always be present in response
  email?: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface CustomField {
  id: number;
  name: string;
  type: number; // 0=Text, 1=Number, 2=Date, 3=DateTime, 4=Boolean, 5=LongText, 6=Select, 7=MultiSelect
  value: string;
}

export interface CreateContactDto {
  phone: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  gender?: 'male' | 'female';
  actions?: ContactAction[];
}

export interface ContactAction {
  action: 'add_tag' | 'set_field_value' | 'send_flow';
  tag_name?: string;
  field_name?: string;
  value?: string;
  flow_id?: number;
}

export interface MessageResponse {
  success: boolean;
  message_id?: string;
  error?: string;
}

export interface Flow {
  id: number;
  name: string;
  description?: string;
  type?: string;
}

export interface SendTextMessageDto {
  text: string;
  channel: string; // 'whatsapp' for WhatsApp messages
}

export interface SendFileMessageDto {
  url: string;
  type: 'image' | 'document' | 'video' | 'audio';
  channel: string;
}

export interface FindContactResponse {
  contact: Contact | null;
  found: boolean;
}

export interface CgbApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AccountInfo {
  id: number;
  name: string;
  timezone: string;
  currency: string;
}

export interface FieldType {
  id: number;
  name: string;
  type: number;
}

export const WHATSAPP_CHANNEL = 5;
export const WHATSAPP_CHANNEL_NAME = 'whatsapp';

export const CGB_ENDPOINTS = {
  CONTACTS: '/contacts',
  FIND_CONTACT: '/contacts/find_by_custom_field',
  SEND_TEXT: (contactId: number) => `/contacts/${contactId}/send/text`,
  SEND_FILE: (contactId: number) => `/contacts/${contactId}/send/file`,
  SEND_FLOW: (contactId: number, flowId: number) => `/contacts/${contactId}/send/${flowId}`,
  FLOWS: '/accounts/flows',
  ACCOUNT: '/accounts/me',
  TAGS: '/accounts/tags',
  CUSTOM_FIELDS: '/accounts/custom_fields',
} as const;