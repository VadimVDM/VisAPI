/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { ConfigService } from '@visapi/core-config';
import { QUEUE_NAMES, QueueMetrics } from '@visapi/shared-types';
import { Queue, Job } from 'bullmq';

describe('QueueService', () => {
  let service: QueueService;
  let criticalQueue: jest.Mocked<Queue>;
  let defaultQueue: jest.Mocked<Queue>;
  let bulkQueue: jest.Mocked<Queue>;
  let cbbSyncQueue: jest.Mocked<Queue>;
  let whatsappMessagesQueue: jest.Mocked<Queue>;

  const createMockQueue = (): jest.Mocked<Queue> =>
    ({
      add: jest.fn(),
      getJob: jest.fn(),
      getJobCounts: jest.fn(),
      clean: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      drain: jest.fn(),
      remove: jest.fn(),
      getRepeatableJobs: jest.fn(),
      removeRepeatableByKey: jest.fn(),
      isPaused: jest.fn(),
    }) as unknown as jest.Mocked<Queue>;

  beforeEach(async () => {
    const mockCriticalQueue = createMockQueue();
    const mockDefaultQueue = createMockQueue();
    const mockBulkQueue = createMockQueue();
    const mockCbbSyncQueue = createMockQueue();
    const mockWhatsappMessagesQueue = createMockQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken(QUEUE_NAMES.CRITICAL),
          useValue: mockCriticalQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.DEFAULT),
          useValue: mockDefaultQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.BULK),
          useValue: mockBulkQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.CBB_SYNC),
          useValue: mockCbbSyncQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.WHATSAPP_MESSAGES),
          useValue: mockWhatsappMessagesQueue,
        },
        {
          provide: ConfigService,
          useValue: {
            queueMaxRetries: 3,
            queueRetryDelay: 2000,
          },
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    criticalQueue = module.get(getQueueToken(QUEUE_NAMES.CRITICAL));
    defaultQueue = module.get(getQueueToken(QUEUE_NAMES.DEFAULT));
    bulkQueue = module.get(getQueueToken(QUEUE_NAMES.BULK));
    cbbSyncQueue = module.get(getQueueToken(QUEUE_NAMES.CBB_SYNC));
    whatsappMessagesQueue = module.get(getQueueToken(QUEUE_NAMES.WHATSAPP_MESSAGES));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addJob', () => {
    it('should add job to default queue with correct data', async () => {
      const jobData = {
        channel: '#general',
        message: 'Test message',
        template: 'visa_approved',
        variables: { name: 'John Doe' },
      };

      const mockJob = { id: 'job-123' } as Job;
      defaultQueue.add.mockResolvedValue(mockJob);

      const result = await service.addJob(
        QUEUE_NAMES.DEFAULT,
        'slack.send',
        jobData,
      );

      expect(result).toBe(mockJob);
      expect(defaultQueue.add).toHaveBeenCalledWith(
        'slack.send',
        jobData,
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
    });

    it('should add job to critical queue when specified', async () => {
      const jobData = { message: 'Critical notification' };
      const mockJob = { id: 'job-456' } as Job;
      criticalQueue.add.mockResolvedValue(mockJob);

      const result = await service.addJob(
        QUEUE_NAMES.CRITICAL,
        'notification.send',
        jobData,
      );

      expect(result).toBe(mockJob);
      expect(criticalQueue.add).toHaveBeenCalledWith(
        'notification.send',
        jobData,
        expect.any(Object),
      );
    });
  });

  describe('getJob', () => {
    it('should get job from specified queue', async () => {
      const mockJob = { id: 'job-123', data: { test: true } } as Job;
      defaultQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.getJob(QUEUE_NAMES.DEFAULT, 'job-123');

      expect(result).toBe(mockJob);
      expect(defaultQueue.getJob).toHaveBeenCalledWith('job-123');
    });

    it('should return undefined when job not found', async () => {
      defaultQueue.getJob.mockResolvedValue(undefined);

      const result = await service.getJob(QUEUE_NAMES.DEFAULT, 'non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getQueueMetrics', () => {
    it('should return metrics for all queues', async () => {
      const mockCounts = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        paused: 0,
      };

      criticalQueue.getJobCounts.mockResolvedValue(mockCounts);
      defaultQueue.getJobCounts.mockResolvedValue(mockCounts);
      bulkQueue.getJobCounts.mockResolvedValue(mockCounts);
      cbbSyncQueue.getJobCounts.mockResolvedValue(mockCounts);
      whatsappMessagesQueue.getJobCounts.mockResolvedValue(mockCounts);

      criticalQueue.isPaused.mockResolvedValue(false);
      defaultQueue.isPaused.mockResolvedValue(false);
      bulkQueue.isPaused.mockResolvedValue(false);
      cbbSyncQueue.isPaused.mockResolvedValue(false);
      whatsappMessagesQueue.isPaused.mockResolvedValue(false);

      const result = await service.getQueueMetrics();

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual<QueueMetrics>({
        name: QUEUE_NAMES.CRITICAL,
        counts: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
          delayed: 1,
        },
        isPaused: false,
      });
    });

    it('should return metrics for specific queue when specified', async () => {
      const mockCounts = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        paused: 0,
      };

      defaultQueue.getJobCounts.mockResolvedValue(mockCounts);
      defaultQueue.isPaused.mockResolvedValue(false);

      const result = await service.getQueueMetrics(QUEUE_NAMES.DEFAULT);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual<QueueMetrics>({
        name: QUEUE_NAMES.DEFAULT,
        counts: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
          delayed: 1,
        },
        isPaused: false,
      });
    });
  });

  describe('pauseQueue', () => {
    it('should pause the specified queue', async () => {
      await service.pauseQueue(QUEUE_NAMES.DEFAULT);

      expect(defaultQueue.pause).toHaveBeenCalled();
    });
  });

  describe('resumeQueue', () => {
    it('should resume the specified queue', async () => {
      await service.resumeQueue(QUEUE_NAMES.DEFAULT);

      expect(defaultQueue.resume).toHaveBeenCalled();
    });
  });

  describe('drainQueue', () => {
    it('should drain the specified queue', async () => {
      await service.drainQueue(QUEUE_NAMES.DEFAULT);

      expect(defaultQueue.drain).toHaveBeenCalled();
    });
  });

  describe('cleanQueue', () => {
    it('should clean the specified queue', async () => {
      await service.cleanQueue(QUEUE_NAMES.DEFAULT, 5000, 'completed');

      expect(defaultQueue.clean).toHaveBeenCalledWith(5000, 0, 'completed');
    });
  });
});
