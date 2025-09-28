import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@visapi/core-config';
import { SupabaseModule } from '@visapi/core-supabase';
import { RedisModule } from '@visapi/util-redis';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { AirtableController } from './airtable.controller';
import { AirtableLookupService } from './airtable.service';
import { StatusMessageGeneratorService } from './services/status-message-generator.service';
import { CompletedTrackerService } from './services/completed-tracker.service';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    SupabaseModule,
    RedisModule,
    ScheduleModule.forRoot(),
    forwardRef(() => QueueModule), // Import QueueModule for WhatsAppTranslationService
  ],
  controllers: [AirtableController],
  providers: [
    AirtableLookupService,
    StatusMessageGeneratorService,
    CompletedTrackerService,
  ],
  exports: [AirtableLookupService, CompletedTrackerService],
})
export class AirtableModule {}
