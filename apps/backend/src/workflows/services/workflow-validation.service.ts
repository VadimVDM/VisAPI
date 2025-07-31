import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { WorkflowSchema } from '@visapi/shared-types';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

@Injectable()
export class WorkflowValidationService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowValidationService.name);
  private ajv: Ajv;
  private validateWorkflow: ValidateFunction<unknown>;

  onModuleInit() {
    this.initializeAjv();
  }

  private initializeAjv(): void {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      removeAdditional: true,
    });

    // Add format validation (email, uuid, etc.)
    addFormats(this.ajv);

    // Compile the workflow schema at boot time for performance
    try {
      const workflowSchema = this.getWorkflowSchema();

      this.validateWorkflow = this.ajv.compile(workflowSchema);
      this.logger.log('Workflow schema compiled successfully');
    } catch (error) {
      this.logger.error('Failed to compile workflow schema:', error);
      throw new Error('Failed to initialize workflow validation');
    }
  }

  private getWorkflowSchema(): Record<string, unknown> {
    // Try to read from file system first
    const possiblePaths = [
      join(__dirname, '../schemas/workflow.schema.json'),
      join(__dirname, '../../workflows/schemas/workflow.schema.json'),
      join(
        process.cwd(),
        'apps/backend/src/workflows/schemas/workflow.schema.json',
      ),
    ];

    for (const schemaPath of possiblePaths) {
      try {
        const schemaContent = readFileSync(schemaPath, 'utf8');
        return JSON.parse(schemaContent) as Record<string, unknown>;
      } catch {
        // Continue to next path
      }
    }

    // Fallback to inline schema if file not found
    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: 'Workflow Schema',
      description: 'Schema for validating workflow definitions',
      required: ['name', 'triggers', 'steps', 'enabled'],
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          description: 'Unique identifier for the workflow',
        },
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          description: 'Human-readable name for the workflow',
        },
        description: {
          type: 'string',
          maxLength: 500,
          description: 'Optional description of the workflow',
        },
        enabled: {
          type: 'boolean',
          description: 'Whether the workflow is active',
        },
        variables: {
          type: 'object',
          additionalProperties: true,
          description: 'Global variables available to all steps',
        },
        triggers: {
          type: 'array',
          minItems: 1,
          items: {
            $ref: '#/definitions/trigger',
          },
          description: 'Array of trigger configurations',
        },
        steps: {
          type: 'array',
          minItems: 1,
          items: {
            $ref: '#/definitions/step',
          },
          description: 'Array of workflow steps',
        },
      },
      definitions: {
        trigger: {
          type: 'object',
          required: ['type', 'config'],
          properties: {
            type: {
              type: 'string',
              enum: ['webhook', 'cron', 'manual'],
              description: 'Type of trigger',
            },
            config: {
              type: 'object',
              properties: {
                schedule: {
                  type: 'string',
                  description: 'Cron expression for scheduling',
                },
                timezone: {
                  type: 'string',
                  description: 'Timezone for cron execution',
                },
                endpoint: {
                  type: 'string',
                  description: 'Webhook endpoint identifier',
                },
              },
              additionalProperties: true,
            },
          },
        },
        step: {
          type: 'object',
          required: ['id', 'type', 'config'],
          properties: {
            id: {
              type: 'string',
              pattern: '^[a-zA-Z0-9_-]+$',
              minLength: 1,
              maxLength: 50,
              description: 'Unique identifier for the step within the workflow',
            },
            type: {
              type: 'string',
              enum: [
                'slack.send',
                'whatsapp.send',
                'pdf.generate',
                'email.send',
              ],
              description: 'Type of action to perform',
            },
            config: {
              type: 'object',
              properties: {
                channel: {
                  type: 'string',
                  description: 'Slack channel identifier',
                },
                message: {
                  type: 'string',
                  description: 'Message content',
                },
                template: {
                  type: 'string',
                  description: 'Template identifier for message',
                },
                contact: {
                  type: 'string',
                  pattern: '^\\+[1-9]\\d{1,14}$',
                  description: 'WhatsApp contact number in E.164 format',
                },
                variables: {
                  type: 'object',
                  additionalProperties: true,
                  description: 'Template variables',
                },
                data: {
                  type: 'object',
                  additionalProperties: true,
                  description: 'Data for PDF generation',
                },
                recipient: {
                  type: 'string',
                  format: 'email',
                  description: 'Email recipient',
                },
                subject: {
                  type: 'string',
                  description: 'Email subject',
                },
              },
              additionalProperties: true,
            },
            retries: {
              type: 'integer',
              minimum: 0,
              maximum: 10,
              default: 3,
              description: 'Number of retry attempts',
            },
            timeout: {
              type: 'integer',
              minimum: 1000,
              maximum: 300000,
              default: 30000,
              description: 'Step timeout in milliseconds',
            },
          },
        },
      },
    };
  }

  /**
   * Validate a workflow definition against the JSON schema
   */
  validateWorkflowDefinition(workflow: unknown): ValidationResult {
    if (!this.validateWorkflow) {
      console.error('Workflow validator not initialized');
      return {
        valid: false,
        errors: ['Workflow validator not initialized'],
      };
    }

    const isValid = this.validateWorkflow(workflow);

    if (isValid) {
      return { valid: true };
    }

    const errors = this.validateWorkflow.errors?.map((error) => {
      const path = error.instancePath || 'root';
      const message = error.message || 'Unknown error';

      // Include the data value in the error message for enum validation errors
      if (error.keyword === 'enum' && error.data !== undefined) {
        const dataStr =
          typeof error.data === 'string'
            ? error.data
            : typeof error.data === 'number'
              ? error.data.toString()
              : JSON.stringify(error.data);
        return `${path}: ${message} (received: ${dataStr})`;
      }

      // Include keyword in the error message for better test compatibility
      if (error.keyword) {
        return `${path}: ${message} (${error.keyword})`;
      }

      return `${path}: ${message}`;
    }) || ['Unknown validation error'];

    this.logger.warn('Workflow validation failed:', { errors });

    return {
      valid: false,
      errors,
    };
  }

  /**
   * Validate workflow step configuration based on step type
   */
  validateStepConfig(
    stepType: string,
    config: Record<string, unknown>,
  ): ValidationResult {
    // Basic validation for required fields based on step type
    const requiredFields: Record<string, string[]> = {
      'slack.send': ['channel'],
      'whatsapp.send': ['contact'],
      'pdf.generate': ['template'],
      'email.send': ['recipient'],
    };

    const required = requiredFields[stepType];
    if (!required) {
      return {
        valid: false,
        errors: [`Unknown step type: ${stepType}`],
      };
    }

    const missing = required.filter((field) => !config[field]);
    if (missing.length > 0) {
      return {
        valid: false,
        errors: missing.map((field) => `Missing required field: ${field}`),
      };
    }

    // Validate specific field formats
    if (stepType === 'whatsapp.send' && config.contact) {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      const contact = config.contact as string;
      if (!phoneRegex.test(contact)) {
        return {
          valid: false,
          errors: [
            'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
          ],
        };
      }
    }

    if (stepType === 'email.send' && config.recipient) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const recipient = config.recipient as string;
      if (!emailRegex.test(recipient)) {
        return {
          valid: false,
          errors: ['Invalid email format'],
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate cron expression format
   */
  validateCronExpression(expression: string): ValidationResult {
    if (!expression || typeof expression !== 'string') {
      return {
        valid: false,
        errors: ['Cron expression must be a non-empty string'],
      };
    }

    // Basic cron validation (5 fields - minute, hour, day, month, day-of-week)
    const fields = expression.trim().split(/\s+/);
    if (fields.length !== 5) {
      return {
        valid: false,
        errors: ['Cron expression must have exactly 5 fields'],
      };
    }

    // Validate each field has valid characters and ranges
    const cronFieldRegex =
      /^(\*\/[0-9]+|\*|[0-9]+(-[0-9]+)?(\/[0-9]+)?|[0-9,-]+)$/;

    // Valid ranges for each field: minute, hour, day, month, day-of-week
    const validRanges = [
      { min: 0, max: 59, name: 'minute' },
      { min: 0, max: 23, name: 'hour' },
      { min: 1, max: 31, name: 'day' },
      { min: 1, max: 12, name: 'month' },
      { min: 0, max: 7, name: 'day-of-week' },
    ];

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (!cronFieldRegex.test(field)) {
        return {
          valid: false,
          errors: [`Invalid cron field ${i + 1}: ${field}`],
        };
      }

      // Check ranges for numeric values
      if (field !== '*' && !field.includes('/')) {
        const numbers = field.split(',').flatMap((part) => {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            return [start, end];
          }
          return [Number(part)];
        });

        for (const num of numbers) {
          if (
            isNaN(num) ||
            num < validRanges[i].min ||
            num > validRanges[i].max
          ) {
            return {
              valid: false,
              errors: [`Invalid ${validRanges[i].name} value: ${num}`],
            };
          }
        }
      }
    }

    return { valid: true };
  }

  /**
   * Validate that step IDs are unique within the workflow
   */
  validateUniqueStepIds(steps: Array<{ id: string }>): ValidationResult {
    const ids = steps.map((step) => step.id);
    const uniqueIds = new Set(ids);

    if (ids.length !== uniqueIds.size) {
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      return {
        valid: false,
        errors: [`Duplicate step IDs found: ${duplicates.join(', ')}`],
      };
    }

    return { valid: true };
  }

  /**
   * Comprehensive workflow validation combining all checks
   */
  validateCompleteWorkflow(workflow: unknown): ValidationResult {
    // First validate against JSON schema
    const schemaResult = this.validateWorkflowDefinition(workflow);
    if (!schemaResult.valid) {
      return schemaResult;
    }

    // Cast to WorkflowSchema since we know it's valid
    const validWorkflow = workflow as WorkflowSchema;

    // Validate unique step IDs
    const uniqueIdResult = this.validateUniqueStepIds(validWorkflow.steps);
    if (!uniqueIdResult.valid) {
      return uniqueIdResult;
    }

    // Validate each step configuration
    for (const step of validWorkflow.steps) {
      const stepResult = this.validateStepConfig(step.type, step.config);
      if (!stepResult.valid) {
        return {
          valid: false,
          errors: stepResult.errors?.map(
            (error) => `Step ${step.id}: ${error}`,
          ),
        };
      }
    }

    // Validate cron expressions in triggers
    for (const trigger of validWorkflow.triggers) {
      if (trigger.type === 'cron' && trigger.config.schedule) {
        const cronResult = this.validateCronExpression(trigger.config.schedule);
        if (!cronResult.valid) {
          return {
            valid: false,
            errors: cronResult.errors?.map((error) => `Cron trigger: ${error}`),
          };
        }
      }
    }

    return { valid: true };
  }
}
