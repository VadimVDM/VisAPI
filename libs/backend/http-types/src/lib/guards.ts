import {
  EnhancedRequest,
  EnhancedResponse,
  RequestUser,
  EnhancedError,
  SanitizableData,
} from './http.types';

/**
 * Type guard to check if a value is an EnhancedRequest
 */
export function isEnhancedRequest(value: unknown): value is EnhancedRequest {
  return (
    value !== null &&
    typeof value === 'object' &&
    'method' in value &&
    'url' in value &&
    'headers' in value
  );
}

/**
 * Type guard to check if a value is an EnhancedResponse
 */
export function isEnhancedResponse(value: unknown): value is EnhancedResponse {
  return (
    value !== null &&
    typeof value === 'object' &&
    'statusCode' in value &&
    'setHeader' in value &&
    typeof (value as any).setHeader === 'function'
  );
}

/**
 * Type guard to check if a value is a RequestUser
 */
export function isRequestUser(value: unknown): value is RequestUser {
  return (
    value !== null &&
    typeof value === 'object' &&
    'id' in value &&
    typeof (value as RequestUser).id === 'string'
  );
}

/**
 * Type guard to check if a value is an EnhancedError
 */
export function isEnhancedError(value: unknown): value is EnhancedError {
  return (
    value instanceof Error ||
    (value !== null &&
      typeof value === 'object' &&
      'message' in value &&
      typeof (value as any).message === 'string')
  );
}

/**
 * Type guard to check if a value is an object (non-null)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a plain object (not class instance)
 */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (!isObject(value)) return false;

  // Check if it's a plain object (not a class instance)
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Type guard to check if a value can be sanitized
 */
export function isSanitizable(value: unknown): value is SanitizableData {
  if (value === null || value === undefined) return true;

  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return true;

  if (Array.isArray(value)) {
    return value.every((item) => isSanitizable(item));
  }

  if (isPlainObject(value)) {
    return Object.values(value).every((val) => isSanitizable(val));
  }

  return false;
}

/**
 * Type guard to check if a string is a valid HTTP method
 */
export function isValidHttpMethod(
  method: unknown,
): method is 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' {
  return (
    typeof method === 'string' &&
    ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(
      method,
    )
  );
}

/**
 * Type guard to check if a value is a valid timeout number
 */
export function isValidTimeout(value: unknown): value is number {
  return (
    typeof value === 'number' && !isNaN(value) && value > 0 && value <= 300000 // Max 5 minutes
  );
}
