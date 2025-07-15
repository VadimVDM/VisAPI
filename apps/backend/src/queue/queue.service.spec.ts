import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { Queue, Job } from 'bullmq';

describe('QueueService', () => {
  let service: QueueService;
  let slackQueue: jest.Mocked<Queue>;
  let whatsappQueue: jest.Mocked<Queue>;
  let pdfQueue: jest.Mocked<Queue>;
  let dlqQueue: jest.Mocked<Queue>;
  let logger: jest.Mocked<PinoLogger>;

  const createMockQueue = () => ({
    add: jest.fn(),
    getJobs: jest.fn(),
    count: jest.fn(),
    clean: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    isPaused: jest.fn(),
  });

  beforeEach(async () => {
    const mockSlackQueue = createMockQueue();
    const mockWhatsappQueue = createMockQueue();
    const mockPdfQueue = createMockQueue();
    const mockDlqQueue = createMockQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken('slack'),
          useValue: mockSlackQueue,
        },
        {
          provide: getQueueToken('whatsapp'),
          useValue: mockWhatsappQueue,
        },
        {
          provide: getQueueToken('pdf'),
          useValue: mockPdfQueue,
        },
        {
          provide: getQueueToken('dlq'),
          useValue: mockDlqQueue,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'queue.defaultJobOptions.removeOnComplete': 100,
                'queue.defaultJobOptions.removeOnFail': 50,
              };
              return config[key];
            }),
          },
        },
        {
          provide: PinoLogger,
          useValue: {
            setContext: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    slackQueue = module.get(getQueueToken('slack'));
    whatsappQueue = module.get(getQueueToken('whatsapp'));
    pdfQueue = module.get(getQueueToken('pdf'));
    dlqQueue = module.get(getQueueToken('dlq'));
    logger = module.get(PinoLogger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addSlackJob', () => {
    it('should add job to slack queue with correct data', async () => {
      const jobData = {
        channel: '#general',
        message: 'Test message',
        template: 'visa_approved',
        variables: { name: 'John Doe' },
      };

      const mockJob = { id: 'job-123' } as Job;
      slackQueue.add.mockResolvedValue(mockJob);

      const result = await service.addSlackJob(jobData);

      expect(result).toBe(mockJob);
      expect(slackQueue.add).toHaveBeenCalledWith(
        'slack.send',
        jobData,
        expect.objectContaining({
          priority: 1,
          removeOnComplete: 100,
          removeOnFail: 50,
        })
      );
    });

    it('should use custom priority when provided', async () => {
      const jobData = {
        channel: '#general',
        message: 'Test message',
      };

      const mockJob = { id: 'job-123' } as Job;
      slackQueue.add.mockResolvedValue(mockJob);

      await service.addSlackJob(jobData, { priority: 'critical' });

      expect(slackQueue.add).toHaveBeenCalledWith(
        'slack.send',
        jobData,
        expect.objectContaining({
          priority: 10,
        })
      );
    });
  });

  describe('addWhatsAppJob', () => {
    it('should add job to whatsapp queue', async () => {
      const jobData = {
        phoneNumber: '+1234567890',
        message: 'Test message',
        template: 'visa_approved',
        variables: { name: 'John Doe' },
      };

      const mockJob = { id: 'job-456' } as Job;
      whatsappQueue.add.mockResolvedValue(mockJob);

      const result = await service.addWhatsAppJob(jobData);

      expect(result).toBe(mockJob);
      expect(whatsappQueue.add).toHaveBeenCalledWith(
        'whatsapp.send',
        jobData,
        expect.any(Object)
      );
    });
  });

  describe('addPdfJob', () => {
    it('should add job to pdf queue', async () => {
      const jobData = {
        template: 'visa_certificate',
        data: { name: 'John Doe', visaType: 'Tourist' },
        outputPath: '/tmp/visa_cert.pdf',
      };

      const mockJob = { id: 'job-789' } as Job;
      pdfQueue.add.mockResolvedValue(mockJob);

      const result = await service.addPdfJob(jobData);

      expect(result).toBe(mockJob);
      expect(pdfQueue.add).toHaveBeenCalledWith(
        'pdf.generate',
        jobData,
        expect.any(Object)
      );
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
      };

      slackQueue.count.mockResolvedValue(mockCounts);
      whatsappQueue.count.mockResolvedValue(mockCounts);
      pdfQueue.count.mockResolvedValue(mockCounts);
      dlqQueue.count.mockResolvedValue({ ...mockCounts, failed: 10 });

      const result = await service.getQueueMetrics();

      expect(result).toEqual({
        slack: mockCounts,
        whatsapp: mockCounts,
        pdf: mockCounts,
        dlq: { ...mockCounts, failed: 10 },
      });
    });

    it('should handle queue count errors gracefully', async () => {
      slackQueue.count.mockRejectedValue(new Error('Redis connection failed'));
      whatsappQueue.count.mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });
      pdfQueue.count.mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });
      dlqQueue.count.mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });

      const result = await service.getQueueMetrics();

      expect(result.slack).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          queue: 'slack',
          error: expect.any(Error),
        }),
        'Failed to get queue metrics'
      );
    });
  });

  describe('moveJobToDLQ', () => {
    it('should move failed job to DLQ', async () => {
      const originalJob = {
        id: 'job-123',
        name: 'slack.send',
        data: { channel: '#general', message: 'test' },
        opts: { priority: 1 },
        failedReason: 'Network timeout',
        attemptsMade: 3,
      };

      const mockDlqJob = { id: 'dlq-job-123' } as Job;
      dlqQueue.add.mockResolvedValue(mockDlqJob);

      const result = await service.moveJobToDLQ(
        originalJob as any,
        'Processing failed'
      );

      expect(result).toBe(mockDlqJob);
      expect(dlqQueue.add).toHaveBeenCalledWith(
        'dlq.process',
        {
          originalJobId: 'job-123',
          originalJobName: 'slack.send',
          originalJobData: originalJob.data,
          failureReason: 'Processing failed',
          originalFailureReason: 'Network timeout',
          attemptsMade: 3,
          movedAt: expect.any(String),
        },
        expect.objectContaining({
          priority: 1,
        })
      );
    });
  });

  describe('pauseQueue', () => {
    it('should pause the specified queue', async () => {
      await service.pauseQueue('slack');

      expect(slackQueue.pause).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        { queue: 'slack' },
        'Queue paused'
      );
    });

    it('should handle invalid queue name', async () => {
      await expect(service.pauseQueue('invalid' as any)).rejects.toThrow(
        'Queue invalid not found'
      );
    });
  });

  describe('resumeQueue', () => {
    it('should resume the specified queue', async () => {
      await service.resumeQueue('slack');

      expect(slackQueue.resume).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        { queue: 'slack' },
        'Queue resumed'
      );
    });
  });
});
