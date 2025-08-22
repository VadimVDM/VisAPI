import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { WorkflowSchema } from '@visapi/shared-types';
import { WorkflowSchemaLoaderService } from './workflow-schema-loader.service';
import { WorkflowValidationEngineService, ValidationResult } from './workflow-validation-engine.service';

/**
 * Main workflow validation service that orchestrates schema and business rule validation
 * Delegates to specialized services for schema loading and validation logic
 */
@Injectable()
export class WorkflowValidationService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowValidationService.name);
  private ajv: Ajv;
  private validateWorkflow: ValidateFunction<unknown>;

  constructor(
    private readonly schemaLoader: WorkflowSchemaLoaderService,
    private readonly validationEngine: WorkflowValidationEngineService,
  ) {}

  onModuleInit() {
    this.initializeAjv();
  }

  /**
   * Initialize AJV with workflow schema
   */
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
      const workflowSchema = this.schemaLoader.loadWorkflowSchema();
      this.validateWorkflow = this.ajv.compile(workflowSchema);
      this.logger.log('Workflow schema compiled successfully');
    } catch (error) {
      this.logger.error('Failed to compile workflow schema:', error);
      throw new Error('Failed to initialize workflow validation');
    }
  }

  /**
   * Validate a workflow definition against the JSON schema
   */
  validateWorkflowDefinition(workflow: unknown): ValidationResult {
    if (!this.validateWorkflow) {
      this.logger.error('Workflow validator not initialized');
      return {
        valid: false,
        errors: ['Workflow validator not initialized'],
      };
    }

    const isValid = this.validateWorkflow(workflow);

    if (isValid) {
      return { valid: true };
    }

    const errors = this.formatValidationErrors();
    this.logger.warn('Workflow validation failed:', { errors });

    return {
      valid: false,
      errors,
    };
  }

  /**
   * Format AJV validation errors into readable messages
   */
  private formatValidationErrors(): string[] {
    if (!this.validateWorkflow.errors) {
      return ['Unknown validation error'];
    }

    return this.validateWorkflow.errors.map((error) => {
      const path = error.instancePath || 'root';
      const message = error.message || 'Unknown error';

      // Include the data value in the error message for enum validation errors
      if (error.keyword === 'enum' && error.data !== undefined) {
        const dataStr = this.formatErrorData(error.data);
        return `${path}: ${message} (received: ${dataStr})`;
      }

      // Include keyword in the error message for better test compatibility
      if (error.keyword) {
        return `${path}: ${message} (${error.keyword})`;
      }

      return `${path}: ${message}`;
    });
  }

  /**
   * Format error data for display
   */
  private formatErrorData(data: unknown): string {
    if (typeof data === 'string') {
      return data;
    }
    if (typeof data === 'number') {
      return data.toString();
    }
    return JSON.stringify(data);
  }

  /**
   * Validate workflow step configuration based on step type
   * Delegates to validation engine
   */
  validateStepConfig(
    stepType: string,
    config: Record<string, unknown>,
  ): ValidationResult {
    return this.validationEngine.validateStepConfig(stepType, config);
  }

  /**
   * Validate cron expression format
   * Delegates to validation engine
   */
  validateCronExpression(expression: string): ValidationResult {
    return this.validationEngine.validateCronExpression(expression);
  }

  /**
   * Validate that step IDs are unique within the workflow
   * Delegates to validation engine
   */
  validateUniqueStepIds(steps: Array<{ id: string }>): ValidationResult {
    return this.validationEngine.validateUniqueStepIds(steps);
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

    // Validate business rules
    const businessRuleResult = this.validationEngine.validateBusinessRules(validWorkflow);
    if (!businessRuleResult.valid) {
      return businessRuleResult;
    }

    // Validate all workflow steps
    const stepsResult = this.validationEngine.validateWorkflowSteps(validWorkflow);
    if (!stepsResult.valid) {
      return stepsResult;
    }

    // Validate all workflow triggers
    const triggersResult = this.validationEngine.validateWorkflowTriggers(validWorkflow);
    if (!triggersResult.valid) {
      return triggersResult;
    }

    return { valid: true };
  }

  /**
   * Validate a partial workflow update
   * Used when updating existing workflows with PATCH requests
   */
  validatePartialWorkflow(
    partialWorkflow: Partial<WorkflowSchema>,
  ): ValidationResult {
    // Validate steps if provided
    if (partialWorkflow.steps) {
      const stepsResult = this.validationEngine.validateWorkflowSteps({
        ...partialWorkflow,
        steps: partialWorkflow.steps,
      } as WorkflowSchema);
      if (!stepsResult.valid) {
        return stepsResult;
      }
    }

    // Validate triggers if provided
    if (partialWorkflow.triggers) {
      const triggersResult = this.validationEngine.validateWorkflowTriggers({
        ...partialWorkflow,
        triggers: partialWorkflow.triggers,
      } as WorkflowSchema);
      if (!triggersResult.valid) {
        return triggersResult;
      }
    }

    return { valid: true };
  }

  /**
   * Reload the schema (useful for development or testing)
   */
  reloadSchema(): void {
    this.schemaLoader.clearCache();
    this.initializeAjv();
    this.logger.log('Workflow schema reloaded');
  }
}

// Re-export ValidationResult for backward compatibility
export { ValidationResult } from './workflow-validation-engine.service';