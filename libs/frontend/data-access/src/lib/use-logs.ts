import { useState, useEffect, useCallback } from 'react';
import { LogEntry, LogFilters, LogStats, PaginatedResponse } from '@visapi/shared-types';
import { LogsApi } from './logs-api';

export interface UseLogsState {
  logs: LogEntry[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: LogStats | null;
}

export interface UseLogsActions {
  loadLogs: (filters?: LogFilters, page?: number) => Promise<void>;
  loadStats: () => Promise<void>;
  setFilters: (filters: LogFilters) => void;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
  exportLogs: (format?: 'csv' | 'json') => Promise<string>;
}

export interface UseLogsReturn extends UseLogsState, UseLogsActions {}

export function useLogs(
  initialFilters: LogFilters = {},
  initialPage: number = 1,
  limit: number = 50
): UseLogsReturn {
  const [state, setState] = useState<UseLogsState>({
    logs: [],
    loading: false,
    error: null,
    pagination: {
      page: initialPage,
      limit,
      total: 0,
      pages: 0,
    },
    stats: null,
  });

  const [currentFilters, setCurrentFilters] = useState<LogFilters>(initialFilters);

  const loadLogs = useCallback(async (filters?: LogFilters, page?: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const filtersToUse = filters || currentFilters;
      const pageToUse = page || state.pagination.page;
      
      const response = await LogsApi.getLogs(filtersToUse, pageToUse, limit);
      
      setState(prev => ({
        ...prev,
        logs: response.data,
        pagination: {
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          pages: response.pagination.pages,
        },
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load logs',
      }));
    }
  }, [currentFilters, state.pagination.page, limit]);

  const loadStats = useCallback(async () => {
    try {
      const stats = await LogsApi.getLogStats();
      setState(prev => ({ ...prev, stats }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load stats',
      }));
    }
  }, []);

  const setFilters = useCallback((filters: LogFilters) => {
    setCurrentFilters(filters);
    loadLogs(filters, 1); // Reset to first page when filters change
  }, [loadLogs]);

  const setPage = useCallback((page: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page },
    }));
    loadLogs(currentFilters, page);
  }, [loadLogs, currentFilters]);

  const refresh = useCallback(async () => {
    await Promise.all([
      loadLogs(currentFilters, state.pagination.page),
      loadStats(),
    ]);
  }, [loadLogs, loadStats, currentFilters, state.pagination.page]);

  const exportLogs = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    return await LogsApi.exportLogs(currentFilters, format);
  }, [currentFilters]);

  // Load initial data
  useEffect(() => {
    loadLogs();
    loadStats();
  }, []);

  return {
    ...state,
    loadLogs,
    loadStats,
    setFilters,
    setPage,
    refresh,
    exportLogs,
  };
}