import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Problem Details interface (RFC 7807)
 */
interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  correlationId?: string;
  timestamp?: string;
  path?: string;
  method?: string;
  errors?: Record<string, string[]>;
}

/**
 * Global Exception Filter
 * Transforms all exceptions into consistent Problem Details format (RFC 7807)
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract correlation ID
    const correlationId = (request as any).correlationId || 
                         request.headers['x-correlation-id'] as string;

    // Determine status and message
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let errors: Record<string, string[]> | undefined;
    let type = 'https://httpstatuses.com/500';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        errors = responseObj.errors;
      }
      
      type = `https://httpstatuses.com/${status}`;
    } else if (exception instanceof Error) {
      message = exception.message;
      
      // Handle specific error types
      if (exception.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        type = 'https://httpstatuses.com/400';
      } else if (exception.name === 'UnauthorizedError') {
        status = HttpStatus.UNAUTHORIZED;
        type = 'https://httpstatuses.com/401';
      } else if (exception.name === 'ForbiddenError') {
        status = HttpStatus.FORBIDDEN;
        type = 'https://httpstatuses.com/403';
      } else if (exception.name === 'NotFoundError') {
        status = HttpStatus.NOT_FOUND;
        type = 'https://httpstatuses.com/404';
      } else if (exception.name === 'ConflictError') {
        status = HttpStatus.CONFLICT;
        type = 'https://httpstatuses.com/409';
      }
    }

    // Create Problem Details response
    const problemDetails: ProblemDetails = {
      type,
      title: this.getErrorTitle(status),
      status,
      detail: message,
      instance: request.url,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Add validation errors if present
    if (errors) {
      problemDetails.errors = errors;
    }

    // Log the error
    this.logError(exception, problemDetails);

    // Send response
    response
      .status(status)
      .header('Content-Type', 'application/problem+json')
      .json(problemDetails);
  }

  /**
   * Get human-readable title for HTTP status code
   */
  private getErrorTitle(status: number): string {
    const titles: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };
    
    return titles[status] || 'Error';
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(exception: unknown, problemDetails: ProblemDetails): void {
    const logContext = {
      correlationId: problemDetails.correlationId,
      path: problemDetails.path,
      method: problemDetails.method,
      status: problemDetails.status,
      detail: problemDetails.detail,
    };

    // Log with appropriate level based on status
    if (problemDetails.status >= 500) {
      // Server errors - log full stack trace
      this.logger.error(
        'Server error occurred',
        exception instanceof Error ? exception.stack : exception,
        logContext,
      );
    } else if (problemDetails.status >= 400) {
      // Client errors - log as warning without stack trace
      this.logger.warn('Client error occurred', logContext);
    } else {
      // Other errors - log as debug
      this.logger.debug('Error occurred', logContext);
    }
  }
}