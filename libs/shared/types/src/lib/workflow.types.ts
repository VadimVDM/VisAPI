// Workflow related types

export interface WorkflowTrigger {
  type: 'webhook' | 'cron' | 'manual';
  config: {
    schedule?: string; // For cron triggers
    endpoint?: string; // For webhook triggers
    [key: string]: any;
  };
}

export interface WorkflowStep {
  id: string;
  type:
    | 'slack.send'
    | 'whatsapp.send'
    | 'pdf.generate'
    | 'email.send'
    | 'delay';
  config: {
    template?: string;
    channel?: string;
    recipient?: string;
    duration?: number; // For delay steps
    [key: string]: any;
  };
  retries?: number;
  timeout?: number;
}

export interface WorkflowSchema {
  id: string;
  name: string;
  description?: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  variables?: {
    [key: string]: any;
  };
  enabled: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  input?: any;
  output?: any;
  error?: string;
  steps: WorkflowExecutionStep[];
}

export interface WorkflowExecutionStep {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  input?: any;
  output?: any;
  error?: string;
  retryCount: number;
}

// Job priorities
export type JobPriority = 'critical' | 'default' | 'bulk';

// Job status
export type JobStatus =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused';

export interface JobInfo {
  id: string;
  name: string;
  data: any;
  priority: JobPriority;
  status: JobStatus;
  progress?: number;
  createdAt: string;
  processedAt?: string;
  finishedAt?: string;
  error?: string;
  attempts: number;
  maxAttempts: number;
}

// Grafana webhook types
export interface GrafanaAlert {
  id: number;
  uid: string;
  title: string;
  state: 'alerting' | 'ok' | 'no_data' | 'paused' | 'pending';
  evalMatches: Array<{
    value: number;
    metric: string;
    tags: Record<string, string>;
  }>;
  executionError: string;
  noDataFound: boolean;
  message: string;
  ruleId: number;
  ruleName: string;
  ruleUrl: string;
  dashboardId: number;
  panelId: number;
  tags: Record<string, string>;
  imageUrl?: string;
}

export interface GrafanaWebhookPayload {
  dashboardId: number;
  evalMatches: Array<{
    value: number;
    metric: string;
    tags: Record<string, string>;
  }>;
  message: string;
  orgId: number;
  panelId: number;
  ruleId: number;
  ruleName: string;
  ruleUrl: string;
  state: 'alerting' | 'ok' | 'no_data' | 'paused' | 'pending';
  tags: Record<string, string>;
  title: string;
  imageUrl?: string;
  alerts?: GrafanaAlert[];
}

export interface SlackMessage {
  channel?: string;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
  text?: string;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
}

export interface SlackAttachment {
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: SlackField[];
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
  mrkdwn_in?: string[];
}

export interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  elements?: any[];
  accessory?: any;
}
