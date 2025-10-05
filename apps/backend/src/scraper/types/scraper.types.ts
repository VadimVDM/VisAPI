/**
 * Type definitions for scraper module
 */

export interface OrderData {
  order_id: string;
  product_country?: string;
  client_email?: string;
  applicants_data?: ApplicantData[];
  visa_details?: VisaDetails;
  [key: string]: unknown;
}

export interface ApplicantData {
  id?: string;
  passport?: PassportData;
  [key: string]: unknown;
}

export interface PassportData {
  number?: string;
  dateOfBirth?: string;
  [key: string]: unknown;
}

export interface VisaDetails {
  applications?: VisaApplication[];
  [key: string]: unknown;
}

export interface VisaApplication {
  applicationId?: string;
  [key: string]: unknown;
}

export interface ScraperCredentials {
  email?: string;
  passportNumber?: string;
  dateOfBirth?: string;
  applicationNumber?: string;
  referenceNumber?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ScraperJobRecord {
  job_id: string;
  scraper_type: 'esta' | 'vietnam-evisa' | 'korea-keta';
  status:
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'retry'
    | 'not_found';
  document_url?: string;
  signed_url?: string;
  filename?: string;
  file_size?: number;
  downloaded_at?: string;
  duration_ms?: number;
  error_message?: string;
  error_code?: string;
  should_retry?: boolean;
  retry_after?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}
