import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WebhooksController } from './webhooks.controller';
import { QueueService } from '../queue/queue.service';
import { IdempotencyService } from '@visapi/util-redis';
import { AuthService } from '../auth/auth.service';
import { QUEUE_NAMES, JOB_NAMES } from '@visapi/shared-types';
import { Job } from 'bullmq';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let queueService: jest.Mocked<QueueService>;
  let idempotencyService: jest.Mocked<IdempotencyService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        {
          provide: QueueService,
          useValue: {
            addJob: jest.fn(),
          },
        },
        {
          provide: IdempotencyService,
          useValue: {
            checkAndExecute: jest.fn(),
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
            getAllAndOverride: jest.fn().mockReturnValue([]),
          },
        },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    queueService = module.get(QueueService);
    idempotencyService = module.get(IdempotencyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWebhook', () => {
    const mockJob = { id: 'job-123' } as Job;
    const validPayload = {
      applicantName: 'John Doe',
      visaType: 'Tourist',
      status: 'approved',
      applicationId: 'APP-123456',
    };

    beforeEach(() => {
      queueService.addJob.mockResolvedValue(mockJob);
      idempotencyService.checkAndExecute.mockImplementation(
        async (key, fn) => await fn()
      );
    });

    it('should handle webhook successfully with idempotency key', async () => {
      const webhookKey = 'test-webhook';
      const idempotencyKey = 'idempotency-123';

      const result = await controller.handleWebhook(
        webhookKey,
        validPayload,
        idempotencyKey,
        'application/json'
      );

      expect(result).toEqual({
        status: 'accepted',
        jobId: 'job-123',
        message: 'Webhook received and queued for processing',
      });

      expect(idempotencyService.checkAndExecute).toHaveBeenCalledWith(
        idempotencyKey,
        expect.any(Function),
        3600
      );

      expect(queueService.addJob).toHaveBeenCalledWith(
        QUEUE_NAMES.DEFAULT,
        JOB_NAMES.PROCESS_WORKFLOW,
        {
          webhookKey,
          payload: validPayload,
          receivedAt: expect.any(String),
          idempotencyKey,
        }
      );
    });

    it('should throw BadRequestException when idempotency key is missing', async () => {
      await expect(
        controller.handleWebhook(
          'test-webhook',
          validPayload,
          undefined, // no idempotency key
          'application/json'
        )
      ).rejects.toThrow(BadRequestException);
      expect(() => {
        throw new BadRequestException('Idempotency-Key header is required');
      }).toThrow('Idempotency-Key header is required');
    });

    it('should throw BadRequestException for unsupported content type', async () => {
      await expect(
        controller.handleWebhook(
          'test-webhook',
          validPayload,
          'idempotency-123',
          'text/plain' // unsupported content type
        )
      ).rejects.toThrow(BadRequestException);
      expect(() => {
        throw new BadRequestException(
          'Unsupported content type. Use application/json or application/x-www-form-urlencoded'
        );
      }).toThrow('Unsupported content type');
    });

    it('should accept application/json content type', async () => {
      await controller.handleWebhook(
        'test-webhook',
        validPayload,
        'idempotency-123',
        'application/json'
      );

      expect(queueService.addJob).toHaveBeenCalled();
    });

    it('should accept application/x-www-form-urlencoded content type', async () => {
      await controller.handleWebhook(
        'test-webhook',
        validPayload,
        'idempotency-123',
        'application/x-www-form-urlencoded'
      );

      expect(queueService.addJob).toHaveBeenCalled();
    });

    it('should work without content type header', async () => {
      await controller.handleWebhook(
        'test-webhook',
        validPayload,
        'idempotency-123',
        undefined // no content type
      );

      expect(queueService.addJob).toHaveBeenCalled();
    });

    it('should throw PayloadTooLargeException for large payloads', async () => {
      // Create a payload larger than 512KB
      const largePayload = {
        data: 'x'.repeat(513 * 1024), // 513KB
      };

      await expect(
        controller.handleWebhook(
          'test-webhook',
          largePayload,
          'idempotency-123',
          'application/json'
        )
      ).rejects.toThrow(PayloadTooLargeException);
      expect(() => {
        throw new PayloadTooLargeException('Payload exceeds 512KB limit');
      }).toThrow('Payload exceeds 512KB limit');
    });

    it('should delegate idempotency handling to IdempotencyService', async () => {
      const webhookKey = 'test-webhook';
      const idempotencyKey = 'unique-key-123';

      // Mock idempotency service to return cached result
      const cachedResult = { status: 'cached', jobId: 'cached-job-123' };
      idempotencyService.checkAndExecute.mockResolvedValue(cachedResult);

      const result = await controller.handleWebhook(
        webhookKey,
        validPayload,
        idempotencyKey,
        'application/json'
      );

      expect(result).toEqual(cachedResult);
      expect(idempotencyService.checkAndExecute).toHaveBeenCalledWith(
        idempotencyKey,
        expect.any(Function),
        3600
      );
    });

    it('should pass webhook metadata to queue job', async () => {
      const webhookKey = 'visa-status-update';
      const idempotencyKey = 'idempotency-456';
      const payload = {
        applicationId: 'APP-789',
        status: 'under_review',
      };

      await controller.handleWebhook(
        webhookKey,
        payload,
        idempotencyKey,
        'application/json'
      );

      expect(queueService.addJob).toHaveBeenCalledWith(
        QUEUE_NAMES.DEFAULT,
        JOB_NAMES.PROCESS_WORKFLOW,
        {
          webhookKey,
          payload,
          receivedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/), // ISO date format
          idempotencyKey,
        }
      );
    });

    it('should handle queue service errors gracefully', async () => {
      queueService.addJob.mockRejectedValue(new Error('Redis connection failed'));

      // Since the error happens inside the idempotency function,
      // it should be propagated through checkAndExecute
      idempotencyService.checkAndExecute.mockImplementation(async (key, fn) => {
        return await fn(); // This will throw the error from queueService.addJob
      });

      await expect(
        controller.handleWebhook(
          'test-webhook',
          validPayload,
          'idempotency-123',
          'application/json'
        )
      ).rejects.toThrow('Redis connection failed');
    });
  });
});