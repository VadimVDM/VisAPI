import { Test } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { FastifyReply, FastifyRequest } from 'fastify';

interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  correlationId?: string;
  timestamp: string;
  code: string;
  errors?: Record<string, string[]>;
}

// Mock interfaces for Fastify types

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockReply: jest.Mocked<FastifyReply>;
  let mockRequest: jest.Mocked<FastifyRequest>;
  let mockHost: jest.Mocked<ArgumentsHost>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [GlobalExceptionFilter],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);

    mockReply = {
      code: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<FastifyReply>;

    mockRequest = {
      url: '/api/test',
      method: 'POST',
      headers: {
        'x-correlation-id': 'test-correlation-id',
      },
    } as unknown as jest.Mocked<FastifyRequest>;

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockReply,
        getRequest: () => mockRequest,
      }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as jest.Mocked<ArgumentsHost>;
  });

  describe('RFC 7807 Problem Details Format', () => {
    it('should format HTTP exceptions with proper RFC 7807 structure', () => {
      const exception = new HttpException(
        'Test validation error',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.code).toHaveBeenCalledWith(400);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.type).toHaveBeenCalledWith('application/problem+json');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.header).toHaveBeenCalledWith(
        'X-Request-Id',
        'test-correlation-id',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.header).toHaveBeenCalledWith(
        'X-Correlation-Id',
        'test-correlation-id',
      );

      const sentData = mockReply.send.mock.calls[0][0] as ProblemDetail;
      expect(sentData).toMatchObject({
        type: expect.stringContaining('https://api.visanet.app/problems/') as unknown,
        title: 'Invalid Request Body',
        status: 400,
        detail: 'Test validation error',
        instance: '/api/test',
        correlationId: 'test-correlation-id',
        timestamp: expect.any(String) as unknown,
        code: expect.any(String) as unknown,
      });
    });

    it('should handle unauthorized errors with proper error code', () => {
      const exception = new HttpException(
        'Invalid API key',
        HttpStatus.UNAUTHORIZED,
      );

      filter.catch(exception, mockHost);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.code).toHaveBeenCalledWith(401);
      const sentData = mockReply.send.mock.calls[0][0] as ProblemDetail;
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

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.code).toHaveBeenCalledWith(422);
      const sentData = mockReply.send.mock.calls[0][0] as ProblemDetail;
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

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.code).toHaveBeenCalledWith(503);
      const sentData = mockReply.send.mock.calls[0][0] as ProblemDetail;
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

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.code).toHaveBeenCalledWith(500);
      const sentData = mockReply.send.mock.calls[0][0] as ProblemDetail;
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

      const sentData = mockReply.send.mock.calls[0][0] as ProblemDetail;
      expect(sentData.correlationId).toBeUndefined();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockReply.header).not.toHaveBeenCalledWith(
        'X-Request-Id',
        expect.any(String),
      );
    });
  });
});
