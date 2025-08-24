/**
 * Comprehensive Error Code Catalog for VisAPI
 * Following RFC 7807 Problem Details specification
 */

export interface ErrorCodeDefinition {
  code: string;
  type: string;
  title: string;
  status: number;
  description: string;
}

/**
 * Authentication & Authorization Errors (AUTH-xxx)
 */
export const AUTH_ERRORS = {
  INVALID_API_KEY: {
    code: 'AUTH-001',
    type: 'https://api.visanet.app/problems/invalid-api-key',
    title: 'Invalid API Key',
    status: 401,
    description: 'The provided API key is invalid or expired',
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'AUTH-002',
    type: 'https://api.visanet.app/problems/insufficient-permissions',
    title: 'Insufficient Permissions',
    status: 403,
    description: 'The API key does not have required permissions for this operation',
  },
  API_KEY_RATE_LIMITED: {
    code: 'AUTH-003',
    type: 'https://api.visanet.app/problems/rate-limited',
    title: 'Rate Limit Exceeded',
    status: 429,
    description: 'Too many requests from this API key',
  },
  SESSION_EXPIRED: {
    code: 'AUTH-004',
    type: 'https://api.visanet.app/problems/session-expired',
    title: 'Session Expired',
    status: 401,
    description: 'The authentication session has expired',
  },
} as const;

/**
 * Validation Errors (VAL-xxx)
 */
export const VALIDATION_ERRORS = {
  INVALID_REQUEST_BODY: {
    code: 'VAL-001',
    type: 'https://api.visanet.app/problems/invalid-request-body',
    title: 'Invalid Request Body',
    status: 400,
    description: 'The request body contains invalid or missing fields',
  },
  INVALID_QUERY_PARAMS: {
    code: 'VAL-002',
    type: 'https://api.visanet.app/problems/invalid-query-params',
    title: 'Invalid Query Parameters',
    status: 400,
    description: 'One or more query parameters are invalid',
  },
  INVALID_PATH_PARAMS: {
    code: 'VAL-003',
    type: 'https://api.visanet.app/problems/invalid-path-params',
    title: 'Invalid Path Parameters',
    status: 400,
    description: 'One or more path parameters are invalid',
  },
  SCHEMA_VALIDATION_FAILED: {
    code: 'VAL-004',
    type: 'https://api.visanet.app/problems/schema-validation-failed',
    title: 'Schema Validation Failed',
    status: 422,
    description: 'The request data does not match the required schema',
  },
} as const;

/**
 * Resource Errors (RES-xxx)
 */
export const RESOURCE_ERRORS = {
  ORDER_NOT_FOUND: {
    code: 'RES-001',
    type: 'https://api.visanet.app/problems/order-not-found',
    title: 'Order Not Found',
    status: 404,
    description: 'The requested order does not exist',
  },
  WORKFLOW_NOT_FOUND: {
    code: 'RES-002',
    type: 'https://api.visanet.app/problems/workflow-not-found',
    title: 'Workflow Not Found',
    status: 404,
    description: 'The requested workflow does not exist',
  },
  USER_NOT_FOUND: {
    code: 'RES-003',
    type: 'https://api.visanet.app/problems/user-not-found',
    title: 'User Not Found',
    status: 404,
    description: 'The requested user does not exist',
  },
  TEMPLATE_NOT_FOUND: {
    code: 'RES-004',
    type: 'https://api.visanet.app/problems/template-not-found',
    title: 'WhatsApp Template Not Found',
    status: 404,
    description: 'The requested WhatsApp template does not exist',
  },
} as const;

/**
 * Business Logic Errors (BIZ-xxx)
 */
export const BUSINESS_ERRORS = {
  ORDER_ALREADY_PROCESSED: {
    code: 'BIZ-001',
    type: 'https://api.visanet.app/problems/order-already-processed',
    title: 'Order Already Processed',
    status: 409,
    description: 'This order has already been processed and cannot be modified',
  },
  INVALID_ORDER_STATUS: {
    code: 'BIZ-002',
    type: 'https://api.visanet.app/problems/invalid-order-status',
    title: 'Invalid Order Status Transition',
    status: 422,
    description: 'The requested status change is not allowed for this order',
  },
  CBB_SYNC_FAILED: {
    code: 'BIZ-003',
    type: 'https://api.visanet.app/problems/cbb-sync-failed',
    title: 'CBB Synchronization Failed',
    status: 502,
    description: 'Failed to synchronize data with CBB system',
  },
  WHATSAPP_MESSAGE_FAILED: {
    code: 'BIZ-004',
    type: 'https://api.visanet.app/problems/whatsapp-message-failed',
    title: 'WhatsApp Message Failed',
    status: 502,
    description: 'Failed to send WhatsApp message',
  },
  TEMPLATE_NOT_APPROVED: {
    code: 'BIZ-005',
    type: 'https://api.visanet.app/problems/template-not-approved',
    title: 'WhatsApp Template Not Approved',
    status: 422,
    description: 'The WhatsApp template is not approved by Meta and cannot be used',
  },
  DUPLICATE_ORDER: {
    code: 'BIZ-006',
    type: 'https://api.visanet.app/problems/duplicate-order',
    title: 'Duplicate Order',
    status: 409,
    description: 'An order with this identifier already exists',
  },
} as const;

