// API related types shared between frontend and backend

export interface ApiKey {
  id: string;
  name: string;
  hashed_key: string;
  scopes: string[];
  expires_at: string | null;
  created_by: string;
  created_at: string;
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
