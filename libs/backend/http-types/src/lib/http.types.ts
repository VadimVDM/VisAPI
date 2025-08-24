import { Request, Response } from 'express';
import { IncomingHttpHeaders } from 'http';

/**
 * User information attached to requests
 */
export interface RequestUser {
  id: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

/**
 * Enhanced Express Request with additional properties
 * Used throughout the application for type-safe request handling
 */
export interface EnhancedRequest extends Request {
  correlationId?: string;
  user?: RequestUser;
  userRecord?: RequestUser; // Alternative property used in some controllers
  headers: IncomingHttpHeaders & {
    'x-correlation-id'?: string;
    'x-request-id'?: string;
    'x-api-key'?: string;
    'x-timeout'?: string;
    'user-agent'?: string;
    authorization?: string;
  };
}

/**
 * Enhanced Express Response with additional methods
 */
export interface EnhancedResponse extends Response {
  setHeader(name: string, value: string | number | string[]): this;
}

/**
 * Configuration for timeout settings
 */
export interface TimeoutConfig {
  default: number;
  query: number;
  command: number;
  upload: number;
  report: number;
  webhook: number;
}

/**
 * Error with additional properties
 */
export interface EnhancedError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  details?: unknown;
}

/**
 * Type for data that can be sanitized
 */
export type SanitizableData =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: SanitizableData }
  | SanitizableData[];

/**
 * Type for sanitized data output
 */
export type SanitizedData =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: SanitizedData }
  | SanitizedData[];

/**
 * Metadata for request logging
 */
export interface RequestMetadata {
  correlationId: string;
  method: string;
  url: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  message: string;
  correlationId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: string;
  responseSize?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    statusCode?: number;
  };
  body?: SanitizedData;
  query?: SanitizedData;
}

/**
 * Type guard helper type
 */
export type TypeGuard<T> = (value: unknown) => value is T;
