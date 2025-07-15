import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { QueueService } from '../queue/queue.service';
import { PinoLogger } from 'nestjs-pino';
import { BadRequestException } from '@nestjs/common';
import { Job } from 'bullmq';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let queueService: jest.Mocked<QueueService>;
  let logger: jest.Mocked<PinoLogger>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        {
          provide: QueueService,
          useValue: {
            addSlackJob: jest.fn(),
            addWhatsAppJob: jest.fn(),
            addPdfJob: jest.fn(),
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

    controller = module.get<WebhooksController>(WebhooksController);
    queueService = module.get(QueueService);
    logger = module.get(PinoLogger);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('triggerWorkflow', () => {
    const mockRequest = {
      headers: {
        'x-correlation-id': 'test-correlation-123',
      },
      user: {
        id: 'api-key-123',
        scopes: ['webhooks:trigger'],
      },
    };

    describe('visa-approval-notification workflow', () => {
      it('should trigger slack and whatsapp jobs successfully', async () => {
        const workflowKey = 'visa-approval-notification';
        const requestBody = {
          applicantName: 'John Doe',
          visaType: 'Tourist',
          status: 'approved',
          applicationId: 'APP-123456',
        };

        const mockSlackJob = { id: 'slack-job-123' } as Job;
        const mockWhatsAppJob = { id: 'whatsapp-job-456' } as Job;

        queueService.addSlackJob.mockResolvedValue(mockSlackJob);
        queueService.addWhatsAppJob.mockResolvedValue(mockWhatsAppJob);

        const result = await controller.triggerWorkflow(
          workflowKey,
          requestBody,
          mockRequest as any
        );

        expect(result).toEqual({
          success: true,
          workflowId: workflowKey,
          jobs: {
            slack: 'slack-job-123',
            whatsapp: 'whatsapp-job-456',
          },
          correlationId: 'test-correlation-123',
        });

        expect(queueService.addSlackJob).toHaveBeenCalledWith(
          {
            channel: '#visa-approvals',
            message: 'Visa application approved for John Doe (Tourist visa)',
            template: 'visa_approved',
            variables: requestBody,
          },
          { priority: 'default' }
        );

        expect(queueService.addWhatsAppJob).toHaveBeenCalledWith(
          {
            phoneNumber: '+1234567890',
            message: 'Your Tourist visa application has been approved!',
            template: 'visa_approved',
            variables: requestBody,
          },
          { priority: 'default' }
        );
      });

      it('should handle job creation failures gracefully', async () => {
        const workflowKey = 'visa-approval-notification';
        const requestBody = {
          applicantName: 'John Doe',
          visaType: 'Tourist',
          status: 'approved',
          applicationId: 'APP-123456',
        };

        queueService.addSlackJob.mockRejectedValue(
          new Error('Redis connection failed')
        );
        queueService.addWhatsAppJob.mockResolvedValue({
          id: 'whatsapp-job-456',
        } as Job);

        await expect(
          controller.triggerWorkflow(
            workflowKey,
            requestBody,
            mockRequest as any
          )
        ).rejects.toThrow('Redis connection failed');

        expect(logger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            workflowId: workflowKey,
            error: expect.any(Error),
            correlationId: 'test-correlation-123',
          }),
          'Failed to trigger workflow'
        );
      });
    });

    describe('document-generation workflow', () => {
      it('should trigger pdf generation job', async () => {
        const workflowKey = 'document-generation';
        const requestBody = {
          applicantName: 'Jane Smith',
          visaType: 'Business',
          applicationId: 'APP-789012',
          documentType: 'certificate',
        };

        const mockPdfJob = { id: 'pdf-job-789' } as Job;
        queueService.addPdfJob.mockResolvedValue(mockPdfJob);

        const result = await controller.triggerWorkflow(
          workflowKey,
          requestBody,
          mockRequest as any
        );

        expect(result).toEqual({
          success: true,
          workflowId: workflowKey,
          jobs: {
            pdf: 'pdf-job-789',
          },
          correlationId: 'test-correlation-123',
        });

        expect(queueService.addPdfJob).toHaveBeenCalledWith(
          {
            template: 'visa_certificate',
            data: requestBody,
            outputPath: `/tmp/documents/${requestBody.applicationId}_certificate.pdf`,
          },
          { priority: 'default' }
        );
      });
    });

    describe('status-update-broadcast workflow', () => {
      it('should trigger multiple notification jobs', async () => {
        const workflowKey = 'status-update-broadcast';
        const requestBody = {
          applicantName: 'Bob Wilson',
          visaType: 'Student',
          status: 'under_review',
          applicationId: 'APP-345678',
        };

        const mockSlackJob = { id: 'slack-job-345' } as Job;
        const mockWhatsAppJob = { id: 'whatsapp-job-678' } as Job;

        queueService.addSlackJob.mockResolvedValue(mockSlackJob);
        queueService.addWhatsAppJob.mockResolvedValue(mockWhatsAppJob);

        const result = await controller.triggerWorkflow(
          workflowKey,
          requestBody,
          mockRequest as any
        );

        expect(result.success).toBe(true);
        expect(result.jobs).toHaveProperty('slack', 'slack-job-345');
        expect(result.jobs).toHaveProperty('whatsapp', 'whatsapp-job-678');
      });
    });

    it('should throw BadRequestException for unknown workflow', async () => {
      const workflowKey = 'unknown-workflow';
      const requestBody = {
        test: 'data',
      };

      await expect(
        controller.triggerWorkflow(workflowKey, requestBody, mockRequest as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle missing correlation ID', async () => {
      const workflowKey = 'visa-approval-notification';
      const requestBody = {
        applicantName: 'John Doe',
        visaType: 'Tourist',
        status: 'approved',
        applicationId: 'APP-123456',
      };

      const requestWithoutCorrelationId = {
        headers: {},
        user: mockRequest.user,
      };

      const mockSlackJob = { id: 'slack-job-123' } as Job;
      const mockWhatsAppJob = { id: 'whatsapp-job-456' } as Job;

      queueService.addSlackJob.mockResolvedValue(mockSlackJob);
      queueService.addWhatsAppJob.mockResolvedValue(mockWhatsAppJob);

      const result = await controller.triggerWorkflow(
        workflowKey,
        requestBody,
        requestWithoutCorrelationId as any
      );

      expect(result.correlationId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it('should validate required fields for visa-approval-notification', async () => {
      const workflowKey = 'visa-approval-notification';
      const incompleteRequestBody = {
        applicantName: 'John Doe',
        // Missing visaType, status, applicationId
      };

      await expect(
        controller.triggerWorkflow(
          workflowKey,
          incompleteRequestBody,
          mockRequest as any
        )
      ).rejects.toThrow(BadRequestException);
    });
  });
});
