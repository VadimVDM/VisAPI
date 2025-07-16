import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogService } from './services/log.service';
import { PiiRedactionService } from './services/pii-redaction.service';
import { SupabaseModule } from '@visapi/core-supabase';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [LogsController],
  providers: [LogService, PiiRedactionService],
  exports: [LogService, PiiRedactionService],
})
export class LogsModule {}