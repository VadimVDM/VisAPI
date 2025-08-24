import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { WhatsAppProcessor } from './whatsapp.processor';
import {
  WhatsAppJobData,
  WhatsAppJobResult,
  Contact,
} from '@visapi/shared-types';
import {
  CbbClientService,
  ContactResolverService,
  TemplateService,
  CbbApiError,
  ContactNotFoundError,
} from '@visapi/backend-core-cbb';

describe('WhatsAppProcessor', () => {
  let processor: WhatsAppProcessor;
  let cbbClient: jest.Mocked<CbbClientService>;
  let contactResolver: jest.Mocked<ContactResolverService>;
  let templateService: jest.Mocked<TemplateService>;

  const mockContact: Contact = {
    id: 123,
    page_id: 456,
    first_name: 'John',
    last_name: 'Doe',
    channel: 5,
    profile_pic: '',
    locale: 'en',
    gender: 1,
    timezone: 0,
    last_sent: 1640995200000,
    last_delivered: 1640995200000,
    last_seen: 1640995200000,
    last_interaction: 1640995200000,
    subscribed_date: '2022-01-01 00:00:00',
    subscribed: 1,
    tags: [],
    custom_fields: [],
    phone: '+1234567890',
  };

  const createMockJob = (data: WhatsAppJobData): Job<WhatsAppJobData> => {
    return {
      data,
      id: 'test-job-id',
      name: 'whatsapp.send',
      timestamp: Date.now(),
    } as Job<WhatsAppJobData>;
  };

  beforeEach(async () => {
    const mockCbbClient = {
      sendTextMessage: jest.fn(),
      sendFileMessage: jest.fn(),
      sendFlow: jest.fn(),
    };

    const mockContactResolver = {
      resolveContact: jest.fn(),
    };

    const mockTemplateService = {
      getTemplateFlowId: jest.fn(),
      processTemplateVariables: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppProcessor,
        { provide: CbbClientService, useValue: mockCbbClient },
        { provide: ContactResolverService, useValue: mockContactResolver },
        { provide: TemplateService, useValue: mockTemplateService },
      ],
    }).compile();

    processor = module.get<WhatsAppProcessor>(WhatsAppProcessor);
    cbbClient = module.get(CbbClientService);
    contactResolver = module.get(ContactResolverService);
    templateService = module.get(TemplateService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process - text messages', () => {
    it('should send text message successfully', async () => {
      const jobData: WhatsAppJobData = {
        to: '+1234567890',
        message: 'Hello, this is a test message',
      };

      const job = createMockJob(jobData);

      contactResolver.resolveContact.mockResolvedValue(mockContact);
      cbbClient.sendTextMessage.mockResolvedValue({
        success: true,
        message_id: 'msg_123',
      });

      const result = await processor.process(job);

      expect(result).toEqual({
        success: true,
        contactId: 123,
        messageId: 'msg_123',
        to: '+1234567890',
        timestamp: expect.any(String),
      });

      expect(contactResolver.resolveContact).toHaveBeenCalledWith(
        '+1234567890',
      );
      expect(cbbClient.sendTextMessage).toHaveBeenCalledWith(
        123,
        'Hello, this is a test message',
      );
    });

    it('should generate fallback message ID if not provided by API', async () => {
      const jobData: WhatsAppJobData = {
        to: '+1234567890',
        message: 'Test message',
      };

      const job = createMockJob(jobData);

      contactResolver.resolveContact.mockResolvedValue(mockContact);
      cbbClient.sendTextMessage.mockResolvedValue({
        success: true,
        // No message_id provided
      });

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^cbb_\d+$/);
    });
  });

  describe('process - template messages', () => {
    it('should send template message successfully', async () => {
      const jobData: WhatsAppJobData = {
        to: '+1234567890',
        template: 'visa_approved',
        variables: { name: 'John Doe', status: 'approved' },
      };

      const job = createMockJob(jobData);

      contactResolver.resolveContact.mockResolvedValue(mockContact);
      templateService.getTemplateFlowId.mockResolvedValue(200);
      templateService.processTemplateVariables.mockResolvedValue({});
      cbbClient.sendFlow.mockResolvedValue({
        success: true,
        message_id: 'flow_msg_456',
      });

      const result = await processor.process(job);

      expect(result).toEqual({
        success: true,
        contactId: 123,
        messageId: 'flow_msg_456',
        to: '+1234567890',
        timestamp: expect.any(String),
      });

      expect(templateService.getTemplateFlowId).toHaveBeenCalledWith(
        'visa_approved',
      );
      expect(templateService.processTemplateVariables).toHaveBeenCalledWith(
        'visa_approved',
        {
          name: 'John Doe',
          status: 'approved',
        },
      );
      expect(cbbClient.sendFlow).toHaveBeenCalledWith(123, 200);
    });

    it('should fallback to text message when template not found and fallback provided', async () => {
      const jobData: WhatsAppJobData = {
        to: '+1234567890',
        template: 'unknown_template',
        variables: { fallback_message: 'Your visa has been approved!' },
      };

      const job = createMockJob(jobData);

      contactResolver.resolveContact.mockResolvedValue(mockContact);
      templateService.getTemplateFlowId.mockRejectedValue(
        new Error("Template 'unknown_template' not found"),
      );
      cbbClient.sendTextMessage.mockResolvedValue({
        success: true,
        message_id: 'fallback_msg_789',
      });

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(cgbClient.sendTextMessage).toHaveBeenCalledWith(
        123,
        'Your visa has been approved!',
      );
    });

    it('should throw error when template not found and no fallback', async () => {
      const jobData: WhatsAppJobData = {
        to: '+1234567890',
        template: 'unknown_template',
        variables: { name: 'John' },
      };

      const job = createMockJob(jobData);

      contactResolver.resolveContact.mockResolvedValue(mockContact);
      templateService.getTemplateFlowId.mockRejectedValue(
        new Error("Template 'unknown_template' not found"),
      );

      await expect(processor.process(job)).rejects.toThrow(
        "Template 'unknown_template' not found",
      );
    });
  });

  describe('process - file messages', () => {
    it('should send file message successfully', async () => {
      const jobData: WhatsAppJobData = {
        to: '+1234567890',
        fileUrl: 'https://example.com/document.pdf',
        fileType: 'document',
      };

      const job = createMockJob(jobData);

      contactResolver.resolveContact.mockResolvedValue(mockContact);
      cbbClient.sendFileMessage.mockResolvedValue({
        success: true,
        message_id: 'file_msg_321',
      });

      const result = await processor.process(job);

      expect(result).toEqual({
        success: true,
        contactId: 123,
        messageId: 'file_msg_321',
        to: '+1234567890',
        timestamp: expect.any(String),
      });

      expect(cbbClient.sendFileMessage).toHaveBeenCalledWith(
        123,
        'https://example.com/document.pdf',
        'document',
      );
    });

    it('should handle different file types', async () => {
      const fileTypes: Array<'image' | 'document' | 'video' | 'audio'> = [
        'image',
        'document',
        'video',
        'audio',
      ];

      for (const fileType of fileTypes) {
        const jobData: WhatsAppJobData = {
          to: '+1234567890',
          fileUrl: `https://example.com/file.${fileType}`,
          fileType,
        };

        const job = createMockJob(jobData);

        contactResolver.resolveContact.mockResolvedValue(mockContact);
        cbbClient.sendFileMessage.mockResolvedValue({
          success: true,
          message_id: `${fileType}_msg`,
        });

        const result = await processor.process(job);

        expect(result.success).toBe(true);
        expect(cbbClient.sendFileMessage).toHaveBeenCalledWith(
          123,
          `https://example.com/file.${fileType}`,
          fileType,
        );
      }
    });
  });

  describe('error handling', () => {
    it('should throw error when no message content provided', async () => {
      const jobData: WhatsAppJobData = {
        to: '+1234567890',
        // No message, template, or fileUrl
      };

      const job = createMockJob(jobData);

      contactResolver.resolveContact.mockResolvedValue(mockContact);

      await expect(processor.process(job)).rejects.toThrow(
        'No message content provided (missing message, template, or fileUrl)',
      );
    });

    it('should handle contact resolution failures', async () => {
      const jobData: WhatsAppJobData = {
        to: '+invalid',
        message: 'Test message',
      };

      const job = createMockJob(jobData);

      contactResolver.resolveContact.mockRejectedValue(
        new ContactNotFoundError('+invalid'),
      );

      await expect(processor.process(job)).rejects.toThrow(
        ContactNotFoundError,
      );
    });

    it('should handle CBB API errors', async () => {
      const jobData: WhatsAppJobData = {
        to: '+1234567890',
        message: 'Test message',
      };

      const job = createMockJob(jobData);

      contactResolver.resolveContact.mockResolvedValue(mockContact);
      cbbClient.sendTextMessage.mockRejectedValue(
        new CbbApiError('Rate limit exceeded', 429),
      );

      await expect(processor.process(job)).rejects.toThrow(CbbApiError);
    });

    it('should return failure result for permanent errors without rethrowing', async () => {
      const jobData: WhatsAppJobData = {
        to: '+1234567890',
        message: 'Test message',
      };

      const job = createMockJob(jobData);

      contactResolver.resolveContact.mockResolvedValue(mockContact);
      cbbClient.sendTextMessage.mockRejectedValue(
        new CbbApiError('Unauthorized', 401),
      );

      const result = await processor.process(job);

      expect(result).toEqual({
        success: false,
        contactId: 0,
        to: '+1234567890',
        timestamp: expect.any(String),
        error: 'CBB API Error (401): Unauthorized',
      });
    });

    it('should rethrow retryable errors', async () => {
      const jobData: WhatsAppJobData = {
        to: '+1234567890',
        message: 'Test message',
      };

      const job = createMockJob(jobData);

      contactResolver.resolveContact.mockResolvedValue(mockContact);
      cbbClient.sendTextMessage.mockRejectedValue(
        new CbbApiError('Internal server error', 500),
      );

      await expect(processor.process(job)).rejects.toThrow(CbbApiError);
    });
  });

  describe('isPermanentFailure', () => {
    it('should identify permanent failures correctly', async () => {
      const permanentErrors = [
        new CbbApiError('Bad request', 400),
        new CbbApiError('Unauthorized', 401),
        new CbbApiError('Forbidden', 403),
        new CbbApiError('Not found', 404),
        new Error('invalid phone number'),
        new Error('malformed request'),
        new Error('template not found'),
      ];

      for (const error of permanentErrors) {
        const jobData: WhatsAppJobData = {
          to: '+1234567890',
          message: 'Test message',
        };

        const job = createMockJob(jobData);

        contactResolver.resolveContact.mockResolvedValue(mockContact);
        cgbClient.sendTextMessage.mockRejectedValue(error);

        const result = await processor.process(job);
        expect(result.success).toBe(false);
      }
    });

    it('should identify retryable failures correctly', async () => {
      const retryableErrors = [
        new CbbApiError('Internal server error', 500),
        new CbbApiError('Service unavailable', 503),
        new Error('Network timeout'),
        new Error('Connection reset'),
      ];

      for (const error of retryableErrors) {
        const jobData: WhatsAppJobData = {
          to: '+1234567890',
          message: 'Test message',
        };

        const job = createMockJob(jobData);

        contactResolver.resolveContact.mockResolvedValue(mockContact);
        cgbClient.sendTextMessage.mockRejectedValue(error);

        await expect(processor.process(job)).rejects.toThrow();
      }
    });
  });

  describe('formatErrorMessage', () => {
    it('should format different error types correctly', async () => {
      const testCases = [
        {
          error: new CbbApiError('Rate limit exceeded', 429),
          expected: 'CBB API Error (429): Rate limit exceeded',
        },
        {
          error: new ContactNotFoundError('+1234567890'),
          expected:
            'Contact resolution failed: Contact not found for phone: +1234567890',
        },
        {
          error: new Error('Generic error'),
          expected: 'Generic error',
        },
      ];

      for (const { error, expected } of testCases) {
        const jobData: WhatsAppJobData = {
          to: '+1234567890',
          message: 'Test message',
        };

        const job = createMockJob(jobData);

        contactResolver.resolveContact.mockResolvedValue(mockContact);
        cgbClient.sendTextMessage.mockRejectedValue(error);

        const result = await processor.process(job);
        expect(result.error).toBe(expected);
      }
    });
  });
});
