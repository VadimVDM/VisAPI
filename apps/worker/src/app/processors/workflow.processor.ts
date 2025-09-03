import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SupabaseService } from '@visapi/core-supabase';
import { JOB_NAMES, QUEUE_NAMES, WorkflowSchema, WorkflowStep } from '@visapi/shared-types';
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
  constructor(
    @InjectPinoLogger(WorkflowProcessor.name)
    private readonly logger: PinoLogger,
    private readonly supabase: SupabaseService,
    @InjectQueue(QUEUE_NAMES.DEFAULT) private defaultQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CRITICAL) private criticalQueue: Queue,
    @InjectQueue(QUEUE_NAMES.BULK) private bulkQueue: Queue,
  ) {}

  async process(data: WorkflowJobData): Promise<void> {
    const { workflowId, trigger, context = {} } = data;

    this.logger.info(
      { workflowId, trigger },
      'Starting workflow processing',
    );

    try {
      // Fetch the workflow from database
      const workflow = await this.getWorkflow(workflowId);
      
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      if (!workflow.enabled) {
        this.logger.warn(
          { workflowId },
          'Workflow is disabled, skipping execution',
        );
        return;
      }

      // Execute each step in the workflow
      const steps = (workflow.schema as any).steps || [];
      const workflowContext = { ...context, workflowId, trigger };

      for (const step of steps) {
        await this.executeStep(step, workflowContext);
      }

      this.logger.info(
        { workflowId, stepCount: steps.length },
        'Workflow processing completed successfully',
      );
    } catch (error) {
      this.logger.error(
        { error, workflowId },
        'Failed to process workflow',
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
        { error, workflowId },
        'Failed to fetch workflow',
      );
      return null;
    }

    return data;
  }

  private async executeStep(
    step: WorkflowStep,
    context: Record<string, any>,
  ): Promise<void> {
    this.logger.info(
      { stepId: step.id, stepType: step.type },
      'Executing workflow step',
    );

    try {
      // Resolve any template variables in the step config
      const resolvedConfig = this.resolveTemplateVariables(
        step.config,
        context,
      );

      // Queue the appropriate job based on step type
      const jobData = {
        stepId: step.id,
        workflowId: context.workflowId,
        config: resolvedConfig,
        context,
      };

      switch (step.type) {
        case 'slack.send':
          await this.defaultQueue.add(
            JOB_NAMES.SEND_SLACK,
            jobData,
          );
          break;

        case 'whatsapp.send':
          await this.defaultQueue.add(
            JOB_NAMES.SEND_WHATSAPP,
            jobData,
          );
          break;

        case 'pdf.generate':
          await this.defaultQueue.add(
            JOB_NAMES.GENERATE_PDF,
            jobData,
          );
          break;

        case 'delay':
          // Handle delay step inline
          const delayMs = resolvedConfig.duration || 1000;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          break;

        default:
          this.logger.warn(
            { stepType: step.type },
            'Unknown step type, skipping',
          );
      }

      this.logger.info(
        { stepId: step.id, stepType: step.type },
        'Workflow step executed successfully',
      );
    } catch (error) {
      this.logger.error(
        { error, stepId: step.id, stepType: step.type },
        'Failed to execute workflow step',
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