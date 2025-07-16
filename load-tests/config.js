// Load test configuration for S4-QA-01
// Environment-specific settings and parameters

// Environment detection
const ENV = __ENV.NODE_ENV || 'development';
const IS_PRODUCTION = ENV === 'production';
const IS_STAGING = ENV === 'staging';
const IS_DEVELOPMENT = ENV === 'development' || ENV === 'test';

// Base configuration
export const CONFIG = {
  // Environment settings
  environment: ENV,
  is_production: IS_PRODUCTION,
  is_staging: IS_STAGING,
  is_development: IS_DEVELOPMENT,

  // API endpoints
  endpoints: {
    base_url: getBaseURL(),
    api_version: 'v1',
    health: '/api/v1/healthz',
    liveness: '/api/v1/livez',
    version: '/api/v1/version',
    workflows: '/api/v1/workflows',
    triggers: '/api/v1/triggers',
    queue_metrics: '/api/v1/queue/metrics',
    logs: '/api/v1/logs',
    storage: '/api/v1/storage',
    admin: '/api/v1/admin',
  },

  // Authentication
  auth: {
    api_key: getAPIKey(),
    scopes: {
      triggers_create: 'triggers:create',
      workflows_read: 'workflows:read',
      workflows_create: 'workflows:create',
      workflows_update: 'workflows:update',
      workflows_delete: 'workflows:delete',
      queues_read: 'queues:read',
      logs_read: 'logs:read',
      admin_read: 'admin:read',
    },
  },

  // Test parameters
  test_parameters: {
    // S4-QA-01 Load Test
    load_test: {
      target_rps: 83.33, // 5000 requests per minute
      duration_minutes: 30,
      ramp_up_minutes: 2,
      ramp_down_minutes: 2,
      virtual_users: 83,
      traffic_distribution: {
        webhook_triggers: 0.8, // 80%
        queue_metrics: 0.1, // 10%
        workflow_management: 0.05, // 5%
        health_checks: 0.05, // 5%
      },
    },

    // PDF Batch Test
    pdf_batch_test: {
      target_size_gb: 10,
      duration_minutes: 30,
      virtual_users: 10,
      ramp_up_minutes: 2,
      ramp_down_minutes: 3,
      max_pdf_size_mb: 1,
      min_pdf_size_kb: 200,
      batch_size: 100,
      concurrent_uploads: 5,
    },

    // Smoke Test
    smoke_test: {
      virtual_users: 5,
      duration_seconds: 30,
      iteration_rate: 1, // 1 request per second per VU
      timeout_ms: 5000,
    },

    // Performance Suite
    performance_suite: {
      max_suite_duration_minutes: 120,
      test_timeout_minutes: 45,
      cleanup_timeout_minutes: 10,
      retry_attempts: 3,
      retry_delay_ms: 5000,
    },
  },

  // Performance thresholds
  thresholds: {
    // HTTP request thresholds
    http_req_duration_p95: IS_PRODUCTION ? 200 : 500, // 95th percentile
    http_req_duration_p99: IS_PRODUCTION ? 500 : 1000, // 99th percentile
    http_req_duration_max: IS_PRODUCTION ? 2000 : 5000, // Maximum
    http_req_failed_rate: IS_PRODUCTION ? 0.01 : 0.05, // Error rate

    // Load test specific thresholds
    load_test: {
      error_rate_max: 0.05, // 5% max error rate
      p95_latency_ms: 200, // 95th percentile < 200ms
      p99_latency_ms: 500, // 99th percentile < 500ms
      webhook_success_rate_min: 0.95, // 95% min success rate
      queue_metrics_success_rate_min: 0.95,
      workflow_management_success_rate_min: 0.95,
      health_check_success_rate_min: 0.95,
      overall_success_rate_min: 0.95,
    },

    // PDF batch test thresholds
    pdf_batch_test: {
      error_rate_max: 0.05, // 5% max error rate
      p95_latency_ms: 5000, // 95th percentile < 5s
      pdf_generation_success_rate_min: 0.9,
      storage_upload_success_rate_min: 0.95,
      presigned_url_success_rate_min: 0.95,
      file_processing_p95_latency_ms: 30000, // 30s max
      target_size_completion_min: 0.95, // 95% of target size
    },

    // Smoke test thresholds
    smoke_test: {
      error_rate_max: 0.1, // 10% max error rate
      p95_latency_ms: 500, // 95th percentile < 500ms
      overall_success_rate_min: 0.95,
    },

    // Queue system thresholds
    queue: {
      max_queue_depth: 1000, // Alert if queue depth > 1000
      max_processing_time_ms: 30000, // Max job processing time
      dead_letter_queue_max: 100, // Max DLQ size
      worker_utilization_max: 0.8, // Max worker utilization
    },
  },

  // Test data generation
  test_data: {
    // Visa types for realistic testing
    visa_types: [
      'Tourist',
      'Business',
      'Student',
      'Work',
      'Transit',
      'Medical',
      'Family Visit',
      'Conference',
      'Investment',
      'Diplomatic',
    ],

    // Countries for applicant data
    countries: [
      'United States',
      'Canada',
      'United Kingdom',
      'Germany',
      'France',
      'Australia',
      'Japan',
      'Singapore',
      'UAE',
      'Netherlands',
    ],

    // Visa statuses
    visa_statuses: [
      'submitted',
      'under_review',
      'additional_documents_required',
      'approved',
      'rejected',
      'expired',
      'cancelled',
    ],

    // Application purposes
    purposes: [
      'Business meetings',
      'Conference attendance',
      'Tourism',
      'Family visit',
      'Medical treatment',
      'Educational program',
      'Research collaboration',
      'Investment opportunities',
    ],

    // Random data ranges
    ranges: {
      applicant_id: { min: 100000, max: 999999 },
      processing_days: { min: 5, max: 30 },
      visa_duration_days: { min: 30, max: 365 },
      fees: { min: 50, max: 500 },
      bank_balance: { min: 5000, max: 100000 },
      monthly_income: { min: 3000, max: 20000 },
    },
  },

  // Monitoring and alerting
  monitoring: {
    // Metrics to track
    metrics: {
      requests_per_second: true,
      error_rate: true,
      response_time_percentiles: true,
      queue_depth: true,
      memory_usage: true,
      cpu_usage: true,
      database_connections: true,
      redis_connections: true,
    },

    // Alert thresholds
    alerts: {
      error_rate_threshold: 0.05, // 5%
      response_time_threshold: 200, // 200ms
      queue_depth_threshold: 1000, // 1000 jobs
      memory_usage_threshold: 0.8, // 80%
      cpu_usage_threshold: 0.8, // 80%
      disk_usage_threshold: 0.85, // 85%
    },

    // Notification settings
    notifications: {
      slack_webhook: __ENV.SLACK_WEBHOOK_URL,
      email_recipients: __ENV.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
      sms_recipients: __ENV.ALERT_SMS_RECIPIENTS?.split(',') || [],
    },
  },

  // Retry and timeout settings
  retry: {
    max_attempts: 3,
    initial_delay_ms: 1000,
    max_delay_ms: 10000,
    backoff_multiplier: 2,
    jitter: true,
  },

  timeout: {
    default_request_timeout_ms: 30000, // 30s
    webhook_timeout_ms: 60000, // 1 minute
    pdf_generation_timeout_ms: 120000, // 2 minutes
    file_upload_timeout_ms: 180000, // 3 minutes
    health_check_timeout_ms: 5000, // 5s
    queue_operation_timeout_ms: 10000, // 10s
  },

  // Rate limiting
  rate_limiting: {
    requests_per_minute: 200, // Match backend throttling
    burst_size: 50, // Burst allowance
    cooldown_ms: 60000, // 1 minute cooldown
  },

  // Resource limits
  resource_limits: {
    max_file_size_mb: 10, // 10MB max file size
    max_payload_size_kb: 512, // 512KB max payload
    max_concurrent_uploads: 10, // Max concurrent uploads
    max_queue_size: 10000, // Max queue size
    max_memory_usage_mb: 512, // Max memory per VU
    max_cpu_usage_percent: 80, // Max CPU usage
  },

  // Logging configuration
  logging: {
    level: IS_PRODUCTION ? 'info' : 'debug',
    format: 'json',
    include_request_body: !IS_PRODUCTION,
    include_response_body: !IS_PRODUCTION,
    max_log_size_mb: 100,
    log_retention_days: 30,
    sensitive_fields: [
      'password',
      'api_key',
      'token',
      'secret',
      'passport_number',
      'ssn',
      'credit_card',
    ],
  },

  // Storage configuration
  storage: {
    supabase: {
      project_id: __ENV.SUPABASE_PROJECT_ID,
      bucket_name: 'visa-documents',
      max_file_size_mb: 10,
      allowed_file_types: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
      presigned_url_ttl_seconds: 3600, // 1 hour
      public_url_ttl_seconds: 86400, // 24 hours
    },
  },

  // Database configuration
  database: {
    max_connections: 100,
    connection_timeout_ms: 30000,
    query_timeout_ms: 60000,
    idle_timeout_ms: 300000, // 5 minutes
    retry_attempts: 3,
    retry_delay_ms: 1000,
  },

  // Queue configuration
  queue: {
    redis_url: __ENV.REDIS_URL,
    max_jobs: 10000,
    job_timeout_ms: 300000, // 5 minutes
    max_retries: 3,
    retry_delay_ms: 5000,
    cleanup_interval_ms: 60000, // 1 minute
    metrics_interval_ms: 10000, // 10 seconds
  },
};

