export interface ApplicantData {
  passport?: {
    sex?: 'm' | 'f';
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ProductUrgency {
  name: string;
  price: number;
  wait: number;
}

export interface ProductVariation {
  name: string;
  price: number;
}

export interface ProductData {
  name?: string;
  country?: string;
  doc_type?: string;
  doc_name?: string;
  intent?: string;
  entries?: string;
  validity?: string;
  days_to_use?: number;
  urgency?: string;
  urgencies?: ProductUrgency[];
  price?: number;
  wait?: number;
  instructions?: string;
  stay_limit?: number;
  photo_types?: string[];
  variations?: ProductVariation[];
}

export interface OrderData {
  id: string;
  order_id: string;
  client_phone: string;
  client_name: string;
  client_email: string;
  product_country: string;
  product_doc_type: string | null;
  product_intent?: string | null;
  product_entries?: string | null;
  product_validity?: string | null;
  product_days_to_use?: number | null;
  visa_quantity: number | null;
  amount: number;
  currency: string;
  entry_date: string | null;
  branch: string;
  form_id: string;
  webhook_received_at: string;
  whatsapp_alerts_enabled: boolean | null;
  applicants_data?: ApplicantData[];
  cbb_synced?: boolean | null;
  cbb_contact_id?: string | null;
  cbb_contact_uuid?: string | null;
  cbb_sync_last_error?: string | null;
  whatsapp_confirmation_sent?: boolean | null;
  whatsapp_confirmation_sent_at?: string | null;
  whatsapp_message_id?: string | null;
  is_urgent?: boolean | null;
  product_data?: ProductData;
  created_at: string;
  updated_at: string;
  processing_days?: number;
}
