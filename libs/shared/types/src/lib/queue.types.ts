export const QUEUE_NAMES = {
  CRITICAL: 'critical',
  DEFAULT: 'default',
  BULK: 'bulk',
  SLACK: 'slack',
  WHATSAPP: 'whatsapp',
  WHATSAPP_MESSAGES: 'whatsapp-messages',
  PDF: 'pdf',
  CBB_SYNC: 'cbb-sync',
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
  GENERATE_PDF: 'pdf.generate',
  SYNC_CBB_CONTACT: 'cbb.sync-contact',
  PROCESS_IMAGE: 'image.process',
  PROCESS_WORKFLOW: 'workflow.process',
  PRUNE_LOGS: 'logs.prune',
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

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
export type QueuePriority =
  (typeof QUEUE_PRIORITIES)[keyof typeof QUEUE_PRIORITIES];