// Environment-specific overrides
if (IS_PRODUCTION) {
  // Production-specific settings
  CONFIG.test_parameters.load_test.virtual_users = 100;
  CONFIG.thresholds.http_req_duration_p95 = 150;
  CONFIG.thresholds.http_req_failed_rate = 0.01;
  CONFIG.logging.level = 'warn';
  CONFIG.logging.include_request_body = false;
  CONFIG.logging.include_response_body = false;
} else if (IS_STAGING) {
  // Staging-specific settings
  CONFIG.test_parameters.load_test.virtual_users = 50;
  CONFIG.thresholds.http_req_duration_p95 = 300;
  CONFIG.thresholds.http_req_failed_rate = 0.03;
} else {
  // Development/test-specific settings
  CONFIG.test_parameters.load_test.virtual_users = 20;
  CONFIG.test_parameters.load_test.duration_minutes = 5;
  CONFIG.test_parameters.pdf_batch_test.target_size_gb = 1;
  CONFIG.test_parameters.pdf_batch_test.duration_minutes = 10;
  CONFIG.thresholds.http_req_duration_p95 = 1000;
  CONFIG.thresholds.http_req_failed_rate = 0.1;
}

// Helper functions
function getBaseURL() {
  if (__ENV.BASE_URL) {
    return __ENV.BASE_URL;
  }

  switch (ENV) {
    case 'production':
      return 'https://api.visanet.app';
    case 'staging':
      return 'https://staging-api.visanet.app';
    default:
      return 'http://localhost:3000';
  }
}

