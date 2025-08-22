import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowValidationService } from './services/workflow-validation.service';
import { WorkflowSchemaLoaderService } from './services/workflow-schema-loader.service';
import { WorkflowValidationEngineService } from './services/workflow-validation-engine.service';
import { WorkflowValidationInterceptor } from './interceptors/workflow-validation.interceptor';
import { SupabaseModule } from '@visapi/core-supabase';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [WorkflowsController],
  providers: [
    WorkflowsService,
    WorkflowValidationService,
    WorkflowSchemaLoaderService,
    WorkflowValidationEngineService,
    WorkflowValidationInterceptor,
  ],
  exports: [WorkflowsService, WorkflowValidationService],
})
export class WorkflowsModule {}
