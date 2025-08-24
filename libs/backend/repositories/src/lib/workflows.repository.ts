import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { SupabaseService } from '@visapi/core-supabase';
import { WorkflowSchema } from '@visapi/shared-types';
import { Cacheable, CacheEvict } from '@visapi/backend-cache';

export interface WorkflowRecord {
  id: string;
  name: string;
  description?: string;
  config: WorkflowSchema;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class WorkflowsRepository extends BaseRepository<WorkflowRecord> {
  protected readonly tableName = 'workflows';
  protected readonly logger = new Logger(WorkflowsRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {
    super(supabaseService.serviceClient);
  }

  /**
   * Find enabled workflows (cached for performance)
   */
  @Cacheable({ ttl: 600, key: 'workflows:enabled' }) // 10 minutes
  async findEnabledWorkflows(): Promise<WorkflowRecord[]> {
    return this.findMany({
      where: { enabled: true },
      orderBy: 'created_at',
      orderDirection: 'desc',
    });
  }

  /**
   * Find workflows by creator
   */
  async findByCreator(createdBy: string): Promise<WorkflowRecord[]> {
    return this.findMany({
      where: { created_by: createdBy },
      orderBy: 'created_at',
      orderDirection: 'desc',
    });
  }

  /**
   * Find workflows by trigger type
   */
  @Cacheable({ ttl: 300, key: 'workflows:trigger' }) // 5 minutes
  async findByTriggerType(triggerType: string): Promise<WorkflowRecord[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .contains('config', { triggers: [{ type: triggerType }] })
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Error finding workflows by trigger type', error);
      throw error;
    }

    return (data || []) as WorkflowRecord[];
  }

  /**
   * Enable/disable a workflow
   */
  @CacheEvict({ pattern: 'workflows:*' }) // Evict all workflow caches
  async setEnabled(id: string, enabled: boolean): Promise<WorkflowRecord> {
    return this.update(id, { enabled });
  }

  /**
   * Update workflow configuration
   */
  @CacheEvict({ pattern: 'workflows:*' }) // Evict all workflow caches
  async updateConfig(
    id: string,
    config: WorkflowSchema,
  ): Promise<WorkflowRecord> {
    return this.update(id, { config });
  }

  /**
   * Clone a workflow
   */
  async clone(
    workflowId: string,
    newName: string,
    createdBy: string,
  ): Promise<WorkflowRecord> {
    const original = await this.findById(workflowId);
    if (!original) {
      throw new Error('Workflow not found');
    }

    return this.create({
      name: newName,
      description: `Clone of ${original.name}`,
      config: original.config,
      enabled: false,
      created_by: createdBy,
    });
  }

  /**
   * Get workflow statistics
   */
  @Cacheable({ ttl: 120, key: 'workflows:stats' }) // 2 minutes
  async getStatistics(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    byTriggerType: Record<string, number>;
  }> {
    const workflows = await this.findMany();

    const byTriggerType: Record<string, number> = {};
    workflows.forEach((workflow) => {
      workflow.config.triggers?.forEach((trigger) => {
        byTriggerType[trigger.type] = (byTriggerType[trigger.type] || 0) + 1;
      });
    });

    const enabled = workflows.filter((w) => w.enabled).length;

    return {
      total: workflows.length,
      enabled,
      disabled: workflows.length - enabled,
      byTriggerType,
    };
  }
}
