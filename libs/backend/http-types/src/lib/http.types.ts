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
 * RFC 7807 Problem Details response format
 */
export interface ProblemDetails {
  /** A URI reference that identifies the problem type */
  type: string;
  /** A short, human-readable summary of the problem type */
  title: string;
  /** The HTTP status code */
  status: number;
  /** A human-readable explanation specific to this occurrence */
  detail?: string;
  /** A URI reference that identifies the specific occurrence */
  instance?: string;
  /** Request correlation ID for tracing */
  correlationId?: string;
  /** ISO timestamp of when the error occurred */
  timestamp: string;
  /** Application-specific error code */
  code?: string;
  /** Validation errors (for 400/422 responses) */
  errors?: Record<string, string[]>;
}

/**
 * Base error code definition structure
 */
export interface ErrorCodeDefinition {
  code: string;
  type: string;
  title: string;
  status: number;
  description: string;
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
