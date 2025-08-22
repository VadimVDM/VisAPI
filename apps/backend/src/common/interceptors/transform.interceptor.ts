import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Response wrapper interface
 * Standardizes all API responses
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  correlationId?: string;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: any;
  };
}

/**
 * TransformInterceptor - Standardizes API responses
 * 
 * Features:
 * - Consistent response structure across all endpoints
 * - Automatic success/error wrapping
 * - Timestamp and correlation ID inclusion
 * - Pagination metadata support
 * - Null value handling
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const correlationId = request.correlationId || request.headers['x-correlation-id'];

    return next.handle().pipe(
      map((data) => {
        // Handle paginated responses
        if (this.isPaginatedResponse(data)) {
          return this.createPaginatedResponse(data, correlationId);
        }

        // Handle error responses
        if (this.isErrorResponse(data)) {
          return this.createErrorResponse(data, correlationId);
        }

        // Handle null/undefined responses
        if (data === null || data === undefined) {
          return this.createEmptyResponse(correlationId);
        }

        // Standard success response
        return this.createSuccessResponse(data, correlationId);
      }),
    );
  }

  /**
   * Check if response is paginated
   */
  private isPaginatedResponse(data: any): boolean {
    return data && 
           typeof data === 'object' && 
           'data' in data && 
           'total' in data &&
           Array.isArray(data.data);
  }

  /**
   * Check if response is an error
   */
  private isErrorResponse(data: any): boolean {
    return data && 
           typeof data === 'object' && 
           'error' in data;
  }

  /**
   * Create standardized success response
   */
  private createSuccessResponse<T>(data: T, correlationId?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      correlationId,
    };
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(error: any, correlationId?: string): ApiResponse<any> {
    return {
      success: false,
      error: error.error || error.message || 'An error occurred',
      message: error.message,
      timestamp: new Date().toISOString(),
      correlationId,
    };
  }

  /**
   * Create response for null/undefined data
   */
  private createEmptyResponse(correlationId?: string): ApiResponse<null> {
    return {
      success: true,
      data: null,
      message: 'No data found',
      timestamp: new Date().toISOString(),
      correlationId,
    };
  }

  /**
   * Create paginated response with metadata
   */
  private createPaginatedResponse(
    paginatedData: any,
    correlationId?: string,
  ): ApiResponse<any> {
    const { data, total, page, limit, ...otherMetadata } = paginatedData;

    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      correlationId,
      metadata: {
        page: page || 1,
        limit: limit || data.length,
        total,
        ...otherMetadata,
      },
    };
  }
}