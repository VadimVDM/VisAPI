export default () => ({
  node: {
    env: process.env.NODE_ENV || 'development',
  },
  port: parseInt(process.env.PORT, 10) || 3000,
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey:
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    apiKeyPrefix: process.env.API_KEY_PREFIX || 'visapi_',
    apiKeyExpiryDays: parseInt(process.env.API_KEY_EXPIRY_DAYS, 10) || 90,
    allowedEmailDomains: process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || ['visanet.app'],
  },
  frontend: {
    url: process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
  },
  rateLimit: {
    burst: parseInt(process.env.API_RATE_LIMIT_BURST, 10) || 200,
    sustained: parseInt(process.env.API_RATE_LIMIT_SUSTAINED, 10) || 2,
  },
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY, 10) || 10,
    maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES, 10) || 3,
    retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY, 10) || 5000,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'json',
  },
  cgb: {
    apiUrl: process.env.CGB_API_URL || 'https://app.chatgptbuilder.io/api',
    apiKey: process.env.CGB_API_KEY || '',
    timeout: parseInt(process.env.CGB_TIMEOUT, 10) || 30000,
    retryAttempts: parseInt(process.env.CGB_RETRY_ATTEMPTS, 10) || 3,
    cacheTimeout: parseInt(process.env.CGB_CACHE_TIMEOUT, 10) || 3600,
    syncEnabled: process.env.CGB_SYNC_ENABLED === 'true',
    syncDryRun: process.env.CGB_SYNC_DRY_RUN === 'true',
    syncBatchSize: parseInt(process.env.CGB_SYNC_BATCH_SIZE, 10) || 10,
    syncConcurrency: parseInt(process.env.CGB_SYNC_CONCURRENCY, 10) || 5,
    syncDelayMs: parseInt(process.env.CGB_SYNC_DELAY_MS, 10) || 2000,
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    botToken: process.env.SLACK_BOT_TOKEN || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '#alerts',
    enabled: process.env.SLACK_ENABLED === 'true',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'VisAPI <noreply@visanet.app>',
  },
});
