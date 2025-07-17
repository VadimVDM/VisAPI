// API related types shared between frontend and backend

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  hashed_secret: string;
  scopes: string[];
  expires_at: string | null;
  created_by: string;
  created_at: string;
  active: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
}

export interface CreateApiKeyResponse {
  key: string;
  apiKey: ApiKey;
}

// Common API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Health check types
export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'ok' | 'error';
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: 'ok' | 'error';
      responseTime?: number;
      error?: string;
    };
  };
}

// Webhook types
export interface WebhookPayload {
  [key: string]: any;
}

export interface TriggerResponse {
  success: boolean;
  jobId?: string;
  error?: string;
}

// Queue metrics
export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

// Log entry types
export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: any;
  workflow_id?: string;
  job_id?: string;
  pii_redacted: boolean;
  created_at: string;
}

export interface LogFilters {
  level?: 'info' | 'warn' | 'error' | 'debug';
  workflow_id?: string;
  job_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface LogStats {
  total: number;
  withPii: number;
  recentCount: number;
  byLevel: Record<string, number>;
}

// Dashboard metrics types
export interface WorkflowStats {
  total: number;
  active: number;
  completed: number;
  failed: number;
  pending: number;
}

export interface SystemStats {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  version: string;
  environment: string;
  timestamp: string;
}
