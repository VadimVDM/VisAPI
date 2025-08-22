import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { EnhancedRequest, EnhancedResponse } from '@visapi/backend-http-types';

type MockRequest = Partial<EnhancedRequest> & {
  method: string;
  url: string;
  ip: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  user?: { id: string };
  correlationId?: string;
  connection?: { remoteAddress: string };
};

type MockResponse = Partial<EnhancedResponse> & {
  statusCode: number;
  setHeader: jest.Mock;
};

interface MockExecutionContext extends Partial<ExecutionContext> {
  switchToHttp: () => {
    getRequest: <T = MockRequest>() => T;
    getResponse: <T = MockResponse>() => T;
  };
}

interface MockCallHandler extends Partial<CallHandler> {
  handle: jest.Mock;
}

interface LogCall {
  body: Record<string, unknown>;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  user?: { id: string };
}

interface InterceptorWithLogger {
  logger: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
}

interface TestError extends Error {
  status?: number;
}

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: MockExecutionContext;
  let mockCallHandler: MockCallHandler;
  let mockRequest: MockRequest;
  let mockResponse: MockResponse;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    
    mockRequest = {
      method: 'GET',
      url: '/api/v1/orders',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Jest Test',
        'x-correlation-id': 'test-correlation-123',
      },
      body: {},
      query: {},
      user: { id: 'user-123' },
    };

    mockResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };

    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  describe('Correlation ID Management', () => {
    it('should use existing correlation ID from headers', (done) => {
      // Arrange
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: true }));

      // Act
      interceptor.intercept(mockExecutionContext as ExecutionContext, mockCallHandler as CallHandler).subscribe({
        next: () => {
          // Assert
          expect(mockRequest.correlationId).toBe('test-correlation-123');
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'x-correlation-id',
            'test-correlation-123',
          );
          done();
        },
      });
    });

    it('should generate new correlation ID when not provided', (done) => {
      // Arrange
      delete mockRequest.headers['x-correlation-id'];
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: true }));

      // Act
      interceptor.intercept(mockExecutionContext as ExecutionContext, mockCallHandler as CallHandler).subscribe({
        next: () => {
          // Assert
          expect(mockRequest.correlationId).toBeDefined();
          expect(mockRequest.correlationId).toMatch(/^[a-f0-9-]+$/);
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'x-correlation-id',
            mockRequest.correlationId,
          );
          done();
        },
      });
    });
  });

  describe('Sensitive Data Sanitization', () => {
    it('should redact sensitive fields from logs', (done) => {
      // Arrange
      mockRequest.body = {
        username: 'testuser',
        password: 'secret123',
        token: 'jwt-token-here',
        data: 'normal-data',
      };
      
      mockRequest.headers['x-api-key'] = 'secret-api-key';
      
      // Spy on logger with proper typing
      const logSpy = jest.spyOn((interceptor as unknown as InterceptorWithLogger).logger, 'log');
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: true }));

      // Act
      interceptor.intercept(mockExecutionContext as ExecutionContext, mockCallHandler as CallHandler).subscribe({
        next: () => {
          // Assert
          const logCall = logSpy.mock.calls[0][0] as LogCall;
          expect(logCall.body.password).toBe('[REDACTED]');
          expect(logCall.body.token).toBe('[REDACTED]');
          expect(logCall.body.username).toBe('testuser');
          expect(logCall.body.data).toBe('normal-data');
          done();
        },
      });
    });

    it('should sanitize nested objects', (done) => {
      // Arrange
      mockRequest.body = {
        user: {
          name: 'Test User',
          credentials: {
            password: 'secret',
            apiSecret: 'api-secret-key',
          },
        },
      };
      
      const logSpy = jest.spyOn((interceptor as unknown as InterceptorWithLogger).logger, 'log');
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: true }));

      // Act
      interceptor.intercept(mockExecutionContext as ExecutionContext, mockCallHandler as CallHandler).subscribe({
        next: () => {
          // Assert
          const logCall = logSpy.mock.calls[0][0] as LogCall;
          const userData = logCall.body.user as {
            name: string;
            credentials: {
              password: string;
              apiSecret: string;
            };
          };
          expect(userData.name).toBe('Test User');
          expect(userData.credentials.password).toBe('[REDACTED]');
          expect(userData.credentials.apiSecret).toBe('[REDACTED]');
          done();
        },
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should log warning for slow requests', (done) => {
      // Arrange
      const warnSpy = jest.spyOn((interceptor as unknown as InterceptorWithLogger).logger, 'warn');
      
      // Mock Date.now to simulate time passing
      const originalDateNow = Date.now;
      const startTime = originalDateNow();
      let callCount = 0;
      Date.now = jest.fn(() => {
        // First call is at start, second call is at end
        if (callCount++ === 0) {
          return startTime;
        }
        return startTime + 1100; // Simulate 1100ms elapsed
      });

      // Return observable directly
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: true }));

      // Act
      interceptor.intercept(mockExecutionContext as ExecutionContext, mockCallHandler as CallHandler).subscribe({
        next: () => {
          // Assert
          expect(warnSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Slow request detected',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              correlationId: expect.any(String),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              responseTime: expect.stringContaining('ms'),
            }),
          );
          
          // Cleanup
          Date.now = originalDateNow;
          done();
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should log errors with full context', (done) => {
      // Arrange
      const error: TestError = new Error('Test error') as TestError;
      error.stack = 'Error stack trace';
      error.status = 500;
      
      const errorSpy = jest.spyOn((interceptor as unknown as InterceptorWithLogger).logger, 'error');
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      // Act
      interceptor.intercept(mockExecutionContext as ExecutionContext, mockCallHandler as CallHandler).subscribe({
        error: (err) => {
          // Assert
          expect(errorSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Request failed',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              correlationId: expect.any(String),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              error: expect.objectContaining({
                name: 'Error',
                message: 'Test error',
                stack: 'Error stack trace',
                statusCode: 500,
              }),
            }),
          );
          expect(err).toBe(error);
          done();
        },
      });
    });
  });
});