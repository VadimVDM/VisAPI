export const QUEUE_NAMES = {
  CRITICAL: 'critical',
  DEFAULT: 'default',
  BULK: 'bulk',
  SLACK: 'slack',
  WHATSAPP: 'whatsapp',
  PDF: 'pdf',
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
  GENERATE_PDF: 'pdf.generate',
  PROCESS_IMAGE: 'image.process',
  PROCESS_WORKFLOW: 'workflow.process',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
export type QueuePriority =
  (typeof QUEUE_PRIORITIES)[keyof typeof QUEUE_PRIORITIES];
