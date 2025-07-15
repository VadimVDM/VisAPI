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
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    apiKeyPrefix: process.env.API_KEY_PREFIX || 'visapi_',
    apiKeyExpiryDays: parseInt(process.env.API_KEY_EXPIRY_DAYS, 10) || 90,
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
});
