import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { ConfigService } from '@visapi/core-config';
import { QUEUE_NAMES } from '@visapi/shared-types';
import { Queue, Job } from 'bullmq';

describe('QueueService', () => {
  let service: QueueService;
  let criticalQueue: jest.Mocked<Queue>;
  let defaultQueue: jest.Mocked<Queue>;
  let bulkQueue: jest.Mocked<Queue>;

  const createMockQueue = () => ({
    add: jest.fn(),
    getJob: jest.fn(),
    getJobCounts: jest.fn(),
    clean: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    drain: jest.fn(),
    remove: jest.fn(),
  });

  beforeEach(async () => {
    const mockCriticalQueue = createMockQueue();
    const mockDefaultQueue = createMockQueue();
    const mockBulkQueue = createMockQueue();

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

      const result = await service.addJob(QUEUE_NAMES.DEFAULT, 'slack.send', jobData);

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
        })
      );
    });

    it('should add job to critical queue when specified', async () => {
      const jobData = { message: 'Critical notification' };
      const mockJob = { id: 'job-456' } as Job;
      criticalQueue.add.mockResolvedValue(mockJob);

      const result = await service.addJob(QUEUE_NAMES.CRITICAL, 'notification.send', jobData);

      expect(result).toBe(mockJob);
      expect(criticalQueue.add).toHaveBeenCalledWith(
        'notification.send',
        jobData,
        expect.any(Object)
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

  // checkHealth method was removed as it's replaced by dedicated health indicators

  describe('getQueueMetrics', () => {
    it('should return metrics for all queues', async () => {
      const mockCounts = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      };

      criticalQueue.getJobCounts.mockResolvedValue(mockCounts);
      defaultQueue.getJobCounts.mockResolvedValue(mockCounts);
      bulkQueue.getJobCounts.mockResolvedValue(mockCounts);

      const result = await service.getQueueMetrics();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: QUEUE_NAMES.CRITICAL,
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
    });

    it('should return metrics for specific queue when specified', async () => {
      const mockCounts = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      };

      defaultQueue.getJobCounts.mockResolvedValue(mockCounts);

      const result = await service.getQueueMetrics(QUEUE_NAMES.DEFAULT);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: QUEUE_NAMES.DEFAULT,
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
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
      const mockResult = ['job-1', 'job-2'];
      defaultQueue.clean.mockResolvedValue(mockResult);

      const result = await service.cleanQueue(QUEUE_NAMES.DEFAULT, 5000, 10, 'completed');

      expect(result).toBe(mockResult);
      expect(defaultQueue.clean).toHaveBeenCalledWith(5000, 10, 'completed');
    });
  });
});
