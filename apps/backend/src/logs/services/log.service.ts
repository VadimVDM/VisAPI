import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { PiiRedactionService } from './pii-redaction.service';

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, any>;
  workflow_id?: string;
  job_id?: string;
  correlation_id?: string;
}

export interface LogRecord {
  id: number;
  level: string;
  message: string;
  metadata: any;
  workflow_id: string | null;
  job_id: string | null;
  pii_redacted: boolean;
  created_at: string;
}

export interface LogFilters {
  level?: string;
  workflow_id?: string;
  job_id?: string;
  start_date?: string;
  end_date?: string;
  message_contains?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedLogs {
  logs: LogRecord[];
  total: number;
  offset: number;
  limit: number;
}

@Injectable()
export class LogService {
  private readonly logger = new Logger(LogService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly piiRedactionService: PiiRedactionService
  ) {}

  /**
   * Create a new log entry with PII redaction
   */
  async createLog(logEntry: LogEntry): Promise<void> {
    try {
      // Redact PII from message
      const messageResult = this.piiRedactionService.redactPii(logEntry.message);
      
      // Redact PII from metadata
      const metadataResult = logEntry.metadata 
        ? this.piiRedactionService.redactPiiFromObject(logEntry.metadata)
        : { obj: null, piiFound: false, redactedFields: [] };

      // Determine if any PII was found
      const piiFound = messageResult.piiFound || metadataResult.piiFound;

      // Prepare log data for database
      const logData = {
        level: logEntry.level,
        message: messageResult.text,
        metadata: metadataResult.obj,
        workflow_id: logEntry.workflow_id || null,
        job_id: logEntry.job_id || null,
        pii_redacted: piiFound,
        created_at: new Date().toISOString(),
      };

      // Store in database using client property
      const { error } = await this.supabase
        .client
        .from('logs')
        .insert(logData);

      if (error) {
        this.logger.error('Failed to store log entry:', error);
        throw new Error('Failed to store log entry');
      }

      // Log PII redaction statistics if PII was found
      if (piiFound) {
        this.logger.debug('PII redacted from log entry', {
          messageFields: messageResult.redactedFields,
          metadataFields: metadataResult.redactedFields,
          workflowId: logEntry.workflow_id,
          jobId: logEntry.job_id,
        });
      }

    } catch (error) {
      this.logger.error('Error creating log entry:', error);
      // Don't throw - we don't want logging failures to break the application
    }
  }

  /**
   * Get logs with filtering and pagination
   */
  async getLogs(filters: LogFilters = {}): Promise<PaginatedLogs> {
    const {
      level,
      workflow_id,
      job_id,
      start_date,
      end_date,
      message_contains,
      limit = 50,
      offset = 0,
    } = filters;

    let query = this.supabase
      .client
      .from('logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (level) {
      query = query.eq('level', level);
    }

    if (workflow_id) {
      query = query.eq('workflow_id', workflow_id);
    }

    if (job_id) {
      query = query.eq('job_id', job_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    if (message_contains) {
      query = query.ilike('message', `%${message_contains}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error('Failed to fetch logs:', error);
      throw new Error('Failed to fetch logs');
    }

    return {
      logs: data || [],
      total: count || 0,
      offset,
      limit,
    };
  }

  /**
   * Get logs by workflow ID
   */
  async getLogsByWorkflow(workflowId: string): Promise<LogRecord[]> {
    const { data, error } = await this.supabase
      .client
      .from('logs')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch workflow logs:', error);
      throw new Error('Failed to fetch workflow logs');
    }

    return data || [];
  }

  /**
   * Get logs by job ID
   */
  async getLogsByJob(jobId: string): Promise<LogRecord[]> {
    const { data, error } = await this.supabase
      .client
      .from('logs')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch job logs:', error);
      throw new Error('Failed to fetch job logs');
    }

    return data || [];
  }

  /**
   * Get log statistics
   */
  async getLogStats(): Promise<{
    total: number;
    byLevel: Record<string, number>;
    withPii: number;
    recentCount: number;
  }> {
    const { data: totalData, error: totalError } = await this.supabase
      .client
      .from('logs')
      .select('level, pii_redacted', { count: 'exact' });

    if (totalError) {
      this.logger.error('Failed to fetch log stats:', totalError);
      throw new Error('Failed to fetch log stats');
    }

    const total = totalData?.length || 0;
    const byLevel: Record<string, number> = {};
    let withPii = 0;

    totalData?.forEach(log => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      if (log.pii_redacted) {
        withPii++;
      }
    });

    // Get recent logs count (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: recentData, error: recentError } = await this.supabase
      .client
      .from('logs')
      .select('id', { count: 'exact' })
      .gte('created_at', yesterday.toISOString());

    if (recentError) {
      this.logger.warn('Failed to fetch recent logs count:', recentError);
    }

    return {
      total,
      byLevel,
      withPii,
      recentCount: recentData?.length || 0,
    };
  }

  /**
   * Delete logs older than specified days
   */
  async pruneOldLogs(olderThanDays: number = 90): Promise<{ deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await this.supabase
      .client
      .from('logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      this.logger.error('Failed to prune old logs:', error);
      throw new Error('Failed to prune old logs');
    }

    const deletedCount = data ? (Array.isArray(data) ? (data as any[]).length : 0) : 0;
    
    this.logger.log(`Pruned ${deletedCount} logs older than ${olderThanDays} days`);
    
    return { deleted: deletedCount };
  }

  /**
   * Enhance existing logger with structured logging
   */
  async logWithContext(
    level: LogEntry['level'],
    message: string,
    context?: {
      workflow_id?: string;
      job_id?: string;
      correlation_id?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await this.createLog({
      level,
      message,
      metadata: context?.metadata,
      workflow_id: context?.workflow_id,
      job_id: context?.job_id,
      correlation_id: context?.correlation_id,
    });
  }

  /**
   * Convenience methods for different log levels
   */
  async debug(message: string, context?: any): Promise<void> {
    await this.logWithContext('debug', message, context);
  }

  async info(message: string, context?: any): Promise<void> {
    await this.logWithContext('info', message, context);
  }

  async warn(message: string, context?: any): Promise<void> {
    await this.logWithContext('warn', message, context);
  }

  async error(message: string, context?: any): Promise<void> {
    await this.logWithContext('error', message, context);
  }
}