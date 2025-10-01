import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import {
  JOB_NAMES,
  QUEUE_NAMES,
  WorkflowSchema,
  WorkflowStep,
} from '@visapi/shared-types';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

interface WorkflowJobData {
  workflowId: string;
  trigger: {
    type: string;
    schedule?: string;
  };
  metadata?: Record<string, any>;
  context?: Record<string, any>;
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
      const steps = (workflow.schema as any).steps || [];
      const workflowContext = { ...context, workflowId, trigger };

      for (const step of steps) {
        await this.executeStep(step, workflowContext);
      }

      this.logger.log(
        `Workflow ${workflowId} completed successfully with ${steps.length} steps`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process workflow ${workflowId}`,
        (error as any)?.stack,
      );
      throw error;
    }
  }

  private async getWorkflow(workflowId: string): Promise<any | null> {
    const { data, error } = await this.supabase.client
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error) {
      this.logger.error(
        `Failed to fetch workflow ${workflowId}`,
        (error as any)?.stack,
      );
      return null;
    }

    return data;
  }

  private async executeStep(
    step: WorkflowStep,
    context: Record<string, any>,
  ): Promise<void> {
    this.logger.log(`Executing workflow step ${step.id} of type ${step.type}`);

    try {
      // Resolve any template variables in the step config
      const resolvedConfig = this.resolveTemplateVariables(
        step.config,
        context,
      );

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
          const delayMs = resolvedConfig.duration || 1000;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          break;

        default:
          this.logger.warn(`Unknown step type ${step.type}, skipping`);
      }

      this.logger.log(`Workflow step ${step.id} executed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to execute workflow step ${step.id} of type ${step.type}: ${(error as any)?.message}`,
        (error as any)?.stack,
      );

      // Check if step has retry configuration
      if (step.retries && step.retries > 0) {
        throw error; // Let BullMQ handle retries
      }
    }
  }

  private resolveTemplateVariables(
    config: any,
    context: Record<string, any>,
  ): any {
    if (typeof config === 'string') {
      // Replace template variables like {{workflow.id}} with actual values
      return config.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const value = this.getValueByPath(context, path.trim());
        return value !== undefined ? String(value) : match;
      });
    }

    if (Array.isArray(config)) {
      return config.map((item) => this.resolveTemplateVariables(item, context));
    }

    if (typeof config === 'object' && config !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(config)) {
        resolved[key] = this.resolveTemplateVariables(value, context);
      }
      return resolved;
    }

    return config;
  }

  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}
