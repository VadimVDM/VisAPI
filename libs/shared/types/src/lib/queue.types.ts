export const QUEUE_NAMES = {
  CRITICAL: 'critical',
  DEFAULT: 'default',
  BULK: 'bulk',
  SLACK: 'slack',
  WHATSAPP: 'whatsapp',
  WHATSAPP_MESSAGES: 'whatsapp-messages',
  PDF: 'pdf',
  CBB_SYNC: 'cbb-sync',
  SCRAPER: 'scraper',
  DLQ: 'dlq',
} as const;

export const QUEUE_PRIORITIES = {
  CRITICAL: 10,
  DEFAULT: 5,
  BULK: 1,
} as const;

export const JOB_NAMES = {
  SEND_SLACK: 'slack.send',
  SEND_WHATSAPP: 'whatsapp.send',
  SEND_WHATSAPP_ORDER_CONFIRMATION: 'whatsapp.send-order-confirmation',
  SEND_WHATSAPP_VISA_APPROVAL: 'whatsapp.send-visa-approval',
  GENERATE_PDF: 'pdf.generate',
  SYNC_CBB_CONTACT: 'cbb.sync-contact',
  PROCESS_IMAGE: 'image.process',
  PROCESS_WORKFLOW: 'workflow.process',
  PRUNE_LOGS: 'logs.prune',
  SCRAPE_VISA_DOCUMENT: 'scraper.scrape-visa-document',
  SCRAPE_ESTA: 'scraper.scrape-esta',
  SCRAPE_VIETNAM_EVISA: 'scraper.scrape-vietnam-evisa',
  SCRAPE_KOREA_KETA: 'scraper.scrape-korea-keta',
} as const;

export interface WhatsAppJobData {
  to: string;                              // Phone number (will be resolved to contact)
  message?: string;                        // Direct text message
  template?: string;                       // Template/flow name
  variables?: Record<string, any>;         // Template variables
  fileUrl?: string;                        // For media messages
  fileType?: 'image' | 'document' | 'video' | 'audio';
}

export interface WhatsAppJobResult {
  success: boolean;
  contactId: number;                       // CBB contact ID
  messageId?: string;                      // CBB message ID if available
  to: string;                             // Original phone number
  timestamp: string;
  error?: string;
}

export interface WhatsAppMessageJobData {
  orderId: string;
  contactId: string;                       // CBB contact ID (phone number)
  messageType: 'order_confirmation' | 'status_update' | 'document_ready' | 'visa_approval';
  cbbId?: string;                         // CBB contact ID for visa approval
  phone?: string;                         // Phone number for visa approval
  templateName?: string;                  // Template name for visa approval
  templateParams?: string[];              // Template parameters for visa approval
  documentUrl?: string;                   // Visa document URL for attachment
  visaDetails?: any;                      // Full visa details object
  applicationIndex?: number;              // Which application (0-based) for multi-visa
  totalApplications?: number;             // Total number of applications in order
  force?: boolean;                        // Bypass idempotency checks for manual resends
}

export interface LogPruneJobData {
  olderThanDays: number;
}

export interface LogPruneJobResult {
  success: boolean;
  deleted: number;
  timestamp: string;
  error?: string;
}

export interface ScraperJobData {
  jobId: string;
  scraperType: 'esta' | 'vietnam-evisa' | 'korea-keta';
  credentials: {
    email?: string;
    applicationNumber?: string;
    passportNumber?: string;
    dateOfBirth?: string;
    [key: string]: any;
  };
  orderId?: string;
  applicationId?: string;
  maxRetries?: number;
  retryCount?: number;
  createdAt: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

export interface ScraperJobResult {
  success: boolean;
  jobId: string;
  scraperType: 'esta' | 'vietnam-evisa' | 'korea-keta';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'not_found' | 'retry';
  documentUrl?: string;
  signedUrl?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
  downloadedAt?: string;
  duration: number;
  error?: string;
  errorCode?: string;
  shouldRetry?: boolean;
  retryAfter?: string;
  screenshots?: string[];
  metadata?: Record<string, any>;
}

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
export type QueuePriority =
  (typeof QUEUE_PRIORITIES)[keyof typeof QUEUE_PRIORITIES];
