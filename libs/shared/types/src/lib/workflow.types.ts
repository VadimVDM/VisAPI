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
  type: 'slack.send' | 'whatsapp.send' | 'pdf.generate' | 'email.send';
  config: {
    template?: string;
    channel?: string;
    recipient?: string;
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
