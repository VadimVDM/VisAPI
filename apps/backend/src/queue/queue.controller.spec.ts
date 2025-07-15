import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { PinoLogger } from 'nestjs-pino';

describe('QueueController', () => {
  let controller: QueueController;
  let queueService: jest.Mocked<QueueService>;
  let logger: jest.Mocked<PinoLogger>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueController],
      providers: [
        {
          provide: QueueService,
          useValue: {
            getQueueMetrics: jest.fn(),
            pauseQueue: jest.fn(),
            resumeQueue: jest.fn(),
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

    controller = module.get<QueueController>(QueueController);
    queueService = module.get(QueueService);
    logger = module.get(PinoLogger);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return queue metrics', async () => {
      const mockMetrics = {
        slack: { waiting: 5, active: 2, completed: 100, failed: 3, delayed: 1 },
        whatsapp: {
          waiting: 2,
          active: 1,
          completed: 50,
          failed: 1,
          delayed: 0,
        },
        pdf: { waiting: 1, active: 0, completed: 25, failed: 0, delayed: 0 },
        dlq: { waiting: 0, active: 0, completed: 0, failed: 4, delayed: 0 },
      };

      queueService.getQueueMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toEqual(mockMetrics);
      expect(queueService.getQueueMetrics).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      queueService.getQueueMetrics.mockRejectedValue(
        new Error('Redis unavailable')
      );

      await expect(controller.getMetrics()).rejects.toThrow(
        'Redis unavailable'
      );
    });
  });

  describe('pauseQueue', () => {
    it('should pause a queue and return success response', async () => {
      const queueName = 'slack';
      queueService.pauseQueue.mockResolvedValue(undefined);

      const result = await controller.pauseQueue(queueName);

      expect(result).toEqual({
        success: true,
        message: `Queue ${queueName} paused successfully`,
      });
      expect(queueService.pauseQueue).toHaveBeenCalledWith(queueName);
    });

    it('should handle pause errors', async () => {
      const queueName = 'slack';
      queueService.pauseQueue.mockRejectedValue(new Error('Queue not found'));

      await expect(controller.pauseQueue(queueName)).rejects.toThrow(
        'Queue not found'
      );
    });
  });

  describe('resumeQueue', () => {
    it('should resume a queue and return success response', async () => {
      const queueName = 'whatsapp';
      queueService.resumeQueue.mockResolvedValue(undefined);

      const result = await controller.resumeQueue(queueName);

      expect(result).toEqual({
        success: true,
        message: `Queue ${queueName} resumed successfully`,
      });
      expect(queueService.resumeQueue).toHaveBeenCalledWith(queueName);
    });

    it('should handle resume errors', async () => {
      const queueName = 'pdf';
      queueService.resumeQueue.mockRejectedValue(new Error('Queue not found'));

      await expect(controller.resumeQueue(queueName)).rejects.toThrow(
        'Queue not found'
      );
    });
  });
});
