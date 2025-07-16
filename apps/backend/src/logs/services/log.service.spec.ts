import { Test, TestingModule } from '@nestjs/testing';
import { LogService } from './log.service';
import { PiiRedactionService } from './pii-redaction.service';
import { SupabaseService } from '@visapi/core-supabase';

describe('LogService', () => {
  let service: LogService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let piiRedactionService: jest.Mocked<PiiRedactionService>;

  const mockSupabaseClient = {
    from: jest.fn(),
  };

  beforeEach(async () => {
    const mockSupabaseService = {
      client: mockSupabaseClient,
      getClient: jest.fn().mockReturnValue(mockSupabaseClient),
    };

    const mockPiiRedactionService = {
      redactPii: jest.fn(),
      redactPiiFromObject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: PiiRedactionService,
          useValue: mockPiiRedactionService,
        },
      ],
    }).compile();

    service = module.get<LogService>(LogService);
    supabaseService = module.get(SupabaseService);
    piiRedactionService = module.get(PiiRedactionService);

    // Mock the logger completely
    const mockLogger = {
      error: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      verbose: jest.fn(),
    };

    service['logger'] = mockLogger as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLog', () => {
    it('should create a log entry with PII redaction', async () => {
      const logEntry = {
        level: 'info' as const,
        message: 'User contacted at john@example.com',
        metadata: { phone: '+1234567890' },
        workflow_id: 'workflow-123',
        job_id: 'job-456',
      };

      piiRedactionService.redactPii.mockReturnValue({
        text: 'User contacted at [EMAIL_REDACTED]',
        piiFound: true,
        redactedFields: ['email'],
      });

      piiRedactionService.redactPiiFromObject.mockReturnValue({
        obj: { phone: '[PHONE_REDACTED]' },
        piiFound: true,
        redactedFields: ['phone_number'],
      });

      const mockQuery = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await service.createLog(logEntry);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('logs');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        level: 'info',
        message: 'User contacted at [EMAIL_REDACTED]',
        metadata: { phone: '[PHONE_REDACTED]' },
        workflow_id: 'workflow-123',
        job_id: 'job-456',
        pii_redacted: true,
        created_at: expect.any(String),
      });
    });

    it('should handle log creation without PII', async () => {
      const logEntry = {
        level: 'info' as const,
        message: 'Operation completed successfully',
        metadata: { duration: 1000 },
      };

      piiRedactionService.redactPii.mockReturnValue({
        text: 'Operation completed successfully',
        piiFound: false,
        redactedFields: [],
      });

      piiRedactionService.redactPiiFromObject.mockReturnValue({
        obj: { duration: 1000 },
        piiFound: false,
        redactedFields: [],
      });

      const mockQuery = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await service.createLog(logEntry);

      expect(mockQuery.insert).toHaveBeenCalledWith({
        level: 'info',
        message: 'Operation completed successfully',
        metadata: { duration: 1000 },
        workflow_id: null,
        job_id: null,
        pii_redacted: false,
        created_at: expect.any(String),
      });
    });

    it('should handle database errors gracefully', async () => {
      const logEntry = {
        level: 'error' as const,
        message: 'Test error',
      };

      piiRedactionService.redactPii.mockReturnValue({
        text: 'Test error',
        piiFound: false,
        redactedFields: [],
      });

      piiRedactionService.redactPiiFromObject.mockReturnValue({
        obj: null,
        piiFound: false,
        redactedFields: [],
      });

      const mockQuery = {
        insert: jest
          .fn()
          .mockResolvedValue({ error: { message: 'Database error' } }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // Should not throw - logging failures should be handled gracefully
      await expect(service.createLog(logEntry)).resolves.not.toThrow();
    });
  });

  describe('getLogs', () => {
    it('should get logs with filters and pagination', async () => {
      const mockLogs = [
        {
          id: 1,
          level: 'info',
          message: 'Test log',
          metadata: null,
          workflow_id: null,
          job_id: null,
          pii_redacted: false,
          created_at: '2025-07-15T10:00:00Z',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockLogs,
          error: null,
          count: 1,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const filters = {
        level: 'info',
        workflow_id: 'workflow-123',
        start_date: '2025-07-15T00:00:00Z',
        end_date: '2025-07-15T23:59:59Z',
        message_contains: 'test',
        limit: 10,
        offset: 0,
      };

      const result = await service.getLogs(filters);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('logs');
      expect(mockQuery.select).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(mockQuery.eq).toHaveBeenCalledWith('level', 'info');
      expect(mockQuery.eq).toHaveBeenCalledWith('workflow_id', 'workflow-123');
      expect(mockQuery.gte).toHaveBeenCalledWith(
        'created_at',
        '2025-07-15T00:00:00Z'
      );
      expect(mockQuery.lte).toHaveBeenCalledWith(
        'created_at',
        '2025-07-15T23:59:59Z'
      );
      expect(mockQuery.ilike).toHaveBeenCalledWith('message', '%test%');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(mockQuery.range).toHaveBeenCalledWith(0, 9);

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
        offset: 0,
        limit: 10,
      });
    });

    it('should handle empty filters', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getLogs({});

      expect(mockQuery.range).toHaveBeenCalledWith(0, 49); // Default limit of 50
      expect(result).toEqual({
        logs: [],
        total: 0,
        offset: 0,
        limit: 50,
      });
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.getLogs({})).rejects.toThrow('Failed to fetch logs');
    });
  });

  describe('getLogsByWorkflow', () => {
    it('should get logs by workflow ID', async () => {
      const workflowId = 'workflow-123';
      const mockLogs = [
        {
          id: 1,
          level: 'info',
          message: 'Workflow started',
          metadata: null,
          workflow_id: workflowId,
          job_id: null,
          pii_redacted: false,
          created_at: '2025-07-15T10:00:00Z',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockLogs,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getLogsByWorkflow(workflowId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('logs');
      expect(mockQuery.eq).toHaveBeenCalledWith('workflow_id', workflowId);
      expect(result).toEqual(mockLogs);
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.getLogsByWorkflow('workflow-123')).rejects.toThrow(
        'Failed to fetch workflow logs'
      );
    });
  });

  describe('getLogsByJob', () => {
    it('should get logs by job ID', async () => {
      const jobId = 'job-456';
      const mockLogs = [
        {
          id: 1,
          level: 'info',
          message: 'Job started',
          metadata: null,
          workflow_id: null,
          job_id: jobId,
          pii_redacted: false,
          created_at: '2025-07-15T10:00:00Z',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockLogs,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getLogsByJob(jobId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('logs');
      expect(mockQuery.eq).toHaveBeenCalledWith('job_id', jobId);
      expect(result).toEqual(mockLogs);
    });
  });

  describe('getLogStats', () => {
    it('should get log statistics', async () => {
      const mockLogData = [
        { level: 'info', pii_redacted: false },
        { level: 'info', pii_redacted: true },
        { level: 'error', pii_redacted: false },
        { level: 'warn', pii_redacted: true },
      ];

      const mockRecentData = [{ id: 1 }, { id: 2 }];

      // Mock the first call for total stats
      const mockTotalQuery = {
        select: jest.fn().mockResolvedValue({
          data: mockLogData,
          error: null,
        }),
      };

      // Mock the second call for recent stats
      const mockRecentQuery = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({
          data: mockRecentData,
          error: null,
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockTotalQuery)
        .mockReturnValueOnce(mockRecentQuery);

      const result = await service.getLogStats();

      expect(result).toEqual({
        total: 4,
        byLevel: {
          info: 2,
          error: 1,
          warn: 1,
        },
        withPii: 2,
        recentCount: 2,
      });
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.getLogStats()).rejects.toThrow(
        'Failed to fetch log stats'
      );
    });
  });

  describe('pruneOldLogs', () => {
    it('should prune old logs', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        lt: jest.fn().mockResolvedValue({
          data: [{ id: 1 }, { id: 2 }],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.pruneOldLogs(90);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('logs');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.lt).toHaveBeenCalledWith(
        'created_at',
        expect.any(String)
      );
      expect(result).toEqual({ deleted: 2 });
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        lt: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.pruneOldLogs(90)).rejects.toThrow(
        'Failed to prune old logs'
      );
    });
  });

  describe('convenience methods', () => {
    it('should provide convenience methods for different log levels', async () => {
      const mockQuery = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      piiRedactionService.redactPii.mockReturnValue({
        text: 'Test message',
        piiFound: false,
        redactedFields: [],
      });

      piiRedactionService.redactPiiFromObject.mockReturnValue({
        obj: { test: 'data' },
        piiFound: false,
        redactedFields: [],
      });

      await service.debug('Debug message', { test: 'data' });
      await service.info('Info message', { test: 'data' });
      await service.warn('Warn message', { test: 'data' });
      await service.error('Error message', { test: 'data' });

      expect(mockQuery.insert).toHaveBeenCalledTimes(4);
    });
  });
});
