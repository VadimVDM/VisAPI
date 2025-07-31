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

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = httpContext.getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const body: unknown = request.body;

    // Only validate if we have a workflow schema in the body
    if (body && typeof body === 'object' && body !== null && 'schema' in body) {
      const workflowData = this.buildWorkflowForValidation(
        body as CreateWorkflowDto | UpdateWorkflowDto,
      );
      const result =
        this.validationService.validateCompleteWorkflow(workflowData);

      if (!result.valid) {
        throw new BadRequestException({
          message: 'Workflow validation failed',
          errors: result.errors,
        });
      }
    }

    return next.handle();
  }

  private buildWorkflowForValidation(
    body: CreateWorkflowDto | UpdateWorkflowDto,
  ): Record<string, unknown> {
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
