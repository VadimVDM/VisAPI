import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { LogService } from '@visapi/backend-logging';
import { LogPruneJobData, LogPruneJobResult } from '@visapi/shared-types';
import { Job } from 'bullmq';

@Injectable()
export class LogPruneProcessor {
  constructor(
    @InjectPinoLogger(LogPruneProcessor.name)
    private readonly logger: PinoLogger,
    private readonly logService: LogService,
  ) {}

  async process(job: Job<LogPruneJobData>): Promise<LogPruneJobResult> {
    const { olderThanDays } = job.data;

    this.logger.info(
      { olderThanDays },
      'Starting log pruning process',
    );

    try {
      const result = await this.logService.pruneOldLogs(olderThanDays);
      
      this.logger.info(
        { deleted: result.deleted, olderThanDays },
        'Log pruning completed successfully',
      );

      return {
        success: true,
        deleted: result.deleted,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        { error, olderThanDays },
        'Log pruning failed',
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