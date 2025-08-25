import { Test } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

// Mock interfaces for Fastify types
interface MockFastifyReply {
  code: jest.Mock;
  type: jest.Mock;
  header: jest.Mock;
  send: jest.Mock;
}

interface MockFastifyRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: MockFastifyReply;
  let mockRequest: MockFastifyRequest;
  let mockHost: ArgumentsHost;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [GlobalExceptionFilter],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);

    mockResponse = {
      code: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as MockFastifyReply;

    mockRequest = {
      url: '/api/test',
      method: 'POST',
      headers: {
        'x-correlation-id': 'test-correlation-id',
      },
    } as MockFastifyRequest;

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  describe('RFC 7807 Problem Details Format', () => {
    it('should format HTTP exceptions with proper RFC 7807 structure', () => {
      const exception = new HttpException(
        'Test validation error',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.code).toHaveBeenCalledWith(400);
      expect(mockResponse.type).toHaveBeenCalledWith(
        'application/problem+json',
      );
      expect(mockResponse.header).toHaveBeenCalledWith(
        'X-Request-Id',
        'test-correlation-id',
      );
      expect(mockResponse.header).toHaveBeenCalledWith(
        'X-Correlation-Id',
        'test-correlation-id',
      );

      const sentDataCall = mockResponse.send.mock.calls[0] as unknown[];
      const sentData = sentDataCall[0] as Record<string, unknown>;
      expect(sentData).toMatchObject({
        type: expect.stringContaining('https://api.visanet.app/problems/'),
        title: expect.any(String),
        status: 400,
        detail: 'Test validation error',
        instance: '/api/test',
        correlationId: 'test-correlation-id',
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
        ),
        code: expect.stringMatching(/^[A-Z]+-\d{3}$/),
      });
    });

    it('should handle unauthorized errors with proper error code', () => {
      const exception = new HttpException(
        'Invalid API key',
        HttpStatus.UNAUTHORIZED,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.code).toHaveBeenCalledWith(401);

      const sentDataCall = mockResponse.send.mock.calls[0] as unknown[];
      const sentData = sentDataCall[0] as Record<string, unknown>;
      expect(sentData).toMatchObject({
        type: 'https://api.visanet.app/problems/invalid-api-key',
        title: 'Invalid API Key',
        status: 401,
        code: 'AUTH-001',
        detail: 'Invalid API key',
      });
    });

    it('should handle validation errors with field errors', () => {
      const validationException = new HttpException(
        {
          message: 'Validation failed',
          errors: {
            email: ['Email is required', 'Email must be valid'],
            password: ['Password too short'],
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );

      filter.catch(validationException, mockHost);

      expect(mockResponse.code).toHaveBeenCalledWith(422);

      const sentDataCall = mockResponse.send.mock.calls[0] as unknown[];
      const sentData = sentDataCall[0] as Record<string, unknown>;
      expect(sentData).toMatchObject({
        type: 'https://api.visanet.app/problems/schema-validation-failed',
        title: 'Schema Validation Failed',
        status: 422,
        code: 'VAL-004',
        errors: {
          email: ['Email is required', 'Email must be valid'],
          password: ['Password too short'],
        },
      });
    });

    it('should handle generic Error instances with proper mapping', () => {
      const error = new Error('Database connection failed');
      error.name = 'DatabaseError';

      filter.catch(error, mockHost);

      expect(mockResponse.code).toHaveBeenCalledWith(503);

      const sentDataCall = mockResponse.send.mock.calls[0] as unknown[];
      const sentData = sentDataCall[0] as Record<string, unknown>;
      expect(sentData).toMatchObject({
        type: 'https://api.visanet.app/problems/supabase-connection-failed',
        title: 'Database Connection Failed',
        status: 503,
        code: 'EXT-001',
        detail: 'Database operation failed',
      });
    });

    it('should handle unknown errors with fallback', () => {
      const unknownError = 'Some string error';

      filter.catch(unknownError, mockHost);

      expect(mockResponse.code).toHaveBeenCalledWith(500);

      const sentDataCall = mockResponse.send.mock.calls[0] as unknown[];
      const sentData = sentDataCall[0] as Record<string, unknown>;
      expect(sentData).toMatchObject({
        type: 'https://api.visanet.app/problems/internal-server-error',
        title: 'Internal Server Error',
        status: 500,
        code: 'SYS-001',
        detail: 'An unexpected error occurred',
      });
    });

    it('should handle missing correlation ID gracefully', () => {
      mockRequest.headers = {};
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const sentDataCall = mockResponse.send.mock.calls[0] as unknown[];
      const sentData = sentDataCall[0] as Record<string, unknown>;
      expect(sentData.correlationId).toBeUndefined();
      expect(mockResponse.header).not.toHaveBeenCalledWith(
        'X-Request-Id',
        expect.any(String),
      );
    });
  });
});
