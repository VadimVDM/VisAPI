// Import with `const Sentry = require("@sentry/nestjs");` if you are using CJS
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn:
    process.env['SENTRY_DSN'] ||
    'https://c7b45c866448d3c4c8e3c480006c9513@o4509449317253120.ingest.de.sentry.io/4509678433927248',

  // Environment
  environment: process.env['NODE_ENV'] || 'development',

  // Performance Monitoring
  tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0, // 10% in production

  // Release tracking
  release: process.env['GIT_SHA'] || 'unknown',

  // Don't send default PII in production
  sendDefaultPii: process.env['NODE_ENV'] !== 'production',

  // Filter out sensitive data
  beforeSend(event) {
    // Filter out sensitive headers
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['x-api-key'];
      delete event.request.headers['cookie'];
    }

    // Filter out sensitive data from error messages
    if (event.exception?.values) {
      event.exception.values.forEach((exception) => {
        if (exception.value) {
          // Redact potential secrets in error messages
          exception.value = exception.value
            .replace(/password=\S+/gi, 'password=[REDACTED]')
            .replace(/api[_-]?key=\S+/gi, 'api_key=[REDACTED]')
            .replace(/token=\S+/gi, 'token=[REDACTED]');
        }
      });
    }

    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Browser-specific errors
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    // Common network errors
    'Network request failed',
    'NetworkError',
    'Failed to fetch',
  ],
});
