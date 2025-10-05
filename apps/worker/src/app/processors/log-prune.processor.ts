import { Injectable, Logger } from '@nestjs/common';
import { LogService } from '@visapi/backend-logging';
import { LogPruneJobData, LogPruneJobResult } from '@visapi/shared-types';
import { Job } from 'bullmq';

@Injectable()
export class LogPruneProcessor {
  private readonly logger = new Logger(LogPruneProcessor.name);

  constructor(private readonly logService: LogService) {}

  async process(job: Job<LogPruneJobData>): Promise<LogPruneJobResult> {
    const { olderThanDays } = job.data;

    this.logger.log(
      `Starting log pruning process for logs older than ${olderThanDays} days`,
    );

    try {
      const result = await this.logService.pruneOldLogs(olderThanDays);

      this.logger.log(
        `Log pruning completed successfully: deleted ${result.deleted} logs older than ${olderThanDays} days`,
      );

      return {
        success: true,
        deleted: result.deleted,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Log pruning failed for logs older than ${olderThanDays} days: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      return {
        success: false,
        deleted: 0,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
