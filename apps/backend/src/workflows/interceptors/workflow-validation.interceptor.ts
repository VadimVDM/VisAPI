import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { WorkflowValidationService } from '../services/workflow-validation.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from '../dto';

@Injectable()
export class WorkflowValidationInterceptor implements NestInterceptor {
  constructor(private readonly validationService: WorkflowValidationService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { body } = request;

    // Only validate if we have a workflow schema in the body
    if (body && body.schema) {
      const workflowData = this.buildWorkflowForValidation(body);
      const result = await this.validationService.validateCompleteWorkflow(workflowData);

      if (!result.valid) {
        throw new BadRequestException({
          message: 'Workflow validation failed',
          errors: result.errors,
        });
      }
    }

    return next.handle();
  }

  private buildWorkflowForValidation(body: CreateWorkflowDto | UpdateWorkflowDto): any {
    return {
      id: body.name ? this.generateIdFromName(body.name) : undefined,
      name: body.name,
      description: body.description,
      enabled: body.enabled ?? true,
      variables: body.variables,
      triggers: body.schema?.triggers || [],
      steps: body.schema?.steps || [],
    };
  }

  private generateIdFromName(name: string): string {
    // Generate a deterministic ID from the name for validation purposes
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
}