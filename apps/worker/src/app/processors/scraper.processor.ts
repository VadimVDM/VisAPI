import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '@visapi/shared-types';
import type { ScraperJobData, ScraperJobResult } from '@visapi/shared-types';
import { BrowserManagerService } from '../../scrapers/base/browser-manager.service';
import { EstaScraper } from '../../scrapers/esta/esta.scraper';
import { VietnamEvisaScraper } from '../../scrapers/vietnam-evisa/vietnam-evisa.scraper';
import { KoreaKetaScraper } from '../../scrapers/korea-keta/korea-keta.scraper';
import { ScraperOptions } from '../../scrapers/types';

/**
 * Scraper Queue Processor
 * Processes visa document scraping jobs for ESTA, Vietnam eVisa, and Korea K-ETA
 */
@Injectable()
@Processor(QUEUE_NAMES.SCRAPER, {
  concurrency: 2, // Process 2 scraping jobs simultaneously (to avoid rate limits)
  maxStalledCount: 3,
  stalledInterval: 60000, // 1 minute
})
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);

  constructor(
    private readonly browserManager: BrowserManagerService,
    private readonly estaScraper: EstaScraper,
    private readonly vietnamEvisaScraper: VietnamEvisaScraper,
    private readonly koreaKetaScraper: KoreaKetaScraper,
  ) {
    super();
  }

  async process(job: Job<ScraperJobData>): Promise<ScraperJobResult> {
    const startTime = Date.now();
    const { data } = job;

    this.logger.log(
      `Processing scraper job ${job.id} - Type: ${data.scraperType}, JobId: ${data.jobId}`,
    );

    try {
      // Update progress
      await job.updateProgress(10);

      // Determine scraper options
      const options: ScraperOptions = {
        browserConfig: {
          headless: true,
          timeout: 60000,
        },
        screenshotsOnError: true,
        maxWaitTime: 120000, // 2 minutes max wait
        actionDelay: 1000, // 1 second delay between actions
      };

      let result: ScraperJobResult;

      // Route to appropriate scraper
      switch (data.scraperType) {
        case 'esta':
          await job.updateProgress(20);
          result = await this.estaScraper.scrape(data, options);
          break;

        case 'vietnam-evisa':
          await job.updateProgress(20);
          result = await this.vietnamEvisaScraper.scrape(data, options);
          break;

        case 'korea-keta':
          await job.updateProgress(20);
          result = await this.koreaKetaScraper.scrape(data, options);
          break;

        default: {
          const invalidType: never = data.scraperType;
          throw new Error(`Unknown scraper type: ${String(invalidType)}`);
        }
      }

      await job.updateProgress(100);

      this.logger.log(
        `Scraper job ${job.id} completed - Status: ${result.status}, Duration: ${Date.now() - startTime}ms`,
      );

      // If job should be retried, throw to trigger retry
      if (result.shouldRetry && result.retryAfter) {
        const retryDelay = new Date(result.retryAfter).getTime() - Date.now();
        const retryReason = result.error ?? 'Unknown scraper error';
        throw new Error(
          `Job should be retried after ${retryDelay}ms: ${retryReason}`,
        );
      }

      return result;
    } catch (error: unknown) {
      const message = (() => {
        if (error instanceof Error) {
          return error.message;
        }
        if (typeof error === 'string') {
          return error;
        }
        try {
          return JSON.stringify(error);
        } catch {
          return 'Unknown error';
        }
      })();
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Scraper job ${job.id} failed: ${message}`, stack);

      // Return error result
      return {
        success: false,
        jobId: data.jobId,
        scraperType: data.scraperType,
        status: 'failed',
        duration: Date.now() - startTime,
        error: message,
        errorCode: 'PROCESSING_ERROR',
        shouldRetry: true,
        metadata: data.metadata,
      };
    }
  }

  onCompleted(job: Job<ScraperJobData>, result: ScraperJobResult) {
    this.logger.log(
      `Job ${job.id} completed - Status: ${result.status}, Success: ${result.success}`,
    );

    // Log document URL if successful
    if (result.success && result.documentUrl) {
      this.logger.log(
        `Document downloaded: ${result.filename} (${result.size} bytes)`,
      );
      this.logger.log(`Document URL: ${result.documentUrl}`);
    }

    // Log error if failed
    if (!result.success) {
      this.logger.error(
        `Job ${job.id} failed - Error: ${result.error} (Code: ${result.errorCode})`,
      );
    }
  }

  onFailed(job: Job<ScraperJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} permanently failed: ${error.message}`,
      error.stack,
    );

    // Cleanup any resources if needed
    // (Browser contexts are already cleaned up by scrapers)
  }

  onActive(job: Job<ScraperJobData>) {
    this.logger.log(
      `Job ${job.id} started processing - Scraper: ${job.data.scraperType}`,
    );
  }

  onStalled(job: Job<ScraperJobData>) {
    this.logger.warn(`Job ${job.id} stalled and will be retried`);
  }
}
