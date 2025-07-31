import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowValidationService } from './services/workflow-validation.service';
import { WorkflowValidationInterceptor } from './interceptors/workflow-validation.interceptor';
import { SupabaseModule } from '@visapi/core-supabase';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [WorkflowsController],
  providers: [
    WorkflowsService,
    WorkflowValidationService,
    WorkflowValidationInterceptor,
  ],
  exports: [WorkflowsService, WorkflowValidationService],
})
export class WorkflowsModule {}
