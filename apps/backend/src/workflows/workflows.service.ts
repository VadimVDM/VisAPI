import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { CreateWorkflowDto, UpdateWorkflowDto, WorkflowResponseDto } from './dto';
import { WorkflowSchema } from '@visapi/shared-types';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async create(createWorkflowDto: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    const { name, description, enabled, variables, schema } = createWorkflowDto;

    // Combine the base fields with the schema for storage
    const workflowData = {
      name,
      description,
      enabled,
      schema: {
        ...schema,
        variables,
      },
    };

    const { data, error } = await this.supabase
      .client
      .from('workflows')
      .insert(workflowData)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create workflow:', error);
      throw new Error('Failed to create workflow');
    }

    this.logger.log(`Created workflow: ${data.id}`);
    return this.mapToResponseDto(data);
  }

  async findAll(): Promise<WorkflowResponseDto[]> {
    const { data, error } = await this.supabase
      .client
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch workflows:', error);
      throw new Error('Failed to fetch workflows');
    }

    return data.map(workflow => this.mapToResponseDto(workflow));
  }

  async findOne(id: string): Promise<WorkflowResponseDto> {
    const { data, error } = await this.supabase
      .client
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.warn(`Workflow not found: ${id}`);
      throw new NotFoundException(`Workflow with id ${id} not found`);
    }

    return this.mapToResponseDto(data);
  }

  async update(id: string, updateWorkflowDto: UpdateWorkflowDto): Promise<WorkflowResponseDto> {
    const { name, description, enabled, variables, schema } = updateWorkflowDto;

    // Build update data, only including fields that are provided
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (enabled !== undefined) updateData.enabled = enabled;
    
    if (schema !== undefined) {
      updateData.schema = {
        ...schema,
        variables,
      };
    }

    const { data, error } = await this.supabase
      .client
      .from('workflows')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to update workflow ${id}:`, error);
      throw new NotFoundException(`Workflow with id ${id} not found`);
    }

    this.logger.log(`Updated workflow: ${id}`);
    return this.mapToResponseDto(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase
      .client
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete workflow ${id}:`, error);
      throw new NotFoundException(`Workflow with id ${id} not found`);
    }

    this.logger.log(`Deleted workflow: ${id}`);
  }

  async findEnabled(): Promise<WorkflowResponseDto[]> {
    const { data, error } = await this.supabase
      .client
      .from('workflows')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch enabled workflows:', error);
      throw new Error('Failed to fetch enabled workflows');
    }

    return data.map(workflow => this.mapToResponseDto(workflow));
  }

  private mapToResponseDto(workflow: any): WorkflowResponseDto {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      enabled: workflow.enabled,
      variables: workflow.schema?.variables,
      schema: workflow.schema,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at,
    };
  }
}