import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import {
  JOB_NAMES,
  QUEUE_NAMES,
  WorkflowSchema,
  WorkflowStep,
  Database,
} from '@visapi/shared-types';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

interface WorkflowJobData {
  workflowId: string;
  trigger: {
    type: string;
    schedule?: string;
  };
  metadata?: Record<string, JsonValue>;
  context?: WorkflowContext;
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type WorkflowContext = Record<string, JsonValue>;

type WorkflowRow = Database['public']['Tables']['workflows']['Row'];

interface WorkflowDefinition {
  id: string;
  enabled: boolean;
  schema: WorkflowSchemaDefinition;
}

interface WorkflowSchemaDefinition {
  steps: WorkflowStepDefinition[];
  variables?: WorkflowContext;
}

type WorkflowStepConfig = Record<string, JsonValue>;

interface WorkflowStepDefinition {
  id: string;
  type: WorkflowStep['type'];
  config: WorkflowStepConfig;
  retries?: number;
  timeout?: number;
}

@Injectable()
export class WorkflowProcessor {
  private readonly logger = new Logger(WorkflowProcessor.name);

  constructor(
    private readonly supabase: SupabaseService,
    @InjectQueue(QUEUE_NAMES.DEFAULT) private defaultQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CRITICAL) private criticalQueue: Queue,
    @InjectQueue(QUEUE_NAMES.BULK) private bulkQueue: Queue,
  ) {}

  async process(data: WorkflowJobData): Promise<void> {
    const { workflowId, trigger, context = {} } = data;

    this.logger.log(`Starting workflow processing for ${workflowId}`);

    try {
      // Fetch the workflow from database
      const workflow = await this.getWorkflow(workflowId);

      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      if (!workflow.enabled) {
        this.logger.warn(
          `Workflow ${workflowId} is disabled, skipping execution`,
        );
        return;
      }

      // Execute each step in the workflow
      const steps = workflow.schema.steps;
      const workflowContext: WorkflowContext = {
        ...context,
        workflowId,
        trigger: this.safeJsonValue(trigger),
      };

      for (const step of steps) {
        await this.executeStep(step, workflowContext);
      }

      this.logger.log(
        `Workflow ${workflowId} completed successfully with ${steps.length} steps`,
      );
    } catch (error: unknown) {
      const { message, stack } = this.describeError(error);
      this.logger.error(
        `Failed to process workflow ${workflowId}: ${message}`,
        stack,
      );
      throw error;
    }
  }

  private async getWorkflow(
    workflowId: string,
  ): Promise<WorkflowDefinition | null> {
    const { data, error } = await this.supabase.client
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error) {
      const stack = (error as { stack?: string | undefined })?.stack;
      this.logger.error(`Failed to fetch workflow ${workflowId}`, stack);
      return null;
    }

    if (!data) {
      return null;
    }

    const normalized = this.normalizeWorkflow(data as WorkflowRow);
    if (!normalized) {
      this.logger.error(
        `Workflow ${workflowId} has invalid schema and cannot be processed`,
      );
      return null;
    }

