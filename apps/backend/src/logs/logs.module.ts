import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LoggingModule } from '@visapi/backend-logging';
import { SupabaseModule } from '@visapi/core-supabase';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule, LoggingModule],
  controllers: [LogsController],
  providers: [],
  exports: [],
})
export class LogsModule {}