function getAPIKey() {
  if (__ENV.API_KEY) {
    return __ENV.API_KEY;
  }

  switch (ENV) {
    case 'production':
      return __ENV.PRODUCTION_API_KEY || 'visapi_production-key-required';
    case 'staging':
      return __ENV.STAGING_API_KEY || 'visapi_staging-key-required';
    default:
      return 'visapi_test-secret-key-for-development';
  }
}

// Validation functions
export function validateConfig() {
  const errors = [];

  // Validate required environment variables
  if (!CONFIG.endpoints.base_url) {
    errors.push('BASE_URL is required');
  }

  if (!CONFIG.auth.api_key || CONFIG.auth.api_key.includes('required')) {
    errors.push('Valid API_KEY is required');
  }

  if (!CONFIG.auth.api_key.startsWith('visapi_')) {
    errors.push('API_KEY must start with visapi_ prefix');
  }

  // Validate test parameters
  if (CONFIG.test_parameters.load_test.virtual_users < 1) {
    errors.push('Load test virtual_users must be at least 1');
  }

  if (CONFIG.test_parameters.load_test.duration_minutes < 1) {
    errors.push('Load test duration_minutes must be at least 1');
  }

  // Validate thresholds
  if (
    CONFIG.thresholds.http_req_failed_rate < 0 ||
    CONFIG.thresholds.http_req_failed_rate > 1
  ) {
    errors.push('http_req_failed_rate must be between 0 and 1');
  }

  if (CONFIG.thresholds.http_req_duration_p95 < 1) {
    errors.push('http_req_duration_p95 must be positive');
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
}

// Configuration summary
export function getConfigSummary() {
  return {
    environment: CONFIG.environment,
    base_url: CONFIG.endpoints.base_url,
    api_key_prefix: CONFIG.auth.api_key.split('_')[0],
    load_test_config: {
      virtual_users: CONFIG.test_parameters.load_test.virtual_users,
      duration_minutes: CONFIG.test_parameters.load_test.duration_minutes,
      target_rps: CONFIG.test_parameters.load_test.target_rps,
    },
    pdf_batch_config: {
      target_size_gb: CONFIG.test_parameters.pdf_batch_test.target_size_gb,
      duration_minutes: CONFIG.test_parameters.pdf_batch_test.duration_minutes,
      virtual_users: CONFIG.test_parameters.pdf_batch_test.virtual_users,
    },
    performance_thresholds: {
      p95_latency_ms: CONFIG.thresholds.http_req_duration_p95,
      error_rate_max: CONFIG.thresholds.http_req_failed_rate,
      success_rate_min: CONFIG.thresholds.load_test.overall_success_rate_min,
    },
  };
}

// Export individual configurations for easy importing
export const ENDPOINTS = CONFIG.endpoints;
export const AUTH = CONFIG.auth;
export const TEST_PARAMETERS = CONFIG.test_parameters;
export const THRESHOLDS = CONFIG.thresholds;
export const MONITORING = CONFIG.monitoring;
export const TEST_DATA = CONFIG.test_data;
export const RETRY = CONFIG.retry;
export const TIMEOUT = CONFIG.timeout;
export const RATE_LIMITING = CONFIG.rate_limiting;
export const RESOURCE_LIMITS = CONFIG.resource_limits;
export const LOGGING = CONFIG.logging;
export const STORAGE = CONFIG.storage;
export const DATABASE = CONFIG.database;
export const QUEUE = CONFIG.queue;

// Default export
export default CONFIG;
