import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import {
  EnhancedRequest,
  EnhancedResponse,
  EnhancedError,
  RequestMetadata,
  LogEntry,
} from '@visapi/backend-http-types';
import { isEnhancedError } from '@visapi/backend-http-types';
import {
  sanitizeData,
  getCorrelationId,
  getUserId,
  getClientIp,
  getRequestMethod,
  getRequestUrl,
} from '@visapi/backend-http-types';
import { ConfigService } from '@visapi/core-config';

/**
 * LoggingInterceptor - Enterprise-grade request/response logging
 *
 * Features:
 * - Automatic correlation ID generation and propagation
 * - Request/response timing measurement
 * - Structured logging with context
 * - Error tracking with stack traces
 * - Sensitive data filtering
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private readonly sensitiveFields = [
    'password',
    'token',
    'secret',
    'authorization',
    'x-api-key',
  ];

  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<EnhancedRequest>();
    const response = context.switchToHttp().getResponse<EnhancedResponse>();
    const startTime = Date.now();

    // Generate or extract correlation ID
    const correlationId = getCorrelationId(request) || randomUUID();

    // Attach correlation ID to request and response
    request.correlationId = correlationId;
    // Use Fastify's header() method instead of Express's setHeader()
    if (response.header) {
      response.header('x-correlation-id', correlationId);
    } else if (response.setHeader) {
      // Fallback for Express (testing/local dev)
      response.setHeader('x-correlation-id', correlationId);
    }

    // Extract request metadata
    const requestMetadata: RequestMetadata = {
      correlationId,
      method: getRequestMethod(request) || 'UNKNOWN',
      url: getRequestUrl(request) || '',
      ip: getClientIp(request),
      userAgent: request.headers['user-agent'],
      userId: getUserId(request),
    };

    // Only log incoming requests in development or for non-webhook endpoints
    const isWebhook = requestMetadata.url.includes('/webhooks/');
    const isDevelopment = !this.configService.isProduction;

    if (!isWebhook || isDevelopment) {
      const logEntry: LogEntry = {
        message: 'Incoming request',
        ...requestMetadata,
        body: sanitizeData(request.body, this.sensitiveFields),
        query: sanitizeData(request.query, this.sensitiveFields),
      };
      this.logger.log(logEntry);
    }

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - startTime;

        // Only log successful responses for non-webhooks in production
        if (!isWebhook || isDevelopment) {
          const successLog: LogEntry = {
            message: 'Request completed',
            correlationId,
            method: getRequestMethod(request),
            url: getRequestUrl(request),
            statusCode: response.statusCode,
            responseTime: `${responseTime}ms`,
            responseSize: JSON.stringify(data || {}).length,
          };
          this.logger.log(successLog);
        }

        // Add performance warning for slow requests
        if (responseTime > 1000) {
          const warnLog: LogEntry = {
            message: 'Slow request detected',
            correlationId,
            url: getRequestUrl(request),
            responseTime: `${responseTime}ms`,
          };
          this.logger.warn(warnLog);
        }
      }),
      catchError((error: unknown) => {
        const responseTime = Date.now() - startTime;
        const enhancedError = error as EnhancedError;

        // Log error with full context
        const errorLog: LogEntry = {
          message: 'Request failed',
          correlationId,
          method: getRequestMethod(request),
          url: getRequestUrl(request),
          responseTime: `${responseTime}ms`,
          error: isEnhancedError(error)
            ? {
                name: enhancedError.name || 'Error',
                message: enhancedError.message || 'Unknown error',
                stack: enhancedError.stack,
                statusCode:
                  enhancedError.status || enhancedError.statusCode || 500,
              }
            : {
                name: 'Error',
                message:
                  error instanceof Error
                    ? error.message
                    : 'Unknown error occurred',
                statusCode: 500,
              },
        };
        this.logger.error(errorLog);

        // Re-throw error for further handling
        throw error;
      }),
    );
  }
}