/**
 * External Service Errors (EXT-xxx)
 */
export const EXTERNAL_ERRORS = {
  SUPABASE_CONNECTION_FAILED: {
    code: 'EXT-001',
    type: 'https://api.visanet.app/problems/supabase-connection-failed',
    title: 'Database Connection Failed',
    status: 503,
    description: 'Unable to connect to the database',
  },
  REDIS_CONNECTION_FAILED: {
    code: 'EXT-002',
    type: 'https://api.visanet.app/problems/redis-connection-failed',
    title: 'Cache Service Unavailable',
    status: 503,
    description: 'Unable to connect to the cache service',
  },
  VIZI_WEBHOOK_INVALID: {
    code: 'EXT-003',
    type: 'https://api.visanet.app/problems/vizi-webhook-invalid',
    title: 'Invalid Vizi Webhook',
    status: 400,
    description: 'The Vizi webhook payload is invalid or malformed',
  },
  WHATSAPP_API_ERROR: {
    code: 'EXT-004',
    type: 'https://api.visanet.app/problems/whatsapp-api-error',
    title: 'WhatsApp API Error',
    status: 502,
    description: 'Error communicating with WhatsApp Business API',
  },
  CBB_API_ERROR: {
    code: 'EXT-005',
    type: 'https://api.visanet.app/problems/cbb-api-error',
    title: 'CBB API Error',
    status: 502,
    description: 'Error communicating with CBB API',
  },
} as const;

/**
 * System Errors (SYS-xxx)
 */
export const SYSTEM_ERRORS = {
  INTERNAL_SERVER_ERROR: {
    code: 'SYS-001',
    type: 'https://api.visanet.app/problems/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    description: 'An unexpected error occurred while processing the request',
  },
  SERVICE_UNAVAILABLE: {
    code: 'SYS-002',
    type: 'https://api.visanet.app/problems/service-unavailable',
    title: 'Service Unavailable',
    status: 503,
    description: 'The service is temporarily unavailable',
  },
  REQUEST_TIMEOUT: {
    code: 'SYS-003',
    type: 'https://api.visanet.app/problems/request-timeout',
    title: 'Request Timeout',
    status: 504,
    description: 'The request timed out while processing',
  },
  QUEUE_PROCESSING_ERROR: {
    code: 'SYS-004',
    type: 'https://api.visanet.app/problems/queue-processing-error',
    title: 'Queue Processing Error',
    status: 500,
    description: 'Error occurred while processing background job',
  },
} as const;

/**
 * All error codes combined for easy lookup
 */
export const ALL_ERROR_CODES = {
  ...AUTH_ERRORS,
  ...VALIDATION_ERRORS,
  ...RESOURCE_ERRORS,
  ...BUSINESS_ERRORS,
  ...EXTERNAL_ERRORS,
  ...SYSTEM_ERRORS,
} as const;

/**
 * Helper functions for error handling
 */
export class ErrorCodeHelper {
  /**
   * Get error definition by code
   */
  static getByCode(code: string): ErrorCodeDefinition | undefined {
    return Object.values(ALL_ERROR_CODES).find(error => error.code === code);
  }

  /**
   * Get error definition by HTTP status
   */
  static getByStatus(status: number): ErrorCodeDefinition[] {
    return Object.values(ALL_ERROR_CODES).filter(error => error.status === status);
  }

  /**
   * Get error definition by category
   */
  static getByCategory(category: 'AUTH' | 'VAL' | 'RES' | 'BIZ' | 'EXT' | 'SYS'): ErrorCodeDefinition[] {
    return Object.values(ALL_ERROR_CODES).filter(error => error.code.startsWith(category));
  }

  /**
   * Create a standardized error response
   */
  static createErrorResponse(
    errorCode: ErrorCodeDefinition,
    detail?: string,
    instance?: string,
    correlationId?: string,
    errors?: Record<string, string[]>
  ) {
    return {
      type: errorCode.type,
      title: errorCode.title,
      status: errorCode.status,
      detail: detail || errorCode.description,
      instance,
      correlationId,
      timestamp: new Date().toISOString(),
      code: errorCode.code,
      ...(errors && { errors }),
    };
  }
}

/**
 * Type exports for TypeScript support
 */
export type ErrorCode = keyof typeof ALL_ERROR_CODES;
export type AuthErrorCode = keyof typeof AUTH_ERRORS;
export type ValidationErrorCode = keyof typeof VALIDATION_ERRORS;
export type ResourceErrorCode = keyof typeof RESOURCE_ERRORS;
export type BusinessErrorCode = keyof typeof BUSINESS_ERRORS;
export type ExternalErrorCode = keyof typeof EXTERNAL_ERRORS;
export type SystemErrorCode = keyof typeof SYSTEM_ERRORS;