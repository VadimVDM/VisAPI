import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowValidationService } from './workflow-validation.service';
import { WorkflowSchema } from '@visapi/shared-types';

describe('WorkflowValidationService', () => {
  let service: WorkflowValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowValidationService],
    }).compile();

    service = module.get<WorkflowValidationService>(WorkflowValidationService);
    // Initialize the service (normally called by NestJS)
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateWorkflowDefinition', () => {
    it('should validate a correct workflow schema', () => {
      const validWorkflow: WorkflowSchema = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Workflow',
        description: 'A test workflow',
        enabled: true,
        variables: { testVar: 'value' },
        triggers: [
          {
            type: 'cron',
            config: {
              schedule: '0 9 * * *',
            },
          },
        ],
        steps: [
          {
            id: 'step-1',
            type: 'whatsapp.send',
            config: {
              contact: '+1234567890',
              template: 'test_template',
            },
            retries: 3,
          },
        ],
      };

      const result = service.validateWorkflowDefinition(validWorkflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject workflow with missing required fields', () => {
      const invalidWorkflow = {
        name: 'Test Workflow',
        // Missing required fields: triggers, steps, enabled
      };

      const result = service.validateWorkflowDefinition(invalidWorkflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should reject workflow with invalid step type', () => {
      const invalidWorkflow = {
        name: 'Test Workflow',
        enabled: true,
        triggers: [
          {
            type: 'cron',
            config: {
              schedule: '0 9 * * *',
            },
          },
        ],
        steps: [
          {
            id: 'step-1',
            type: 'invalid.type',
            config: {},
          },
        ],
      };

      const result = service.validateWorkflowDefinition(invalidWorkflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(error => error.includes('invalid.type'))).toBe(true);
    });

    it('should reject workflow with invalid phone number format', () => {
      const invalidWorkflow = {
        name: 'Test Workflow',
        enabled: true,
        triggers: [
          {
            type: 'cron',
            config: {
              schedule: '0 9 * * *',
            },
          },
        ],
        steps: [
          {
            id: 'step-1',
            type: 'whatsapp.send',
            config: {
              contact: 'invalid-phone',
              template: 'test_template',
            },
          },
        ],
      };

      const result = service.validateWorkflowDefinition(invalidWorkflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject workflow with empty steps array', () => {
      const invalidWorkflow = {
        name: 'Test Workflow',
        enabled: true,
        triggers: [
          {
            type: 'cron',
            config: {
              schedule: '0 9 * * *',
            },
          },
        ],
        steps: [],
      };

      const result = service.validateWorkflowDefinition(invalidWorkflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(error => error.includes('minItems'))).toBe(true);
    });
  });

  describe('validateStepConfig', () => {
    it('should validate slack.send step config', () => {
      const config = {
        channel: '#general',
        message: 'Test message',
      };

      const result = service.validateStepConfig('slack.send', config);

      expect(result.valid).toBe(true);
    });

    it('should validate whatsapp.send step config', () => {
      const config = {
        contact: '+1234567890',
        template: 'test_template',
      };

      const result = service.validateStepConfig('whatsapp.send', config);

      expect(result.valid).toBe(true);
    });

    it('should validate pdf.generate step config', () => {
      const config = {
        template: 'visa_certificate',
        data: { name: 'John Doe' },
      };

      const result = service.validateStepConfig('pdf.generate', config);

      expect(result.valid).toBe(true);
    });

    it('should validate email.send step config', () => {
      const config = {
        recipient: 'test@example.com',
        subject: 'Test Email',
      };

      const result = service.validateStepConfig('email.send', config);

      expect(result.valid).toBe(true);
    });

    it('should reject unknown step type', () => {
      const config = {};

      const result = service.validateStepConfig('unknown.type', config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Unknown step type');
    });

    it('should reject whatsapp.send with missing contact', () => {
      const config = {
        template: 'test_template',
      };

      const result = service.validateStepConfig('whatsapp.send', config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('contact');
    });

    it('should reject whatsapp.send with invalid phone format', () => {
      const config = {
        contact: 'invalid-phone',
        template: 'test_template',
      };

      const result = service.validateStepConfig('whatsapp.send', config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('phone number format');
    });

    it('should reject email.send with invalid email format', () => {
      const config = {
        recipient: 'invalid-email',
        subject: 'Test',
      };

      const result = service.validateStepConfig('email.send', config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('email format');
    });
  });

  describe('validateCronExpression', () => {
    it('should validate correct cron expressions', () => {
      const validCronExpressions = [
        '0 9 * * *',
        '0 9 * * 1-5',
        '*/15 * * * *',
        '0 0 1 * *',
        '0 9,17 * * *',
      ];

      validCronExpressions.forEach(expression => {
        const result = service.validateCronExpression(expression);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid cron expressions', () => {
      const invalidCronExpressions = [
        'invalid',
        '0 9',
        '0 9 * * * * *',
        '60 9 * * *',
        '',
      ];

      invalidCronExpressions.forEach(expression => {
        const result = service.validateCronExpression(expression);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('validateUniqueStepIds', () => {
    it('should validate unique step IDs', () => {
      const steps = [
        { id: 'step-1' },
        { id: 'step-2' },
        { id: 'step-3' },
      ];

      const result = service.validateUniqueStepIds(steps);

      expect(result.valid).toBe(true);
    });

    it('should reject duplicate step IDs', () => {
      const steps = [
        { id: 'step-1' },
        { id: 'step-2' },
        { id: 'step-1' },
      ];

      const result = service.validateUniqueStepIds(steps);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Duplicate step IDs');
    });
  });

  describe('validateCompleteWorkflow', () => {
    it('should validate a complete valid workflow', async () => {
      const validWorkflow: WorkflowSchema = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Workflow',
        description: 'A test workflow',
        enabled: true,
        variables: { testVar: 'value' },
        triggers: [
          {
            type: 'cron',
            config: {
              schedule: '0 9 * * *',
            },
          },
        ],
        steps: [
          {
            id: 'step-1',
            type: 'whatsapp.send',
            config: {
              contact: '+1234567890',
              template: 'test_template',
            },
            retries: 3,
          },
        ],
      };

      const result = await service.validateCompleteWorkflow(validWorkflow);

      expect(result.valid).toBe(true);
    });

    it('should reject workflow with duplicate step IDs', async () => {
      const invalidWorkflow = {
        name: 'Test Workflow',
        enabled: true,
        triggers: [
          {
            type: 'cron',
            config: {
              schedule: '0 9 * * *',
            },
          },
        ],
        steps: [
          {
            id: 'step-1',
            type: 'whatsapp.send',
            config: {
              contact: '+1234567890',
              template: 'test_template',
            },
          },
          {
            id: 'step-1',
            type: 'slack.send',
            config: {
              channel: '#general',
              message: 'Test',
            },
          },
        ],
      };

      const result = await service.validateCompleteWorkflow(invalidWorkflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Duplicate step IDs');
    });

    it('should reject workflow with invalid cron schedule', async () => {
      const invalidWorkflow = {
        name: 'Test Workflow',
        enabled: true,
        triggers: [
          {
            type: 'cron',
            config: {
              schedule: 'invalid-cron',
            },
          },
        ],
        steps: [
          {
            id: 'step-1',
            type: 'whatsapp.send',
            config: {
              contact: '+1234567890',
              template: 'test_template',
            },
          },
        ],
      };

      const result = await service.validateCompleteWorkflow(invalidWorkflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Cron trigger');
    });

    it('should reject workflow with invalid step configuration', async () => {
      const invalidWorkflow = {
        name: 'Test Workflow',
        enabled: true,
        triggers: [
          {
            type: 'cron',
            config: {
              schedule: '0 9 * * *',
            },
          },
        ],
        steps: [
          {
            id: 'step-1',
            type: 'whatsapp.send',
            config: {
              contact: 'invalid-phone',
              template: 'test_template',
            },
          },
        ],
      };

      const result = await service.validateCompleteWorkflow(invalidWorkflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('contact');
    });
  });
});