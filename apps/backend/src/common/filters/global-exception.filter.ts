import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
// Import from fastify directly for types (already installed as dependency)
type FastifyRequest = any;
type FastifyReply = any;
import { 
  ALL_ERROR_CODES, 
  ErrorCodeHelper, 
  SYSTEM_ERRORS,
  VALIDATION_ERRORS,
  AUTH_ERRORS,
  EXTERNAL_ERRORS 
} from '../constants/error-codes';
import { getCorrelationId, getRequestMethod, getRequestUrl } from '@visapi/backend-http-types';

// Type for exception response
interface ExceptionResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Enhanced Problem Details interface (RFC 7807)
 */
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  correlationId?: string;
  timestamp: string;
  code?: string;
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
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // Extract correlation ID using utility function
    const correlationId = getCorrelationId(request);

    // Map exception to structured error response
    const errorResponse = this.mapExceptionToError(exception);

    // Create Problem Details response
    const problemDetails: ProblemDetails = {
      type: errorResponse.type,
      title: errorResponse.title,
      status: errorResponse.status,
      detail: errorResponse.detail,
      instance: getRequestUrl(request) || '/',
      correlationId,
      timestamp: new Date().toISOString(),
      code: errorResponse.code,
    };

    // Add validation errors if present
    if (errorResponse.errors) {
      problemDetails.errors = errorResponse.errors;
    }

    // Log the error
    this.logError(exception, problemDetails);

    // Set correlation headers for client debugging
    if (correlationId) {
      response.header('X-Request-Id', correlationId);
      response.header('X-Correlation-Id', correlationId);
    }

    // Send Fastify response with RFC 7807 content type
    response
      .code(errorResponse.status)
      .type('application/problem+json')
      .send(problemDetails);
  }

  /**
   * Map exception to structured error response with proper error codes
   */
  private mapExceptionToError(exception: unknown): {
    type: string;
    title: string;
    status: number;
    detail: string;
    code: string;
    errors?: Record<string, string[]>;
  } {
    // Handle HTTP exceptions from NestJS
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      let message = 'An error occurred';
      let errors: Record<string, string[]> | undefined;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as ExceptionResponse;
        message = responseObj.message || message;
        errors = responseObj.errors;
      }

      // Map specific HTTP status codes to our error catalog
      switch (status) {
        case HttpStatus.BAD_REQUEST:
          const validationError = errors ? VALIDATION_ERRORS.SCHEMA_VALIDATION_FAILED : VALIDATION_ERRORS.INVALID_REQUEST_BODY;
          return {
            ...validationError,
            detail: message,
            errors,
          };
        
        case HttpStatus.UNAUTHORIZED:
          return {
            ...AUTH_ERRORS.INVALID_API_KEY,
            detail: message,
          };
        
        case HttpStatus.FORBIDDEN:
          return {
            ...AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
            detail: message,
          };
        
        case HttpStatus.NOT_FOUND:
          return {
            type: 'https://api.visanet.app/problems/resource-not-found',
            title: 'Resource Not Found',
            status: HttpStatus.NOT_FOUND,
            detail: message,
            code: 'RES-404',
          };
        
        case HttpStatus.CONFLICT:
          return {
            type: 'https://api.visanet.app/problems/resource-conflict',
            title: 'Resource Conflict',
            status: HttpStatus.CONFLICT,
            detail: message,
            code: 'BIZ-409',
          };
        
        case HttpStatus.TOO_MANY_REQUESTS:
          return {
            ...AUTH_ERRORS.API_KEY_RATE_LIMITED,
            detail: message,
          };
        
        case HttpStatus.UNPROCESSABLE_ENTITY:
          return {
            ...VALIDATION_ERRORS.SCHEMA_VALIDATION_FAILED,
            detail: message,
            errors,
          };

        default:
          return {
            ...SYSTEM_ERRORS.INTERNAL_SERVER_ERROR,
            status: status >= 500 ? status : HttpStatus.INTERNAL_SERVER_ERROR,
            detail: message,
          };
      }
    }

    // Handle specific error types by name
    if (exception instanceof Error) {
      const message = exception.message;
      
      switch (exception.name) {
        case 'ValidationError':
        case 'ZodError':
          return {
            ...VALIDATION_ERRORS.SCHEMA_VALIDATION_FAILED,
            detail: message,
          };
        
        case 'UnauthorizedError':
          return {
            ...AUTH_ERRORS.INVALID_API_KEY,
            detail: message,
          };
        
        case 'ForbiddenError':
          return {
            ...AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
            detail: message,
          };
        
        case 'NotFoundError':
          return {
            type: 'https://api.visanet.app/problems/resource-not-found',
            title: 'Resource Not Found',
            status: HttpStatus.NOT_FOUND,
            detail: message,
            code: 'RES-404',
          };
        
        case 'ConflictError':
          return {
            type: 'https://api.visanet.app/problems/resource-conflict',
            title: 'Resource Conflict',
            status: HttpStatus.CONFLICT,
            detail: message,
            code: 'BIZ-409',
          };
        
        case 'TimeoutError':
          return {
            ...SYSTEM_ERRORS.REQUEST_TIMEOUT,
            detail: message,
          };
        
        case 'SupabaseError':
        case 'DatabaseError':
          return {
            ...EXTERNAL_ERRORS.SUPABASE_CONNECTION_FAILED,
            detail: 'Database operation failed',
          };
        
        case 'RedisError':
          return {
            ...EXTERNAL_ERRORS.REDIS_CONNECTION_FAILED,
            detail: 'Cache operation failed',
          };
        
        default:
          return {
            ...SYSTEM_ERRORS.INTERNAL_SERVER_ERROR,
            detail: message,
          };
      }
    }

    // Fallback for unknown errors
    return {
      ...SYSTEM_ERRORS.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred',
    };
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(exception: unknown, problemDetails: ProblemDetails): void {
    const logContext = {
      correlationId: problemDetails.correlationId,
      instance: problemDetails.instance,
      status: problemDetails.status,
      code: problemDetails.code,
      type: problemDetails.type,
      detail: problemDetails.detail,
    };

    // Log with appropriate level based on status
    if (problemDetails.status >= 500) {
      // Server errors - log full stack trace
      this.logger.error(
        `Server error: ${problemDetails.title} (${problemDetails.code})`,
        exception instanceof Error ? exception.stack : exception,
        logContext,
      );
    } else if (problemDetails.status >= 400) {
      // Client errors - log as warning without stack trace
      this.logger.warn(`Client error: ${problemDetails.title} (${problemDetails.code})`, logContext);
    } else {
      // Other errors - log as debug
      this.logger.debug(`Error: ${problemDetails.title} (${problemDetails.code})`, logContext);
    }
  }
}
