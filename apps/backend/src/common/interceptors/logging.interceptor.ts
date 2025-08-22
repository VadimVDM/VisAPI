import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

interface RequestWithUser {
  method: string;
  url: string;
  ip: string;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  user?: { id: string };
  correlationId?: string;
  connection?: { remoteAddress: string };
}

interface ResponseWithHeaders {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
}

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

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest() as RequestWithUser;
    const response = context.switchToHttp().getResponse() as ResponseWithHeaders;
    const startTime = Date.now();
    
    // Generate or extract correlation ID
    const correlationId = request.headers['x-correlation-id'] || 
                          request.headers['x-request-id'] || 
                          uuidv4();
    
    // Attach correlation ID to request and response
    request.correlationId = correlationId;
    response.setHeader('x-correlation-id', correlationId);
    
    // Extract request metadata
    const requestMetadata = {
      correlationId,
      method: request.method,
      url: request.url,
      ip: request.ip || request.connection.remoteAddress,
      userAgent: request.headers['user-agent'],
      userId: request.user?.id,
    };

    // Log incoming request
    this.logger.log({
      message: 'Incoming request',
      ...requestMetadata,
      body: this.sanitizeData(request.body),
      query: this.sanitizeData(request.query),
    });

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - startTime;
        
        // Log successful response
        this.logger.log({
          message: 'Request completed',
          correlationId,
          method: request.method,
          url: request.url,
          statusCode: response.statusCode,
          responseTime: `${responseTime}ms`,
          responseSize: JSON.stringify(data || {}).length,
        });

        // Add performance warning for slow requests
        if (responseTime > 1000) {
          this.logger.warn({
            message: 'Slow request detected',
            correlationId,
            url: request.url,
            responseTime: `${responseTime}ms`,
          });
        }
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        
        // Log error with full context
        this.logger.error({
          message: 'Request failed',
          correlationId,
          method: request.method,
          url: request.url,
          responseTime: `${responseTime}ms`,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            statusCode: error.status || 500,
          },
        });

        // Re-throw error for further handling
        throw error;
      }),
    );
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeData(data: any): any {
    if (!data) return data;
    
    if (typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      
      // Check if field is sensitive
      if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }
    
    return sanitized;
  }
}