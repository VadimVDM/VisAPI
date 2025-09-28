import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@visapi/core-config';
import { RedisService } from '@visapi/util-redis';
import { SupabaseService } from '@visapi/core-supabase';
import { Cron, CronExpression } from '@nestjs/schedule';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Redis } from 'ioredis';

interface CompletedRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
  expanded?: {
    Applications_expanded?: Record<string, unknown>[];
  };
}

interface TrackingResult {
  newRecords: CompletedRecord[];
  totalChecked: number;
  alreadyProcessed: number;
  checkTimestamp: string;
}

@Injectable()
export class CompletedTrackerService implements OnModuleInit {
  private readonly logger = new Logger(CompletedTrackerService.name);
  private redis: Redis;

  // Redis keys
  private readonly PROCESSED_IDS_KEY = 'airtable:completed:processed_ids';
  private readonly LAST_CHECK_KEY = 'airtable:completed:last_check';
  private readonly BOOTSTRAP_KEY = 'airtable:completed:bootstrap';
  private readonly STATS_KEY = 'airtable:completed:stats';

  private readonly scriptPath = process.env.NODE_ENV === 'production'
    ? join(process.cwd(), 'airtable', 'scripts', 'airtable_completed_tracker.py')
    : join(__dirname, '..', 'scripts', 'airtable_completed_tracker.py');

