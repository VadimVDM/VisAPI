import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@visapi/core-config';
import { SupabaseModule } from '@visapi/core-supabase';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@visapi/shared-types';
import { CbbModule } from '@visapi/backend-core-cbb';
import { WorkerService } from './worker.service';
import { SlackProcessor } from './processors/slack.processor';
import { WhatsAppProcessor } from './processors/whatsapp.processor';
import { PdfProcessor } from './processors/pdf.processor';
import { DlqProcessor } from './processors/dlq.processor';
import { WorkflowProcessor } from './processors/workflow.processor';
import { LogPruneProcessor } from './processors/log-prune.processor';
import { ScraperProcessor } from './processors/scraper.processor';
import { PdfTemplateService } from './services/pdf-template.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { BrowserManagerService } from '../scrapers/base/browser-manager.service';
import { CaptchaSolverService } from '../scrapers/base/captcha-solver.service';
import { EstaScraper } from '../scrapers/esta/esta.scraper';
import { VietnamEvisaScraper } from '../scrapers/vietnam-evisa/vietnam-evisa.scraper';
import { KoreaKetaScraper } from '../scrapers/korea-keta/korea-keta.scraper';
import { LoggingModule } from '@visapi/backend-logging';

@Module({
  imports: [
    ConfigModule,
    SupabaseModule,
    CbbModule,
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
      { name: QUEUE_NAMES.BULK },
      { name: QUEUE_NAMES.SCRAPER },
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
    ScraperProcessor,
    PdfTemplateService,
    PdfGeneratorService,
    BrowserManagerService,
    CaptchaSolverService,
    EstaScraper,
    VietnamEvisaScraper,
    KoreaKetaScraper,
  ],
})
export class WorkerModule {}
