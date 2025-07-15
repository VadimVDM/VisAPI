import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@visapi/core-config';
import { SupabaseModule } from '@visapi/core-supabase';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@visapi/shared-types';
import { CgbModule } from '@visapi/backend-core-cgb';
import { WorkerService } from './worker.service';
import { SlackProcessor } from './processors/slack.processor';
import { WhatsAppProcessor } from './processors/whatsapp.processor';
import { PdfProcessor } from './processors/pdf.processor';
import { DlqProcessor } from './processors/dlq.processor';
import { WorkflowProcessor } from './processors/workflow.processor';
import { LogPruneProcessor } from './processors/log-prune.processor';
import { PdfTemplateService } from './services/pdf-template.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { LoggingModule } from '@visapi/backend-logging';

@Module({
  imports: [
    ConfigModule, 
    SupabaseModule, 
    CgbModule,
    LoggingModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.redisUrl,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.CRITICAL },
      { name: QUEUE_NAMES.DEFAULT },
      { name: QUEUE_NAMES.BULK }
    ),
  ],
  providers: [
    WorkerService,
    SlackProcessor,
    WhatsAppProcessor,
    PdfProcessor,
    DlqProcessor,
    WorkflowProcessor,
    LogPruneProcessor,
    PdfTemplateService,
    PdfGeneratorService,
  ],
})
export class WorkerModule {}
