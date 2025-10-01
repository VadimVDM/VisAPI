import { z } from 'zod';

// Application metadata - update version as needed
const APPLICATION_NAME = 'VisAPI';
const APPLICATION_VERSION = '1.0.0';

/**
 * Environment enumeration
 */
export const NodeEnv = z.enum(['development', 'test', 'production']);
export type NodeEnv = z.infer<typeof NodeEnv>;

/**
 * Core environment schema with strict validation
 */
export const EnvSchema = z.object({
  // Node environment
  NODE_ENV: NodeEnv.default('development'),

  // Service identification (to distinguish API from Worker)
  SERVICE_NAME: z.string().default('api'),

  // Server configuration
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535)),

  // Build metadata
  GIT_SHA: z.string().optional(),
  BUILD_NUMBER: z.string().optional(),

  // CORS configuration
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3001')
    .transform((val) => val.split(',').map((origin) => origin.trim()))
    .pipe(
      z.array(
        z
          .string()
          .url()
          .or(z.string().regex(/^http:\/\/localhost:\d+$/)),
      ),
    ),

  // Database configuration (deprecated - using Supabase for all database access)
  // DATABASE_URL: z.string().url().optional(), // Removed - use Supabase instead

  // Redis configuration
  REDIS_URL: z
    .string()
    .refine((url) => {
      // Accept both redis:// and rediss:// in all environments
      // Railway internal connections are secure without TLS
      return url.startsWith('redis://') || url.startsWith('rediss://');
    }, 'Redis URL must start with redis:// or rediss://')
    .optional(),
  REDIS_PUBLIC_URL: z.string().url().optional(),

  // Supabase configuration (required)
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  // Authentication configuration
  JWT_SECRET: z.string().min(32).optional(),
  API_KEY_PREFIX: z.string().default('visapi_'),
  API_KEY_EXPIRY_DAYS: z
    .string()
    .default('90')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(365)),
  ALLOWED_EMAIL_DOMAINS: z
    .string()
    .default('visanet.app')
    .transform((val) => val.split(',').map((domain) => domain.trim()))
    .pipe(
      z.array(z.string().regex(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i)),
    ),

  // Frontend configuration
  FRONTEND_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Rate limiting configuration
  API_RATE_LIMIT_BURST: z
    .string()
    .default('200')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1)),
  API_RATE_LIMIT_SUSTAINED: z
    .string()
    .default('2')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1)),

  // Queue configuration
  QUEUE_CONCURRENCY: z
    .string()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100)),
  QUEUE_MAX_RETRIES: z
    .string()
    .default('3')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0).max(10)),
  QUEUE_RETRY_DELAY: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(100)),

  // Logging configuration
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'trace'])
    .default('debug'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // CBB integration
  CBB_API_URL: z.string().url().default('https://app.chatgptbuilder.io/api'),
  CBB_API_KEY: z.string().optional(),
  CBB_TIMEOUT: z
    .string()
    .default('30000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1000).max(120000)),
  CBB_RETRY_ATTEMPTS: z
    .string()
    .default('3')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0).max(5)),
  CBB_CACHE_TIMEOUT: z
    .string()
    .default('3600')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0)),
  CBB_SYNC_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  CBB_SYNC_DRY_RUN: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  CBB_SYNC_BATCH_SIZE: z
    .string()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100)),
  CBB_SYNC_CONCURRENCY: z
    .string()
    .default('5')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(20)),
  CBB_SYNC_DELAY_MS: z
    .string()
    .default('2000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(100)),

  // CBB Template mappings (optional)
  CBB_TEMPLATE_VISA_APPROVED: z.string().optional(),
  CBB_TEMPLATE_VISA_REJECTED: z.string().optional(),
  CBB_TEMPLATE_DOCUMENT_REQUEST: z.string().optional(),
  CBB_TEMPLATE_APPOINTMENT_REMINDER: z.string().optional(),
  CBB_TEMPLATE_STATUS_UPDATE: z.string().optional(),

  // Slack integration
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  SLACK_DEFAULT_CHANNEL: z.string().default('#alerts'),
  SLACK_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  // Resend email service
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z
    .string()
    .email()
    .or(z.string().regex(/^.+\s<.+@.+>$/))
    .default('VisAPI <noreply@visanet.app>'),

  // WhatsApp configuration
  WHATSAPP_MESSAGE_DELAY_MS: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0)),
  WHATSAPP_PROCESS_DELAY_MS: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0)),

  // WhatsApp Business API (Meta) configuration
  WABA_PHONE_NUMBER_ID: z.string().optional(),
  WABA_BUSINESS_ID: z.string().optional(),
  WABA_ACCESS_TOKEN: z.string().optional(),
  WABA_WEBHOOK_SECRET: z.string().optional(), // Meta App Secret for webhook signature verification
  WABA_APP_SECRET: z.string().optional(), // Deprecated - use WABA_WEBHOOK_SECRET
  WABA_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

  // Zapier integration
  ZAPIER_WEBHOOK_URL: z.string().url().optional(),

  // Workflow configuration
  WORKFLOW_PROCESSING_DELAY_MS: z
    .string()
    .default('1000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0)),
  WORKFLOW_BATCH_PROCESSING_SIZE: z
    .string()
    .default('50')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(1000)),

  // Captcha solver configuration
  CAPTCHA_SOLVER_PROVIDER: z
    .enum(['none', 'capsolver', '2captcha'])
    .default('none'),
  CAPTCHA_SOLVER_API_KEY: z.string().optional(),
  CAPTCHA_SOLVER_TIMEOUT_MS: z
    .string()
    .default('180000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(10000).max(600000)),
  CAPTCHA_SOLVER_POLL_INTERVAL_MS: z
    .string()
    .default('4000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1000).max(20000)),

  // Airtable integration
  AIRTABLE_API_KEY: z.string().optional(),
  AIRTABLE_BASE_ID: z.string().optional(),
  AIRTABLE_TABLE_ID: z.string().optional(),
  AIRTABLE_VIEW_ID: z.string().optional(),

  // Grafana monitoring
  GRAFANA_REMOTE_WRITE_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  GRAFANA_PROMETHEUS_URL: z.string().url().optional(),
  GRAFANA_PROMETHEUS_USERNAME: z.string().optional(),
  GRAFANA_PROMETHEUS_PASSWORD: z.string().optional(),
  GRAFANA_PUSH_INTERVAL_MS: z
    .string()
    .default('30000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1000)),

  // Sentry error tracking (optional, no default DSN)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z
    .string()
    .default('0.1')
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(0).max(1)),

  // Swagger documentation security
  SWAGGER_USERNAME: z.string().default('admin'),
  SWAGGER_PASSWORD: z.string().optional(),
  SWAGGER_API_KEYS: z
    .string()
    .transform((val) => val.split(',').map((key) => key.trim()))
    .pipe(z.array(z.string()))
    .optional(),
});

