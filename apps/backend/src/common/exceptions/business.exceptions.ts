import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for business exceptions
 */
export abstract class BusinessException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly code?: string,
  ) {
    super({ message, code }, status);
  }
}

/**
 * Order not found exception
 */
export class OrderNotFoundException extends BusinessException {
  constructor(orderId: string) {
    super(
      `Order with ID ${orderId} not found`,
      HttpStatus.NOT_FOUND,
      'ORDER_NOT_FOUND',
    );
  }
}

/**
 * Order already exists exception
 */
export class OrderAlreadyExistsException extends BusinessException {
  constructor(orderId: string) {
    super(
      `Order with ID ${orderId} already exists`,
      HttpStatus.CONFLICT,
      'ORDER_ALREADY_EXISTS',
    );
  }
}

/**
 * Invalid order data exception
 */
export class InvalidOrderDataException extends BusinessException {
  constructor(
    message: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message, HttpStatus.BAD_REQUEST, 'INVALID_ORDER_DATA');
  }

  getResponse() {
    return {
      message: this.message,
      code: this.code,
      errors: this.errors,
    };
  }
}

/**
 * Workflow not found exception
 */
export class WorkflowNotFoundException extends BusinessException {
  constructor(workflowId: string) {
    super(
      `Workflow with ID ${workflowId} not found`,
      HttpStatus.NOT_FOUND,
      'WORKFLOW_NOT_FOUND',
    );
  }
}

/**
 * Workflow execution failed exception
 */
export class WorkflowExecutionException extends BusinessException {
  constructor(workflowId: string, reason: string) {
    super(
      `Workflow ${workflowId} execution failed: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'WORKFLOW_EXECUTION_FAILED',
    );
  }
}

/**
 * API key invalid exception
 */
export class InvalidApiKeyException extends BusinessException {
  constructor() {
    super(
      'Invalid or expired API key',
      HttpStatus.UNAUTHORIZED,
      'INVALID_API_KEY',
    );
  }
}

/**
 * Insufficient permissions exception
 */
export class InsufficientPermissionsException extends BusinessException {
  constructor(requiredScopes: string[]) {
    super(
      `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`,
      HttpStatus.FORBIDDEN,
      'INSUFFICIENT_PERMISSIONS',
    );
  }
}

/**
 * Rate limit exceeded exception
 */
export class RateLimitExceededException extends BusinessException {
  constructor(limit: number, windowMs: number) {
    super(
      `Rate limit exceeded. Maximum ${limit} requests per ${windowMs / 1000} seconds`,
      HttpStatus.TOO_MANY_REQUESTS,
      'RATE_LIMIT_EXCEEDED',
    );
  }
}

/**
 * External service exception
 */
export class ExternalServiceException extends BusinessException {
  constructor(service: string, reason: string) {
    super(
      `External service ${service} failed: ${reason}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'EXTERNAL_SERVICE_ERROR',
    );
  }
}

/**
 * Queue processing exception
 */
export class QueueProcessingException extends BusinessException {
  constructor(jobId: string, reason: string) {
    super(
      `Queue job ${jobId} processing failed: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'QUEUE_PROCESSING_FAILED',
    );
  }
}

/**
 * Cache operation exception
 */
export class CacheOperationException extends BusinessException {
  constructor(operation: string, reason: string) {
    super(
      `Cache ${operation} failed: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'CACHE_OPERATION_FAILED',
    );
  }
}

/**
 * Database operation exception
 */
export class DatabaseOperationException extends BusinessException {
  constructor(operation: string, reason: string) {
    super(
      `Database ${operation} failed: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'DATABASE_OPERATION_FAILED',
    );
  }
}
