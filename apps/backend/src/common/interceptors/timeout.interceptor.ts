import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { EnhancedRequest, TimeoutConfig } from '@visapi/backend-http-types';
import {
  getCorrelationId,
  getRequestMethod,
  getRequestUrl,
  parseTimeoutHeader,
} from '@visapi/backend-http-types';

/**
 * TimeoutInterceptor - Manages request timeouts
 *
 * Features:
 * - Configurable timeout periods per endpoint
 * - Graceful timeout handling with proper error messages
 * - Different timeouts for different operation types
 * - Timeout warnings before actual timeout
 * - Correlation ID preservation in timeout errors
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);

  // Default timeout configurations (in milliseconds)
  private readonly timeoutConfig: TimeoutConfig = {
    default: 30000, // 30 seconds default
    query: 10000, // 10 seconds for queries
    command: 30000, // 30 seconds for commands
    upload: 120000, // 2 minutes for file uploads
    report: 60000, // 1 minute for report generation
    webhook: 5000, // 5 seconds for webhook processing
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<EnhancedRequest>();
    const correlationId = getCorrelationId(request);

    // Determine timeout based on endpoint and operation type
    const timeoutDuration = this.getTimeoutDuration(request);

    // Log if request might take long
    if (timeoutDuration > 30000) {
      this.logger.log({
        message: 'Long-running request initiated',
        correlationId,
        url: getRequestUrl(request),
        expectedDuration: `${timeoutDuration / 1000}s`,
      });
    }

    return next.handle().pipe(
      timeout(timeoutDuration),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError) {
          const method = getRequestMethod(request);
          const url = getRequestUrl(request);

          // Log timeout occurrence
          this.logger.error({
            message: 'Request timeout',
            correlationId,
            url,
            method,
            timeout: `${timeoutDuration / 1000}s`,
          });

          // Throw proper NestJS timeout exception
          throw new RequestTimeoutException({
            message: `Request timeout after ${timeoutDuration / 1000} seconds`,
            correlationId,
            endpoint: `${method || 'UNKNOWN'} ${url || ''}`,
            timeout: timeoutDuration,
          });
        }

        // Pass through other errors
        return throwError(() => error);
      }),
    );
  }

  /**
   * Determine appropriate timeout based on request characteristics
   */
  private getTimeoutDuration(request: EnhancedRequest): number {
    const url = getRequestUrl(request)?.toLowerCase() || '';
    const method = getRequestMethod(request);

    // Check for file upload endpoints
    if (url.includes('/upload') || url.includes('/import')) {
      return this.timeoutConfig.upload;
    }

    // Check for report generation endpoints
    if (url.includes('/report') || url.includes('/export')) {
      return this.timeoutConfig.report;
    }

    // Check for webhook endpoints
    if (url.includes('/webhook') || url.includes('/trigger')) {
      return this.timeoutConfig.webhook;
    }

    // Check for CQRS patterns
    if (url.includes('/query') || method === 'GET') {
      return this.timeoutConfig.query;
    }

    if (
      url.includes('/command') ||
      (method && ['POST', 'PUT', 'PATCH'].includes(method))
    ) {
      return this.timeoutConfig.command;
    }

    // Check for specific long-running operations
    if (
      url.includes('/sync') ||
      url.includes('/batch') ||
      url.includes('/bulk')
    ) {
      return this.timeoutConfig.command * 2; // Double timeout for batch operations
    }

    // Custom timeout from header
    const customTimeout = parseTimeoutHeader(request);
    if (customTimeout) {
      return customTimeout;
    }

    return this.timeoutConfig.default;
  }
}
