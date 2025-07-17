import { Test, TestingModule } from '@nestjs/testing';
import { CronSeederService } from './cron-seeder.service';
import { SupabaseService } from '@visapi/core-supabase';
import { QueueService } from '../queue/queue.service';
import { getLoggerToken } from 'nestjs-pino';
import { QUEUE_NAMES, JOB_NAMES } from '@visapi/shared-types';

describe('CronSeederService', () => {
  let service: CronSeederService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let queueService: jest.Mocked<QueueService>;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockWorkflows = [
    {
      id: 'workflow-1',
      name: 'Daily Status Update',
      enabled: true,
      schema: {
        triggers: [
          {
            type: 'cron',
            config: {
              schedule: '0 9 * * *', // Daily at 9 AM
              timezone: 'America/New_York',
            },
          },
        ],
        steps: [],
      },
    },
    {
      id: 'workflow-2',
      name: 'Weekly Report',
      enabled: true,
      schema: {
        triggers: [
          {
            type: 'cron',
            config: {
              schedule: '0 10 * * 1', // Weekly on Monday at 10 AM
            },
          },
        ],
        steps: [],
      },
    },
    {
      id: 'workflow-3',
      name: 'Webhook Only',
      enabled: true,
      schema: {
        triggers: [
          {
            type: 'webhook',
            config: {
              endpoint: '/webhook/test',
            },
          },
        ],
        steps: [],
      },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronSeederService,
        {
          provide: getLoggerToken(CronSeederService.name),
          useValue: mockLogger,
        },
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    data: null,
                    error: null,
                  }),
                  single: jest.fn().mockReturnValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            },
          },
        },
        {
          provide: QueueService,
          useValue: {
            addRepeatableJob: jest.fn(),
            removeRepeatableJob: jest.fn(),
            getRepeatableJobs: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CronSeederService>(CronSeederService);
    supabaseService = module.get(SupabaseService);
    queueService = module.get(QueueService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should seed cron jobs on module initialization', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockWorkflows,
            error: null,
          }),
        }),
      };
      
      supabaseService.client.from = jest.fn().mockReturnValue(mockFrom);
      queueService.getRepeatableJobs.mockResolvedValue([]);

      await service.onModuleInit();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting cron job seeding');
      expect(queueService.addRepeatableJob).toHaveBeenCalledTimes(3); // 2 workflow jobs + 1 log pruning job
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cron job seeding completed successfully',
      );
    });

    it('should handle no workflows with cron triggers', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [mockWorkflows[2]], // Only webhook workflow
            error: null,
          }),
        }),
      };
      
      supabaseService.client.from = jest.fn().mockReturnValue(mockFrom);

      await service.onModuleInit();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'No workflows with cron triggers found',
      );
      expect(queueService.addRepeatableJob).toHaveBeenCalledTimes(1); // Only log pruning job
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      const mockFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: error.message },
          }),
        }),
      };
      
      supabaseService.client.from = jest.fn().mockReturnValue(mockFrom);

      // onModuleInit should not throw errors anymore, it should handle them gracefully
      await expect(service.onModuleInit()).resolves.not.toThrow();
      
      // Verify that error logging occurred
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
        }),
        'Failed to seed cron jobs during startup - application will continue without cron job seeding'
      );
    });
  });

  describe('seedCronJobs', () => {
    it('should schedule workflows with cron triggers', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockWorkflows,
            error: null,
          }),
        }),
      };
      
      supabaseService.client.from = jest.fn().mockReturnValue(mockFrom);
      queueService.getRepeatableJobs.mockResolvedValue([]);

      await service.seedCronJobs();

      expect(queueService.addRepeatableJob).toHaveBeenCalledWith(
        QUEUE_NAMES.DEFAULT,
        JOB_NAMES.PROCESS_WORKFLOW,
        {
          workflowId: 'workflow-1',
          trigger: {
            type: 'cron',
            schedule: '0 9 * * *',
          },
          metadata: {
            workflowName: 'Daily Status Update',
            scheduledBy: 'cron-seeder',
          },
        },
        {
          pattern: '0 9 * * *',
          tz: 'America/New_York',
        },
      );

      expect(queueService.addRepeatableJob).toHaveBeenCalledWith(
        QUEUE_NAMES.DEFAULT,
        JOB_NAMES.PROCESS_WORKFLOW,
        {
          workflowId: 'workflow-2',
          trigger: {
            type: 'cron',
            schedule: '0 10 * * 1',
          },
          metadata: {
            workflowName: 'Weekly Report',
            scheduledBy: 'cron-seeder',
          },
        },
        {
          pattern: '0 10 * * 1',
          tz: 'UTC',
        },
      );

      // Verify log pruning job is scheduled
      expect(queueService.addRepeatableJob).toHaveBeenCalledWith(
        QUEUE_NAMES.DEFAULT,
        JOB_NAMES.PRUNE_LOGS,
        {
          olderThanDays: 90,
        },
        {
          pattern: '0 2 * * *',
          tz: 'UTC',
        },
      );
    });

    it('should clear existing cron jobs before seeding', async () => {
      const existingJobs = [
        { id: 'cron-workflow-1', key: 'key1' },
        { id: 'cron-workflow-2', key: 'key2' },
        { id: 'log-pruning', key: 'key3' },
        { id: 'other-job', key: 'key4' },
      ];

      const mockFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockWorkflows,
            error: null,
          }),
        }),
      };
      
      supabaseService.client.from = jest.fn().mockReturnValue(mockFrom);
      queueService.getRepeatableJobs.mockResolvedValue(existingJobs);

      await service.seedCronJobs();

      expect(queueService.removeRepeatableJob).toHaveBeenCalledWith(
        QUEUE_NAMES.DEFAULT,
        'workflow-1',
      );
      expect(queueService.removeRepeatableJob).toHaveBeenCalledWith(
        QUEUE_NAMES.DEFAULT,
        'workflow-2',
      );
      expect(queueService.removeRepeatableJob).toHaveBeenCalledWith(
        QUEUE_NAMES.DEFAULT,
        'log-pruning',
      );
      expect(queueService.removeRepeatableJob).toHaveBeenCalledTimes(3);
    });
  });

  describe('updateWorkflowCronJobs', () => {
    it('should update cron jobs for an enabled workflow', async () => {
      const updatedWorkflow = {
        ...mockWorkflows[0],
        schema: {
          triggers: [
            {
              type: 'cron',
              config: {
                schedule: '0 15 * * *', // Updated schedule
                timezone: 'UTC',
              },
            },
          ],
          steps: [],
        },
      };

      const mockFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedWorkflow,
              error: null,
            }),
          }),
        }),
      };
      
      supabaseService.client.from = jest.fn().mockReturnValue(mockFrom);

      await service.updateWorkflowCronJobs('workflow-1');

      expect(queueService.removeRepeatableJob).toHaveBeenCalledWith(
        QUEUE_NAMES.DEFAULT,
        'workflow-1',
      );
      expect(queueService.addRepeatableJob).toHaveBeenCalledWith(
        QUEUE_NAMES.DEFAULT,
        JOB_NAMES.PROCESS_WORKFLOW,
        expect.objectContaining({
          workflowId: 'workflow-1',
        }),
        {
          pattern: '0 15 * * *',
          tz: 'UTC',
        },
      );
    });

    it('should not reschedule disabled workflows', async () => {
      const disabledWorkflow = {
        ...mockWorkflows[0],
        enabled: false,
      };

      const mockFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: disabledWorkflow,
              error: null,
            }),
          }),
        }),
      };
      
      supabaseService.client.from = jest.fn().mockReturnValue(mockFrom);

      await service.updateWorkflowCronJobs('workflow-1');

      expect(queueService.removeRepeatableJob).toHaveBeenCalled();
      expect(queueService.addRepeatableJob).not.toHaveBeenCalled();
    });

    it('should handle workflow not found', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      };
      
      supabaseService.client.from = jest.fn().mockReturnValue(mockFrom);

      await service.updateWorkflowCronJobs('non-existent');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'non-existent',
        }),
        'Workflow not found for cron update',
      );
    });
  });

  describe('removeWorkflowCronJobs', () => {
    it('should remove cron jobs for a workflow', async () => {
      await service.removeWorkflowCronJobs('workflow-1');

      expect(queueService.removeRepeatableJob).toHaveBeenCalledWith(
        QUEUE_NAMES.DEFAULT,
        'workflow-1',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { workflowId: 'workflow-1' },
        'Removed cron jobs for workflow',
      );
    });

    it('should handle errors when removing cron jobs', async () => {
      const error = new Error('Failed to remove');
      queueService.removeRepeatableJob.mockRejectedValue(error);

      await service.removeWorkflowCronJobs('workflow-1');

      expect(mockLogger.error).toHaveBeenCalledWith(
        { error, workflowId: 'workflow-1' },
        'Failed to remove workflow cron jobs',
      );
    });
  });

  describe('getCronDriftMetrics', () => {
    it('should calculate cron drift metrics', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 300000); // 5 minutes from now

      const repeatableJobs = [
        {
          id: 'cron-workflow-1',
          pattern: '0 9 * * *',
          next: futureDate.getTime(),
        },
        {
          id: 'other-job',
          pattern: '*/5 * * * *',
          next: futureDate.getTime(),
        },
      ];

      queueService.getRepeatableJobs.mockResolvedValue(repeatableJobs);

      const metrics = await service.getCronDriftMetrics();

      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        workflowId: 'workflow-1',
        schedule: '0 9 * * *',
        nextRun: futureDate,
      });
      expect(metrics[0].drift).toBeGreaterThan(0);
    });

    it('should handle errors when getting drift metrics', async () => {
      const error = new Error('Redis connection failed');
      queueService.getRepeatableJobs.mockRejectedValue(error);

      const metrics = await service.getCronDriftMetrics();

      expect(metrics).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error },
        'Failed to get cron drift metrics',
      );
    });
  });

  describe('cron drift detection', () => {
    it('should detect significant drift in cron execution', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 600000); // 10 minutes ago (significant drift)

      const repeatableJobs = [
        {
          id: 'cron-workflow-1',
          pattern: '0 9 * * *',
          next: pastDate.getTime(),
        },
      ];

      queueService.getRepeatableJobs.mockResolvedValue(repeatableJobs);

      const metrics = await service.getCronDriftMetrics();

      expect(metrics[0].drift).toBeGreaterThanOrEqual(600000); // At least 10 minutes drift
    });
  });
});