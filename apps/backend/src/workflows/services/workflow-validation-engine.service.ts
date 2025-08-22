import { Injectable, Logger } from '@nestjs/common';
import { WorkflowSchema } from '@visapi/shared-types';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Service responsible for custom workflow validation logic
 * Handles step-specific validation, cron expressions, and business rules
 */
@Injectable()
export class WorkflowValidationEngineService {
  private readonly logger = new Logger(WorkflowValidationEngineService.name);

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
    const formatValidation = this.validateFieldFormats(stepType, config);
    if (!formatValidation.valid) {
      return formatValidation;
    }

    return { valid: true };
  }

  /**
   * Validate field formats based on step type
   */
  private validateFieldFormats(
    stepType: string,
    config: Record<string, unknown>,
  ): ValidationResult {
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

    if (stepType === 'slack.send' && config.channel) {
      const channel = config.channel as string;
      if (!channel.startsWith('#') && !channel.startsWith('@')) {
        return {
          valid: false,
          errors: ['Slack channel must start with # or @'],
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
      const rangeValidation = this.validateCronFieldRange(
        field,
        validRanges[i],
      );
      if (!rangeValidation.valid) {
        return rangeValidation;
      }
    }

    return { valid: true };
  }

  /**
   * Validate cron field range values
   */
  private validateCronFieldRange(
    field: string,
    range: { min: number; max: number; name: string },
  ): ValidationResult {
    if (field === '*' || field.includes('/')) {
      return { valid: true };
    }

    const numbers = field.split(',').flatMap((part) => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        return [start, end];
      }
      return [Number(part)];
    });

    for (const num of numbers) {
      if (isNaN(num) || num < range.min || num > range.max) {
        return {
          valid: false,
          errors: [`Invalid ${range.name} value: ${num}`],
        };
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
   * Validate all workflow steps
   */
  validateWorkflowSteps(workflow: WorkflowSchema): ValidationResult {
    // Validate unique step IDs
    const uniqueIdResult = this.validateUniqueStepIds(workflow.steps);
    if (!uniqueIdResult.valid) {
      return uniqueIdResult;
    }

    // Validate each step configuration
    for (const step of workflow.steps) {
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

    return { valid: true };
  }

  /**
   * Validate all workflow triggers
   */
  validateWorkflowTriggers(workflow: WorkflowSchema): ValidationResult {
    for (const trigger of workflow.triggers) {
      if (trigger.type === 'cron' && trigger.config.schedule) {
        const cronResult = this.validateCronExpression(
          trigger.config.schedule,
        );
        if (!cronResult.valid) {
          return {
            valid: false,
            errors: cronResult.errors?.map(
              (error) => `Cron trigger: ${error}`,
            ),
          };
        }
      }

      // Validate webhook triggers
      if (trigger.type === 'webhook' && !trigger.config.endpoint) {
        return {
          valid: false,
          errors: ['Webhook trigger requires an endpoint configuration'],
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate workflow business rules
   */
  validateBusinessRules(workflow: WorkflowSchema): ValidationResult {
    // Check for at least one active trigger
    if (!workflow.triggers || workflow.triggers.length === 0) {
      return {
        valid: false,
        errors: ['Workflow must have at least one trigger'],
      };
    }

    // Check for at least one step
    if (!workflow.steps || workflow.steps.length === 0) {
      return {
        valid: false,
        errors: ['Workflow must have at least one step'],
      };
    }

    // Validate workflow name
    if (!workflow.name || workflow.name.trim().length === 0) {
      return {
        valid: false,
        errors: ['Workflow must have a name'],
      };
    }

    // Check for reasonable limits
    if (workflow.steps.length > 50) {
      return {
        valid: false,
        errors: ['Workflow cannot have more than 50 steps'],
      };
    }

    if (workflow.triggers.length > 10) {
      return {
        valid: false,
        errors: ['Workflow cannot have more than 10 triggers'],
      };
    }

    return { valid: true };
  }
}