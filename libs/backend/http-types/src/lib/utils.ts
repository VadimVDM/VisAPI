import { EnhancedRequest, SanitizableData, SanitizedData } from './http.types';
import { isObject, isPlainObject, isSanitizable } from './guards';

/**
 * Safely get a property from an object with type narrowing
 */
export function getSafeProperty<T = unknown>(
  obj: unknown,
  path: string | string[]
): T | undefined {
  if (!isObject(obj)) return undefined;

  const pathArray = Array.isArray(path) ? path : path.split('.');
  let current: any = obj;

  for (const key of pathArray) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = current[key];
  }

  return current as T;
}

/**
 * Get correlation ID from request
 */
export function getCorrelationId(request: unknown): string | undefined {
  if (!isObject(request)) return undefined;
  
  // Check direct property first
  if ('correlationId' in request && typeof request.correlationId === 'string') {
    return request.correlationId;
  }
  
  // Check headers
  const headers = getSafeProperty<Record<string, string>>(request, 'headers');
  if (headers) {
    return headers['x-correlation-id'] || headers['x-request-id'];
  }
  
  return undefined;
}

/**
 * Get user ID from request
 */
export function getUserId(request: unknown): string | undefined {
  if (!isObject(request)) return undefined;
  
  // Check user.id
  const userId = getSafeProperty<string>(request, ['user', 'id']);
  if (userId) return userId;
  
  // Check userRecord.id (alternative property)
  return getSafeProperty<string>(request, ['userRecord', 'id']);
}

/**
 * Get client IP from request
 */
export function getClientIp(request: unknown): string | undefined {
  if (!isObject(request)) return undefined;
  
  // Direct IP property
  const ip = getSafeProperty<string>(request, 'ip');
  if (ip) return ip;
  
  // From headers
  const headers = getSafeProperty<Record<string, string>>(request, 'headers');
  if (headers) {
    const forwardedFor = headers['x-forwarded-for'];
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    
    const realIp = headers['x-real-ip'];
    if (realIp) return realIp;
  }
  
  // From connection (if exists)
  const connection = getSafeProperty<any>(request, 'connection');
  if (connection && typeof connection === 'object' && 'remoteAddress' in connection) {
    return connection.remoteAddress as string;
  }
  
  return undefined;
}

/**
 * Sanitize sensitive fields from data
 */
export function sanitizeData(
  data: unknown,
  sensitiveFields: string[] = [
    'password',
    'token',
    'secret',
    'authorization',
    'x-api-key',
    'apiKey',
    'apiSecret',
    'credentials',
  ]
): SanitizedData {
  if (!isSanitizable(data)) {
    return '[NON-SERIALIZABLE]';
  }
  
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, sensitiveFields));
  }
  
  if (isPlainObject(data)) {
    const sanitized: Record<string, SanitizedData> = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Check if field is sensitive
      if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value, sensitiveFields);
      }
    }
    
    return sanitized;
  }
  
  return data;
}

/**
 * Parse timeout from request headers
 */
export function parseTimeoutHeader(request: unknown): number | undefined {
  const headers = getSafeProperty<Record<string, string>>(request, 'headers');
  if (!headers) return undefined;
  
  const timeoutHeader = headers['x-timeout'];
  if (!timeoutHeader) return undefined;
  
  const timeout = parseInt(timeoutHeader, 10);
  if (isNaN(timeout) || timeout <= 0) return undefined;
  
  // Cap at 5 minutes maximum
  return Math.min(timeout, 300000);
}

/**
 * Get request method safely
 */
export function getRequestMethod(request: unknown): string | undefined {
  const method = getSafeProperty<string>(request, 'method');
  return typeof method === 'string' ? method.toUpperCase() : undefined;
}

/**
 * Get request URL safely
 */
export function getRequestUrl(request: unknown): string | undefined {
  return getSafeProperty<string>(request, 'url');
}

/**
 * Create a safe request object for logging
 */
export function createSafeRequestLog(request: unknown): Record<string, unknown> {
  return {
    method: getRequestMethod(request),
    url: getRequestUrl(request),
    correlationId: getCorrelationId(request),
    userId: getUserId(request),
    ip: getClientIp(request),
    userAgent: getSafeProperty<string>(request, ['headers', 'user-agent']),
  };
}