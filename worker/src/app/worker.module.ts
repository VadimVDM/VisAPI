import { Module } from '@nestjs/common';
import { ConfigModule } from '@visapi/core-config';
import { SupabaseModule } from '@visapi/core-supabase';
import { CgbModule } from '@visapi/backend-core-cgb';
import { WorkerService } from './worker.service';
import { SlackProcessor } from './processors/slack.processor';
import { WhatsAppProcessor } from './processors/whatsapp.processor';
import { PdfProcessor } from './processors/pdf.processor';
import { DlqProcessor } from './processors/dlq.processor';

@Module({
  imports: [ConfigModule, SupabaseModule, CgbModule],
  providers: [
    WorkerService,
    SlackProcessor,
    WhatsAppProcessor,
    PdfProcessor,
    DlqProcessor,
  ],
})
export class WorkerModule {}