  private isCheckingForNew = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly supabaseService: SupabaseService,
  ) {
    this.redis = this.redisService.getClient();
  }

  async onModuleInit() {
    // Check if we need to bootstrap on startup
    const bootstrapped = await this.redis.get(this.BOOTSTRAP_KEY);
    if (!bootstrapped) {
      this.logger.warn('Completed tracker not bootstrapped. Run bootstrap() to initialize.');
    } else {
      this.logger.log('Completed tracker initialized and ready');
    }
  }

  /**
   * One-time bootstrap to load all existing completed records
   */
  async bootstrap(): Promise<{ recordCount: number; success: boolean }> {
    this.logger.log('Starting bootstrap of completed records...');

    try {
      // Check if already bootstrapped
      const existingBootstrap = await this.redis.get(this.BOOTSTRAP_KEY);
      if (existingBootstrap) {
        this.logger.warn('Already bootstrapped. Delete Redis keys to re-bootstrap.');
        return { recordCount: 0, success: false };
      }

      // Fetch all records from the completed view
      const allCompleted = await this.fetchAllFromCompletedView();

      if (allCompleted.length === 0) {
        this.logger.warn('No completed records found in view');
      }

      // Store all record IDs in Redis set
      const recordIds = allCompleted.map(r => r.id);
      if (recordIds.length > 0) {
        await this.redis.sadd(this.PROCESSED_IDS_KEY, ...recordIds);
      }

      // Set bootstrap flag and initial timestamp
      const now = new Date().toISOString();
      await this.redis.set(this.BOOTSTRAP_KEY, now);
      await this.redis.set(this.LAST_CHECK_KEY, now);

      // Store initial stats
      await this.redis.hset(this.STATS_KEY,
        'bootstrap_date', now,
        'total_processed', recordIds.length.toString(),
        'last_successful_check', now,
      );

      this.logger.log(`Bootstrap completed: ${recordIds.length} records loaded`);

      // Log to database
      await this.logToDatabase('bootstrap', {
        record_count: recordIds.length,
        timestamp: now,
      });

      return { recordCount: recordIds.length, success: true };
    } catch (error) {
      this.logger.error('Bootstrap failed', error);
      throw error;
    }
  }

  /**
   * Check for new completed records since last check
   * This is called by the cron job and can also be called manually
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkForNew(): Promise<TrackingResult> {
    // Prevent concurrent checks
    if (this.isCheckingForNew) {
      this.logger.warn('Check already in progress, skipping...');
      return {
        newRecords: [],
        totalChecked: 0,
        alreadyProcessed: 0,
        checkTimestamp: new Date().toISOString(),
      };
    }

    this.isCheckingForNew = true;
    const checkStartTime = new Date();

    try {
      // Ensure we're bootstrapped
      const bootstrapped = await this.redis.get(this.BOOTSTRAP_KEY);
      if (!bootstrapped) {
        this.logger.warn('Not bootstrapped yet. Running bootstrap first...');
        await this.bootstrap();
        return {
          newRecords: [],
          totalChecked: 0,
          alreadyProcessed: 0,
          checkTimestamp: checkStartTime.toISOString(),
        };
      }

      // Get last check timestamp
      const lastCheck = await this.redis.get(this.LAST_CHECK_KEY);
      if (!lastCheck) {
        throw new Error('Last check timestamp not found');
      }

      this.logger.log(`Checking for records completed after ${lastCheck}`);

      // Query for records with Completed Timestamp > last check
      const recentRecords = await this.fetchRecentlyCompleted(lastCheck);

      const genuinelyNew: CompletedRecord[] = [];
      let alreadyProcessed = 0;

      // Check each record against our processed set
      for (const record of recentRecords) {
        const isNew = await this.redis.sadd(this.PROCESSED_IDS_KEY, record.id);

        if (isNew === 1) {
          // This is a new record we haven't processed
          genuinelyNew.push(record);

          // Process the new record
          await this.processNewRecord(record);
        } else {
          // We've seen this record before (status toggle case)
          alreadyProcessed++;
          this.logger.debug(`Record ${record.id} already processed, skipping`);
        }
      }

      // Update last check timestamp
      await this.redis.set(this.LAST_CHECK_KEY, checkStartTime.toISOString());

      // Update stats
      const currentTotal = await this.redis.scard(this.PROCESSED_IDS_KEY);
      await this.redis.hset(this.STATS_KEY,
        'last_successful_check', checkStartTime.toISOString(),
        'total_processed', String(currentTotal),
        'last_new_count', genuinelyNew.length.toString(),
      );

      // Log results
      this.logger.log(
        `Check completed: ${genuinelyNew.length} new, ${alreadyProcessed} already processed, ${recentRecords.length} total checked`
      );

      // Log to database
      await this.logToDatabase('check', {
        new_records: genuinelyNew.length,
        already_processed: alreadyProcessed,
        total_checked: recentRecords.length,
        timestamp: checkStartTime.toISOString(),
      });

      return {
        newRecords: genuinelyNew,
        totalChecked: recentRecords.length,
        alreadyProcessed,
        checkTimestamp: checkStartTime.toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to check for new records', error);

      // Update stats with error
      await this.redis.hset(this.STATS_KEY,
        'last_error', checkStartTime.toISOString(),
        'last_error_message', (error as Error).message,
      );

      throw error;
    } finally {
      this.isCheckingForNew = false;
    }
  }

  /**
   * Get current tracking statistics
   */
  async getStats(): Promise<Record<string, string>> {
    const stats = await this.redis.hgetall(this.STATS_KEY);
    const processedCount = await this.redis.scard(this.PROCESSED_IDS_KEY);

    return {
      ...stats,
      total_processed_current: String(processedCount),
    };
  }

  /**
   * Check if a specific record has been processed
   */
  async isRecordProcessed(recordId: string): Promise<boolean> {
    const result = await this.redis.sismember(this.PROCESSED_IDS_KEY, recordId);
    return result === 1;
  }

  /**
   * Manually mark a record as processed
   */
  async markAsProcessed(recordId: string): Promise<boolean> {
    const result = await this.redis.sadd(this.PROCESSED_IDS_KEY, recordId);
    return result === 1;
  }

  /**
   * Reset tracking (for development/debugging)
   */
  async reset(): Promise<void> {
    this.logger.warn('Resetting completed tracker...');

    await this.redis.del(
      this.PROCESSED_IDS_KEY,
      this.LAST_CHECK_KEY,
      this.BOOTSTRAP_KEY,
      this.STATS_KEY
    );

    this.logger.log('Completed tracker reset');
  }

  /**
   * Process a newly completed record
   */
  private async processNewRecord(record: CompletedRecord): Promise<void> {
    try {
      this.logger.log(`Processing new completed record: ${record.id}`);

      // Extract relevant fields
      const orderId = record.fields['ID'] as string;
      const status = record.fields['Status'] as string;
      const completedTimestamp = record.fields['Completed Timestamp'] as string;

      // Check if we have expanded application data
      const applications = record.expanded?.Applications_expanded || [];

      // TODO: Trigger webhooks, send notifications, update other systems
      // For now, just log
      this.logger.log({
        message: 'New completed record detected',
        recordId: record.id,
        orderId,
        status,
        completedTimestamp,
        applicationCount: applications.length,
      });

      // Log to database
      await this.logToDatabase('new_record', {
        record_id: record.id,
        order_id: orderId,
        status,
        completed_timestamp: completedTimestamp,
        application_count: applications.length,
      });
    } catch (error) {
      this.logger.error(`Failed to process record ${record.id}`, error);
      // Don't throw - we don't want one bad record to stop processing others
    }
  }

  /**
   * Fetch all records from the completed view (for bootstrap)
   */
  private async fetchAllFromCompletedView(): Promise<CompletedRecord[]> {
    const payload = JSON.stringify({
      mode: 'bootstrap',
      view_id: 'viwgYjpU6K6nXq8ii',
    });

    return this.executePythonScript(payload);
  }

  /**
   * Fetch records completed after a specific timestamp
   */
  private async fetchRecentlyCompleted(afterTimestamp: string): Promise<CompletedRecord[]> {
    const payload = JSON.stringify({
      mode: 'incremental',
      view_id: 'viwgYjpU6K6nXq8ii',
      after_timestamp: afterTimestamp,
    });

    return this.executePythonScript(payload);
  }

  /**
   * Execute Python script to fetch from Airtable
   */
  private async executePythonScript(payload: string): Promise<CompletedRecord[]> {
    const apiKey = this.configService.airtableApiKey;
    const baseId = this.configService.airtableBaseId;
    const tableId = this.configService.airtableTableId;

    if (!apiKey || !baseId || !tableId) {
      throw new Error('Airtable credentials not configured');
    }

    // For now, use the existing lookup script
    // We'll create a dedicated script next
    const scriptPath = process.env.NODE_ENV === 'production'
      ? join(process.cwd(), 'airtable', 'scripts', 'airtable_lookup.py')
      : join(__dirname, '..', 'scripts', 'airtable_lookup.py');

    if (!existsSync(scriptPath)) {
      throw new Error(`Script not found at ${scriptPath}`);
    }

    return new Promise((resolve, reject) => {
      const child = spawn('python3', [scriptPath], {
        env: {
          ...process.env,
          AIRTABLE_API_KEY: apiKey,
          AIRTABLE_BASE_ID: baseId,
          AIRTABLE_TABLE_ID: tableId,
          AIRTABLE_VIEW_ID: 'viwgYjpU6K6nXq8ii',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

      child.on('error', (error) => reject(error));

      child.on('close', (code) => {
        const stdoutContent = Buffer.concat(stdout).toString('utf8').trim();
        const stderrContent = Buffer.concat(stderr).toString('utf8').trim();

        if (stderrContent) {
          this.logger.debug(`Python stderr: ${stderrContent}`);
        }

        if (code !== 0) {
          reject(new Error(`Python script exited with code ${code}`));
          return;
        }

        try {
          const response = JSON.parse(stdoutContent) as { status: string; matches?: CompletedRecord[]; error?: string };
          if (response.status === 'ok') {
            resolve(response.matches || []);
          } else {
            reject(new Error(response.error || 'Script error'));
          }
        } catch {
          reject(new Error('Failed to parse script output'));
        }
      });

      child.stdin.write(payload);
      child.stdin.end();
    });
  }

  /**
   * Log events to database for audit trail
   */
  private async logToDatabase(
    eventType: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.supabaseService.serviceClient
        .from('logs')
        .insert({
          level: 'info',
          message: `Airtable completed tracker: ${eventType}`,
          metadata: {
            service: 'completed-tracker',
            event_type: eventType,
            ...metadata,
          },
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      this.logger.error('Failed to log to database', error);
    }
  }
}