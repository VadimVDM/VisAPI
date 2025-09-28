import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowValidationService } from './workflow-validation.service';
import { WorkflowSchemaLoaderService } from './workflow-schema-loader.service';
import { WorkflowValidationEngineService } from './workflow-validation-engine.service';
import { WorkflowSchema } from '@visapi/shared-types';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

describe('WorkflowValidationService', () => {
  let service: WorkflowValidationService;

  beforeEach(async () => {
    const mockSchemaLoader = {
      loadWorkflowSchema: jest.fn().mockReturnValue({
        type: 'object',
        properties: {
          name: { type: 'string' },
          enabled: { type: 'boolean' },
          triggers: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['type', 'config'],
              properties: {
                type: {
                  type: 'string',
                  enum: ['webhook', 'cron', 'manual'],
                },
                config: { type: 'object' },
              },
            },
          },
          steps: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['id', 'type', 'config'],
              properties: {
                id: { type: 'string' },
                type: {
                  type: 'string',
                  enum: [
                    'slack.send',
                    'whatsapp.send',
                    'pdf.generate',
                    'email.send',
                  ],
                },
                config: {
                  type: 'object',
                  properties: {
                    contact: {
                      type: 'string',
                      pattern: '^\\+[1-9]\\d{1,14}$',
                    },
                    channel: { type: 'string' },
                    recipient: {
                      type: 'string',
                      format: 'email',
                    },
                    template: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        required: ['name', 'enabled', 'triggers', 'steps'],
      }),
    };

    const mockValidationEngine: jest.Mocked<Pick<WorkflowValidationEngineService, 'validateStepConfig' | 'validateCronExpression' | 'validateUniqueStepIds' | 'validateBusinessRules' | 'validateWorkflowSteps' | 'validateWorkflowTriggers'>> = {
      validateStepConfig: jest.fn((stepType: string, config: unknown): ValidationResult => {
        // Validate unknown step types
        const validStepTypes = [
          'slack.send',
          'whatsapp.send',
          'pdf.generate',
          'email.send',
        ];
        if (!validStepTypes.includes(stepType)) {
          return {
            valid: false,
            errors: [`Unknown step type: ${stepType}`],
          };
        }

        // Validate required fields
        const requiredFields: Record<string, string[]> = {
          'slack.send': ['channel'],
          'whatsapp.send': ['contact'],
          'pdf.generate': ['template'],
          'email.send': ['recipient'],
        };

        const required = requiredFields[stepType] || [];
        const configObj = config as Record<string, unknown>;
        const missing = required.filter((field) => !configObj[field]);
        if (missing.length > 0) {
          return {
            valid: false,
            errors: missing.map((field) => `Missing required field: ${field}`),
          };
        }

        // Validate phone format for whatsapp
        const configWithContact = config as { contact?: unknown };
        if (stepType === 'whatsapp.send' && configWithContact.contact) {
          const phoneRegex = /^\+[1-9]\d{1,14}$/;
          if (!phoneRegex.test(configWithContact.contact as string)) {
            return {
              valid: false,
              errors: [
                'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
              ],
            };
          }
        }

        // Validate email format for email.send
        const configWithRecipient = config as { recipient?: unknown };
        if (stepType === 'email.send' && configWithRecipient.recipient) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(configWithRecipient.recipient as string)) {
            return {
              valid: false,
              errors: ['Invalid email format'],
            };
          }
        }

        return { valid: true };
      }),
      validateCronExpression: jest.fn((expression: unknown): ValidationResult => {
        // Basic validation for cron expressions
        if (!expression || typeof expression !== 'string') {
          return {
            valid: false,
            errors: ['Cron expression must be a non-empty string'],
          };
        }

        const fields = expression.trim().split(/\s+/);
        if (fields.length !== 5) {
          return {
            valid: false,
            errors: ['Cron expression must have exactly 5 fields'],
          };
        }

        // Validate minute field (0-59)
        const minute = parseInt(fields[0]);
        if (
          fields[0] !== '*' &&
          !fields[0].includes('/') &&
          !fields[0].includes(',') &&
          !fields[0].includes('-')
        ) {
          if (isNaN(minute) || minute < 0 || minute > 59) {
            return {
              valid: false,
              errors: [`Invalid minute value: ${fields[0]}`],
            };
          }
        }

        return { valid: true };
      }),
      validateUniqueStepIds: jest.fn((steps: unknown): ValidationResult => {
        const stepsArray = steps as Array<{ id: string }>;
        const ids = stepsArray.map((step) => step.id);
        const uniqueIds = new Set(ids);

        if (ids.length !== uniqueIds.size) {
          const duplicates = ids.filter(
            (id, index) => ids.indexOf(id) !== index,
          );
          return {
            valid: false,
            errors: [`Duplicate step IDs found: ${duplicates.join(', ')}`],
          };
        }

        return { valid: true };
      }),
      validateBusinessRules: jest.fn((workflow: { triggers?: unknown[]; steps?: unknown[] }): ValidationResult => {
        if (!workflow.triggers || workflow.triggers.length === 0) {
          return {
            valid: false,
            errors: ['Workflow must have at least one trigger'],
          };
        }
        if (!workflow.steps || workflow.steps.length === 0) {
          return {
            valid: false,
            errors: ['Workflow must have at least one step'],
          };
        }
        return { valid: true };
      }),
      validateWorkflowSteps: jest.fn(function (workflow: unknown): ValidationResult {
        // Use the arrow function to access the mocked validateUniqueStepIds
        const wf = workflow as { steps: Array<{ id: string; type: string; config: unknown }> };
        const uniqueIdResult = mockValidationEngine.validateUniqueStepIds(
          wf.steps,
        );
        if (!uniqueIdResult.valid) {
          return uniqueIdResult;
        }

        // Validate each step configuration
        for (const step of wf.steps) {
          const stepResult = mockValidationEngine.validateStepConfig(
            step.type,
            step.config,
          );
          if (!stepResult.valid) {
            return {
              valid: false,
              errors: stepResult.errors?.map(
                (error: string) => `Step ${step.id}: ${error}`,
              ),
            };
          }
        }

        return { valid: true };
      }),
      validateWorkflowTriggers: jest.fn((workflow: unknown): ValidationResult => {
        const wf = workflow as { triggers: Array<{ type: string; config: { schedule?: string } }> };
        for (const trigger of wf.triggers) {
          if (trigger.type === 'cron' && trigger.config.schedule) {
            const cronResult = mockValidationEngine.validateCronExpression(
              trigger.config.schedule,
            );
            if (!cronResult.valid) {
              return {
                valid: false,
                errors: cronResult.errors?.map(
                  (error: string) => `Cron trigger: ${error}`,
                ),
              };
            }
          }
        }
        return { valid: true };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowValidationService,
        {
          provide: WorkflowSchemaLoaderService,
          useValue: mockSchemaLoader,
        },
        {
          provide: WorkflowValidationEngineService,
          useValue: mockValidationEngine,
        },
      ],
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

      const result = service.validateWorkflowDefinition(
        invalidWorkflow as WorkflowSchema,
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
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

      const result = service.validateWorkflowDefinition(
        invalidWorkflow as unknown as WorkflowSchema,
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(
        result.errors.some((error) => error.includes('invalid.type')),
      ).toBe(true);
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

      const result = service.validateWorkflowDefinition(
        invalidWorkflow as unknown as WorkflowSchema,
      );

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

      const result = service.validateWorkflowDefinition(
        invalidWorkflow as unknown as WorkflowSchema,
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.some((error) => error.includes('minItems'))).toBe(
        true,
      );
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
      expect(result.errors[0]).toContain('Unknown step type');
    });

    it('should reject whatsapp.send with missing contact', () => {
      const config = {
        template: 'test_template',
      };

      const result = service.validateStepConfig('whatsapp.send', config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors[0]).toContain('contact');
    });

    it('should reject whatsapp.send with invalid phone format', () => {
      const config = {
        contact: 'invalid-phone',
        template: 'test_template',
      };

      const result = service.validateStepConfig('whatsapp.send', config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors[0]).toContain('phone number format');
    });

    it('should reject email.send with invalid email format', () => {
      const config = {
        recipient: 'invalid-email',
        subject: 'Test',
      };

      const result = service.validateStepConfig('email.send', config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors[0]).toContain('email format');
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

      validCronExpressions.forEach((expression) => {
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

      invalidCronExpressions.forEach((expression) => {
        const result = service.validateCronExpression(expression);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('validateUniqueStepIds', () => {
    it('should validate unique step IDs', () => {
      const steps = [{ id: 'step-1' }, { id: 'step-2' }, { id: 'step-3' }];

      const result = service.validateUniqueStepIds(steps);

      expect(result.valid).toBe(true);
    });

    it('should reject duplicate step IDs', () => {
      const steps = [{ id: 'step-1' }, { id: 'step-2' }, { id: 'step-1' }];

      const result = service.validateUniqueStepIds(steps);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors[0]).toContain('Duplicate step IDs');
    });
  });

  describe('validateCompleteWorkflow', () => {
    it('should validate a complete valid workflow', () => {
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

      const result = service.validateCompleteWorkflow(validWorkflow);

      expect(result.valid).toBe(true);
    });

    it('should reject workflow with duplicate step IDs', () => {
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

      const result = service.validateCompleteWorkflow(
        invalidWorkflow as unknown as WorkflowSchema,
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors[0]).toContain('Duplicate step IDs');
    });

    it('should reject workflow with invalid cron schedule', () => {
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

      const result = service.validateCompleteWorkflow(
        invalidWorkflow as unknown as WorkflowSchema,
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors[0]).toContain('Cron trigger');
    });

    it('should reject workflow with invalid step configuration', () => {
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

      const result = service.validateCompleteWorkflow(
        invalidWorkflow as unknown as WorkflowSchema,
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors[0]).toContain('contact');
    });
  });
});
