import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SupabaseService } from '@visapi/core-supabase';
import { QueueService } from '../queue/queue.service';
import { QUEUE_NAMES, JOB_NAMES, WorkflowSchema } from '@visapi/shared-types';

@Injectable()
export class CronSeederService implements OnModuleInit {
  constructor(
    @InjectPinoLogger(CronSeederService.name)
    private readonly logger: PinoLogger,
    private readonly supabase: SupabaseService,
    private readonly queueService: QueueService,
  ) {}

  async onModuleInit() {
    try {
      await this.seedCronJobs();
    } catch (error) {
      this.logger.error(
        { error },
        'Failed to seed cron jobs during startup - application will continue without cron job seeding'
      );
      // Don't throw the error to prevent application startup failure
    }
  }

  async seedCronJobs(): Promise<void> {
    this.logger.info('Starting cron job seeding');

    try {
      // Get all enabled workflows with cron triggers
      const workflows = await this.getWorkflowsWithCronTriggers();
      
      if (workflows.length === 0) {
        this.logger.info('No workflows with cron triggers found');
      } else {
        this.logger.info(
          { count: workflows.length },
          'Found workflows with cron triggers',
        );
      }

      // Clear existing repeatable jobs first to ensure clean state
      await this.clearExistingCronJobs();

      // Schedule log pruning job (daily at 2 AM)
      await this.scheduleLogPruning();

      // Schedule each workflow
      for (const workflow of workflows) {
        await this.scheduleWorkflow(workflow);
      }

      this.logger.info('Cron job seeding completed successfully');
    } catch (error) {
      this.logger.error({ error }, 'Failed to seed cron jobs');
      throw error;
    }
  }

  private async getWorkflowsWithCronTriggers(): Promise<any[]> {
    const { data, error } = await this.supabase.client
      .from('workflows')
      .select('*')
      .eq('enabled', true);

    if (error) {
      throw new Error(`Failed to fetch workflows: ${error.message}`);
    }

    // Filter workflows that have cron triggers
    return (data || []).filter((workflow) => {
      const schema = workflow.schema as any;
      return schema?.triggers?.some(
        (trigger: any) => 
          trigger.type === 'cron' && 
          trigger.config?.schedule
      );
    });
  }

  private async clearExistingCronJobs(): Promise<void> {
    try {
      const repeatableJobs = await this.queueService.getRepeatableJobs(
        QUEUE_NAMES.DEFAULT,
      );

      // Remove jobs that match our cron pattern
      for (const job of repeatableJobs) {
        if (job.id?.startsWith('cron-') || job.id === 'log-pruning') {
          const jobId = job.id.startsWith('cron-') ? job.id.replace('cron-', '') : job.id;
          await this.queueService.removeRepeatableJob(
            QUEUE_NAMES.DEFAULT,
            jobId,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        { error },
        'Failed to clear existing cron jobs, continuing anyway',
      );
    }
  }

  private async scheduleWorkflow(workflow: any): Promise<void> {
    const schema = workflow.schema as any;
    const cronTriggers = schema.triggers.filter(
      (trigger: any) => trigger.type === 'cron' && trigger.config?.schedule,
    );

    for (const trigger of cronTriggers) {
      try {
        const schedule = trigger.config.schedule;
        const timezone = trigger.config.timezone || 'UTC';

        await this.queueService.addRepeatableJob(
          QUEUE_NAMES.DEFAULT,
          JOB_NAMES.PROCESS_WORKFLOW,
          {
            workflowId: workflow.id,
            trigger: {
              type: 'cron',
              schedule,
            },
            metadata: {
              workflowName: workflow.name,
              scheduledBy: 'cron-seeder',
            },
          },
          {
            pattern: schedule,
            tz: timezone,
          },
        );

        this.logger.info(
          {
            workflowId: workflow.id,
            workflowName: workflow.name,
            schedule,
            timezone,
          },
          'Scheduled cron job for workflow',
        );
      } catch (error) {
        this.logger.error(
          {
            error,
            workflowId: workflow.id,
            workflowName: workflow.name,
          },
          'Failed to schedule cron job for workflow',
        );
      }
    }
  }

  /**
   * Update cron jobs when a workflow is updated
   */
  async updateWorkflowCronJobs(workflowId: string): Promise<void> {
    try {
      // Remove existing cron job
      await this.queueService.removeRepeatableJob(
        QUEUE_NAMES.DEFAULT,
        workflowId,
      );

      // Fetch the updated workflow
      const { data: workflow, error } = await this.supabase.client
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error || !workflow) {
        this.logger.warn(
          { workflowId, error },
          'Workflow not found for cron update',
        );
        return;
      }

      // Reschedule if still enabled and has cron triggers
      if (workflow.enabled) {
        const schema = workflow.schema as any;
        const hasCronTrigger = schema?.triggers?.some(
          (trigger: any) => 
            trigger.type === 'cron' && 
            trigger.config?.schedule
        );

        if (hasCronTrigger) {
          await this.scheduleWorkflow(workflow);
        }
      }
    } catch (error) {
      this.logger.error(
        { error, workflowId },
        'Failed to update workflow cron jobs',
      );
    }
  }

  /**
   * Remove cron jobs when a workflow is deleted or disabled
   */
  async removeWorkflowCronJobs(workflowId: string): Promise<void> {
    try {
      await this.queueService.removeRepeatableJob(
        QUEUE_NAMES.DEFAULT,
        workflowId,
      );

      this.logger.info(
        { workflowId },
        'Removed cron jobs for workflow',
      );
    } catch (error) {
      this.logger.error(
        { error, workflowId },
        'Failed to remove workflow cron jobs',
      );
    }
  }

  /**
   * Get cron drift metrics for monitoring
   */
  async getCronDriftMetrics(): Promise<
    Array<{
      workflowId: string;
      schedule: string;
      nextRun: Date;
      drift: number;
    }>
  > {
    const metrics = [];
    
    try {
      const repeatableJobs = await this.queueService.getRepeatableJobs(
        QUEUE_NAMES.DEFAULT,
      );

      for (const job of repeatableJobs) {
        if (job.id?.startsWith('cron-')) {
          const workflowId = job.id.replace('cron-', '');
          const nextRun = new Date(job.next);
          const now = new Date();
          const drift = nextRun.getTime() - now.getTime();

          metrics.push({
            workflowId,
            schedule: job.pattern,
            nextRun,
            drift: Math.abs(drift),
          });
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to get cron drift metrics');
    }

    return metrics;
  }

  /**
   * Schedule log pruning job to run daily at 2 AM UTC
   */
  private async scheduleLogPruning(): Promise<void> {
    try {
      const schedule = '0 2 * * *'; // Daily at 2 AM UTC
      const olderThanDays = 90; // Default retention period

      await this.queueService.addRepeatableJob(
        QUEUE_NAMES.DEFAULT,
        JOB_NAMES.PRUNE_LOGS,
        {
          olderThanDays,
        },
        {
          pattern: schedule,
          tz: 'UTC',
        },
      );

      this.logger.info(
        {
          schedule,
          olderThanDays,
        },
        'Scheduled log pruning job',
      );
    } catch (error) {
      this.logger.error(
        { error },
        'Failed to schedule log pruning job',
      );
    }
  }
}