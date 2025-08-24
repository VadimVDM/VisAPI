import { Module } from '@nestjs/common';
import { SupabaseModule } from '@visapi/core-supabase';
import { LogService } from './log.service';
import { PiiRedactionService } from './pii-redaction.service';

@Module({
  imports: [SupabaseModule],
  providers: [LogService, PiiRedactionService],
  exports: [LogService, PiiRedactionService],
})
export class LoggingModule {}
