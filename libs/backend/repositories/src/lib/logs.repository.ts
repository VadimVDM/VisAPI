import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { SupabaseService } from '@visapi/core-supabase';
import { LogEntry } from '@visapi/shared-types';

export interface LogFilters {
  level?: string;
  source?: string;
  action?: string;
  userId?: string;
  correlationId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class LogsRepository extends BaseRepository<LogEntry> {
  protected readonly tableName = 'logs';
  protected readonly logger = new Logger(LogsRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {
    super(supabaseService.serviceClient);
  }

  /**
   * Find logs by correlation ID
   */
  async findByCorrelationId(correlationId: string): Promise<LogEntry[]> {
    return this.findMany({
      where: { correlation_id: correlationId },
      orderBy: 'created_at',
      orderDirection: 'asc',
    });
  }

  /**
   * Find logs by user
   */
  async findByUserId(userId: string, limit = 100): Promise<LogEntry[]> {
    return this.findMany({
      where: { user_id: userId },
      orderBy: 'created_at',
      orderDirection: 'desc',
      limit,
    });
  }

  /**
   * Find error logs
   */
  async findErrors(limit = 100): Promise<LogEntry[]> {
    return this.findMany({
      where: { level: 'error' },
      orderBy: 'created_at',
      orderDirection: 'desc',
      limit,
    });
  }

  /**
   * Find logs with filters
   */
  async findWithFilters(
    filters: LogFilters,
    limit = 100,
    offset = 0,
  ): Promise<LogEntry[]> {
    let query = this.supabase.from(this.tableName).select('*');

    if (filters.level) {
      query = query.eq('level', filters.level);
    }
    if (filters.source) {
      query = query.eq('source', filters.source);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.correlationId) {
      query = query.eq('correlation_id', filters.correlationId);
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      this.logger.error('Error finding logs with filters', error);
      throw error;
    }

    return (data || []) as LogEntry[];
  }

  /**
   * Clean up old logs
   */
  async cleanupOldLogs(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select();

    if (error) {
      this.logger.error('Error cleaning up old logs', error);
      throw error;
    }

    return data?.length || 0;
  }

  /**
   * Get log statistics
   */
  async getStatistics(hours = 24): Promise<{
    total: number;
    byLevel: Record<string, number>;
    bySource: Record<string, number>;
    errorRate: number;
  }> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('level, source')
      .gte('created_at', since.toISOString());

    if (error) {
      this.logger.error('Error getting log statistics', error);
      throw error;
    }

    const logs = data || [];
    const byLevel: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    logs.forEach((log) => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      bySource[log.source] = (bySource[log.source] || 0) + 1;
    });

    const total = logs.length;
    const errors = byLevel['error'] || 0;

    return {
      total,
      byLevel,
      bySource,
      errorRate: total > 0 ? errors / total : 0,
    };
  }
}