    return normalized;
  }

  private async executeStep(
    step: WorkflowStepDefinition,
    context: WorkflowContext,
  ): Promise<void> {
    this.logger.log(`Executing workflow step ${step.id} of type ${step.type}`);

    try {
      // Resolve any template variables in the step config
      const resolvedConfigValue = this.resolveTemplateVariables(
        step.config,
        context,
      );
      const resolvedConfig =
        resolvedConfigValue &&
        typeof resolvedConfigValue === 'object' &&
        !Array.isArray(resolvedConfigValue)
          ? (resolvedConfigValue as WorkflowStepConfig)
          : ({} as WorkflowStepConfig);

      // Queue the appropriate job based on step type
      // Spread resolvedConfig directly for processor compatibility
      const jobData = {
        ...resolvedConfig,
        stepId: step.id,
        workflowId: context.workflowId,
        context,
      };

      switch (step.type) {
        case 'slack.send':
          await this.defaultQueue.add(JOB_NAMES.SEND_SLACK, jobData);
          break;

        case 'whatsapp.send':
          await this.defaultQueue.add(JOB_NAMES.SEND_WHATSAPP, jobData);
          break;

        case 'pdf.generate':
          await this.defaultQueue.add(JOB_NAMES.GENERATE_PDF, jobData);
          break;

        case 'delay':
          // Handle delay step inline
          const delayMs = this.extractNumber(resolvedConfig.duration, 1000);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          break;

        default:
          this.logger.warn(`Unknown step type ${step.type}, skipping`);
      }

      this.logger.log(`Workflow step ${step.id} executed successfully`);
    } catch (error: unknown) {
      const { message, stack } = this.describeError(error);
      this.logger.error(
        `Failed to execute workflow step ${step.id} of type ${step.type}: ${message}`,
        stack,
      );

      // Check if step has retry configuration
      if (step.retries && step.retries > 0) {
        throw error; // Let BullMQ handle retries
      }
    }
  }

  private resolveTemplateVariables(
    config: JsonValue,
    context: WorkflowContext,
  ): JsonValue {
    if (typeof config === 'string') {
      // Replace template variables like {{workflow.id}} with actual values
      return config.replace(
        /\{\{([^}]+)\}\}/g,
        (match: string, path: string) => {
          const value = this.getValueByPath(context, path.trim());
          return value !== undefined ? this.jsonValueToString(value) : match;
        },
      );
    }

    if (Array.isArray(config)) {
      return config.map((item) => this.resolveTemplateVariables(item, context));
    }

    if (typeof config === 'object' && config !== null) {
      const resolvedEntries = Object.entries(config).reduce<WorkflowStepConfig>(
        (acc, [key, value]) => {
          acc[key] = this.resolveTemplateVariables(value, context);
          return acc;
        },
        {},
      );
      return resolvedEntries;
    }

    return config;
  }

  private getValueByPath(
    context: WorkflowContext,
    path: string,
  ): JsonValue | undefined {
    const segments = path.split('.');
    let current: JsonValue | undefined = context;

    for (const segment of segments) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (Array.isArray(current)) {
        const index = Number(segment);
        if (!Number.isInteger(index) || index < 0 || index >= current.length) {
          return undefined;
        }
        current = current[index];
        continue;
      }

      if (typeof current === 'object') {
        const record = current as { [key: string]: JsonValue };
        current = record[segment];
        continue;
      }

      return undefined;
    }

    return current;
  }

  private normalizeWorkflow(row: WorkflowRow): WorkflowDefinition | null {
    const schema = this.normalizeSchema(row.schema);
    if (!schema) {
      return null;
    }

    return {
      id: row.id,
      enabled: row.enabled,
      schema,
    };
  }

  private normalizeSchema(schema: unknown): WorkflowSchemaDefinition | null {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      return null;
    }

    const raw = schema as Partial<WorkflowSchema>;
    const steps = Array.isArray(raw.steps) ? raw.steps : [];
    const normalizedSteps = steps
      .map((step) => this.normalizeStep(step))
      .filter((step): step is WorkflowStepDefinition => step !== null);

    if (normalizedSteps.length === 0) {
      return null;
    }

    return {
      steps: normalizedSteps,
      variables: this.normalizeVariables(raw.variables),
    };
  }

  private normalizeStep(step: unknown): WorkflowStepDefinition | null {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      return null;
    }

    const candidate = step as Partial<WorkflowStep>;
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.type !== 'string'
    ) {
      return null;
    }

    const config: WorkflowStepConfig = {};
    if (
      candidate.config &&
      typeof candidate.config === 'object' &&
      !Array.isArray(candidate.config)
    ) {
      for (const [key, value] of Object.entries(candidate.config)) {
        const safeValue = this.safeJsonValue(value);
        if (safeValue !== undefined) {
          config[key] = safeValue;
        }
      }
    }

    return {
      id: candidate.id,
      type: candidate.type,
      config,
      retries: candidate.retries,
      timeout: candidate.timeout,
    };
  }

  private normalizeVariables(variables: unknown): WorkflowContext | undefined {
    if (
      !variables ||
      typeof variables !== 'object' ||
      Array.isArray(variables)
    ) {
      return undefined;
    }

    const entries = Object.entries(variables as Record<string, unknown>);
    const result: WorkflowContext = {};
    for (const [key, value] of entries) {
      const safeValue = this.safeJsonValue(value);
      if (safeValue !== undefined) {
        result[key] = safeValue;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private safeJsonValue(value: unknown): JsonValue | undefined {
    if (value === null) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      const normalizedArray = value
        .map((item) => this.safeJsonValue(item))
        .filter((item): item is JsonValue => item !== undefined);
      return normalizedArray;
    }

    if (typeof value === 'object') {
      const normalizedObject: { [key: string]: JsonValue } = {};
      for (const [key, entry] of Object.entries(
        value as Record<string, unknown>,
      )) {
        const safeEntry = this.safeJsonValue(entry);
        if (safeEntry !== undefined) {
          normalizedObject[key] = safeEntry;
        }
      }
      return normalizedObject;
    }

    return undefined;
  }

  private describeError(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    try {
      return { message: JSON.stringify(error) };
    } catch {
      return { message: 'Unknown error' };
    }
  }

  private extractNumber(
    value: JsonValue | undefined,
    fallback: number,
  ): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return fallback;
  }

  private jsonValueToString(value: JsonValue): string {
    if (value === null) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return 'Unknown value';
    }
  }
}
