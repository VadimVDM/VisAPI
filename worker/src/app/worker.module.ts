import { Module } from '@nestjs/common';
import { ConfigModule } from '@visapi/core-config';
import { SupabaseModule } from '@visapi/core-supabase';
import { CgbModule } from '@visapi/backend-core-cgb';
import { WorkerService } from './worker.service';
import { SlackProcessor } from './processors/slack.processor';
import { WhatsAppProcessor } from './processors/whatsapp.processor';
import { PdfProcessor } from './processors/pdf.processor';
import { DlqProcessor } from './processors/dlq.processor';
import { PdfTemplateService } from './services/pdf-template.service';
import { PdfGeneratorService } from './services/pdf-generator.service';

@Module({
  imports: [ConfigModule, SupabaseModule, CgbModule],
  providers: [
    WorkerService,
    SlackProcessor,
    WhatsAppProcessor,
    PdfProcessor,
    DlqProcessor,
    PdfTemplateService,
    PdfGeneratorService,
  ],
})
export class WorkerModule {}
