import { Module } from '@nestjs/common';
import { SupabaseModule } from '@visapi/core-supabase';
import { OrdersRepository } from './orders.repository';
import { ApiKeysRepository } from './api-keys.repository';
import { WorkflowsRepository } from './workflows.repository';
import { UsersRepository } from './users.repository';
import { LogsRepository } from './logs.repository';
import { BatchOperationsService } from './batch-operations.service';

@Module({
  imports: [SupabaseModule],
  providers: [
    OrdersRepository,
    ApiKeysRepository,
    WorkflowsRepository,
    UsersRepository,
    LogsRepository,
    BatchOperationsService,
  ],
  exports: [
    OrdersRepository,
    ApiKeysRepository,
    WorkflowsRepository,
    UsersRepository,
    LogsRepository,
    BatchOperationsService,
  ],
})
export class RepositoriesModule {}
