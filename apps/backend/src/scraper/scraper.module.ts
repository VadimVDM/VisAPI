import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@visapi/shared-types';
import { SupabaseModule } from '@visapi/core-supabase';
import { AuthModule } from '../auth/auth.module';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';

/**
 * Scraper Module
 * Handles visa document scraping for ESTA, Vietnam eVisa, and Korea K-ETA
 */
@Module({
  imports: [
    AuthModule,
    SupabaseModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.SCRAPER,
    }),
  ],
  controllers: [ScraperController],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}