export type EnvSchema = z.infer<typeof EnvSchema>;

/**
 * Validate environment variables with detailed error messages
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): EnvSchema {
  try {
    return EnvSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => {
          const path = issue.path.join('.');
          const message = issue.message;
          return `  - ${path}: ${message}`;
        })
        .join('\n');

      throw new Error(
        `Environment validation failed:\n${issues}\n\n` +
          `Please check your environment variables and ensure all required values are set correctly.`,
      );
    }
    throw error;
  }
}

/**
 * Production-specific validation rules
 */
export function validateProductionEnv(config: EnvSchema): void {
  const errors: string[] = [];

  if (config.NODE_ENV === 'production') {
    // No DATABASE_URL needed - all services use Supabase

    if (!config.REDIS_URL) {
      errors.push('REDIS_URL is required in production');
    }
    // Railway internal Redis connections are secure without TLS
    // Both redis:// (internal) and rediss:// (external) are acceptable

    // JWT_SECRET is only needed for JWT-based auth, which we're not using (API keys instead)
    // Keep as warning instead of error
    if (!config.JWT_SECRET) {
      console.warn(
        '⚠️  JWT_SECRET not configured - JWT authentication disabled (API keys only)',
      );
    }

    // Warn about missing optional services
    if (!config.SENTRY_DSN) {
      console.warn('⚠️  SENTRY_DSN not configured - error tracking disabled');
    }

    if (!config.RESEND_API_KEY) {
      console.warn(
        '⚠️  RESEND_API_KEY not configured - email service disabled',
      );
    }

    if (!config.SLACK_WEBHOOK_URL && !config.SLACK_BOT_TOKEN) {
      console.warn('⚠️  Slack integration not configured');
    }

    // Swagger documentation security - warn instead of error since it's optional
    if (!config.SWAGGER_PASSWORD || config.SWAGGER_PASSWORD.length < 8) {
      console.warn(
        '⚠️  SWAGGER_PASSWORD not configured or too short - Swagger documentation will be disabled in production',
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Production environment validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  }
}

/**
 * Get validated configuration
 */
export function getValidatedConfig() {
  const env = validateEnv();

  // Additional production checks
  validateProductionEnv(env);

  // Transform to nested configuration object
  return {
    application: {
      name: APPLICATION_NAME,
      version: APPLICATION_VERSION,
    },
    node: {
      env: env.NODE_ENV,
    },
    port: env.PORT,
    git: {
      sha: env.GIT_SHA,
    },
    build: {
      number: env.BUILD_NUMBER,
    },
    cors: {
      origin: env.CORS_ORIGIN,
    },
    // Database access through Supabase only (no direct DATABASE_URL)
    redis: {
      // Use public URL if available (for Railway Worker service)
      // Falls back to internal URL if public URL is not set
      url: env.REDIS_PUBLIC_URL || env.REDIS_URL,
      publicUrl: env.REDIS_PUBLIC_URL,
    },
    supabase: {
      url: env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      anonKey: env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    auth: {
      jwtSecret: env.JWT_SECRET,
      apiKeyPrefix: env.API_KEY_PREFIX,
      apiKeyExpiryDays: env.API_KEY_EXPIRY_DAYS,
      allowedEmailDomains: env.ALLOWED_EMAIL_DOMAINS,
    },
    frontend: {
      url: env.FRONTEND_URL || env.NEXT_PUBLIC_APP_URL,
    },
    rateLimit: {
      burst: env.API_RATE_LIMIT_BURST,
      sustained: env.API_RATE_LIMIT_SUSTAINED,
    },
    queue: {
      concurrency: env.QUEUE_CONCURRENCY,
      maxRetries: env.QUEUE_MAX_RETRIES,
      retryDelay: env.QUEUE_RETRY_DELAY,
    },
    logging: {
      level: env.LOG_LEVEL,
      format: env.LOG_FORMAT,
    },
    cbb: {
      apiUrl: env.CBB_API_URL,
      apiKey: env.CBB_API_KEY || '',
      timeout: env.CBB_TIMEOUT,
      retryAttempts: env.CBB_RETRY_ATTEMPTS,
      cacheTimeout: env.CBB_CACHE_TIMEOUT,
      syncEnabled: env.CBB_SYNC_ENABLED,
      syncDryRun: env.CBB_SYNC_DRY_RUN,
      syncBatchSize: env.CBB_SYNC_BATCH_SIZE,
      syncConcurrency: env.CBB_SYNC_CONCURRENCY,
      syncDelayMs: env.CBB_SYNC_DELAY_MS,
      // Template mappings (optional)
      templateVisaApproved: env.CBB_TEMPLATE_VISA_APPROVED,
      templateVisaRejected: env.CBB_TEMPLATE_VISA_REJECTED,
      templateDocumentRequest: env.CBB_TEMPLATE_DOCUMENT_REQUEST,
      templateAppointmentReminder: env.CBB_TEMPLATE_APPOINTMENT_REMINDER,
      templateStatusUpdate: env.CBB_TEMPLATE_STATUS_UPDATE,
    },
    slack: {
      webhookUrl: env.SLACK_WEBHOOK_URL || '',
      botToken: env.SLACK_BOT_TOKEN || '',
      signingSecret: env.SLACK_SIGNING_SECRET || '',
      defaultChannel: env.SLACK_DEFAULT_CHANNEL,
      enabled: env.SLACK_ENABLED,
    },
    resend: {
      apiKey: env.RESEND_API_KEY || '',
      fromEmail: env.RESEND_FROM_EMAIL,
    },
    whatsapp: {
      messageDelayMs: env.WHATSAPP_MESSAGE_DELAY_MS,
      processDelayMs: env.WHATSAPP_PROCESS_DELAY_MS,
    },
    waba: {
      phoneNumberId: env.WABA_PHONE_NUMBER_ID,
      businessId: env.WABA_BUSINESS_ID,
      accessToken: env.WABA_ACCESS_TOKEN,
      webhookSecret: env.WABA_WEBHOOK_SECRET,
      appSecret: env.WABA_APP_SECRET,
      webhookVerifyToken: env.WABA_WEBHOOK_VERIFY_TOKEN,
    },
    zapier: {
      webhookUrl: env.ZAPIER_WEBHOOK_URL,
    },
    workflow: {
      processingDelayMs: env.WORKFLOW_PROCESSING_DELAY_MS,
      batchProcessingSize: env.WORKFLOW_BATCH_PROCESSING_SIZE,
    },
    captcha: {
      solverProvider: env.CAPTCHA_SOLVER_PROVIDER,
      apiKey: env.CAPTCHA_SOLVER_API_KEY,
      timeoutMs: env.CAPTCHA_SOLVER_TIMEOUT_MS,
      pollIntervalMs: env.CAPTCHA_SOLVER_POLL_INTERVAL_MS,
    },
    airtable: {
      apiKey: env.AIRTABLE_API_KEY,
      baseId: env.AIRTABLE_BASE_ID,
      tableId: env.AIRTABLE_TABLE_ID,
      viewId: env.AIRTABLE_VIEW_ID,
    },
    monitoring: {
      grafana: {
        remoteWriteEnabled: env.GRAFANA_REMOTE_WRITE_ENABLED,
        prometheusUrl: env.GRAFANA_PROMETHEUS_URL,
        prometheusUsername: env.GRAFANA_PROMETHEUS_USERNAME,
        prometheusPassword: env.GRAFANA_PROMETHEUS_PASSWORD,
        pushIntervalMs: env.GRAFANA_PUSH_INTERVAL_MS,
      },
      sentry: {
        dsn: env.SENTRY_DSN,
        environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
        release: env.SENTRY_RELEASE || env.GIT_SHA,
        tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
      },
    },
    swagger: {
      username: env.SWAGGER_USERNAME,
      password: env.SWAGGER_PASSWORD,
      apiKeys: env.SWAGGER_API_KEYS,
    },
  };
}

export type ValidatedConfig = ReturnType<typeof getValidatedConfig>;
