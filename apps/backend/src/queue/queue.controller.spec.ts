import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { AuthService } from '../auth/auth.service';
import { Reflector } from '@nestjs/core';
import { QueueMetrics } from '@visapi/shared-types';

describe('QueueController', () => {
  let controller: QueueController;
  let queueService: jest.Mocked<QueueService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueController],
      providers: [
        {
          provide: QueueService,
          useValue: {
            getQueueMetrics: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            validateApiKey: jest.fn(),
            checkScopes: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<QueueController>(QueueController);
    queueService = module.get(QueueService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return queue metrics', async () => {
      const mockMetrics: QueueMetrics[] = [
        {
          name: 'critical',
          counts: {
            waiting: 5,
            active: 2,
            completed: 100,
            failed: 3,
            delayed: 1,
            paused: 0,
          },
          isPaused: false,
        },
        {
          name: 'default',
          counts: {
            waiting: 2,
            active: 1,
            completed: 50,
            failed: 1,
            delayed: 0,
            paused: 0,
          },
          isPaused: false,
        },
        {
          name: 'bulk',
          counts: {
            waiting: 1,
            active: 0,
            completed: 25,
            failed: 0,
            delayed: 0,
            paused: 0,
          },
          isPaused: false,
        },
      ];

      queueService.getQueueMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toEqual(mockMetrics);
      expect(queueService.getQueueMetrics).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      queueService.getQueueMetrics.mockRejectedValue(
        new Error('Redis unavailable'),
      );

      await expect(controller.getMetrics()).rejects.toThrow(
        'Redis unavailable',
      );
    });
  });
});
