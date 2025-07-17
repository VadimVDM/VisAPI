import { useState, useEffect, useCallback } from 'react';
import { DashboardApi } from './dashboard-api';

export interface DashboardMetrics {
  totalJobs: number;
  failedJobs: number;
  activeWorkflows: number;
  successRate: number;
  avgResponseTime: number;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface UseDashboardState {
  metrics: DashboardMetrics | null;
  jobsOverTime: ChartData[];
  workflowStatus: ChartData[];
  performanceData: ChartData[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface UseDashboardActions {
  refreshMetrics: () => Promise<void>;
  refreshCharts: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export interface UseDashboardReturn extends UseDashboardState, UseDashboardActions {}

export function useDashboard(autoRefresh: boolean = true, refreshInterval: number = 30000): UseDashboardReturn {
  const [state, setState] = useState<UseDashboardState>({
    metrics: null,
    jobsOverTime: [],
    workflowStatus: [],
    performanceData: [],
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const refreshMetrics = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const metrics = await DashboardApi.getSystemMetrics();
      
      setState(prev => ({
        ...prev,
        metrics,
        loading: false,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load metrics',
      }));
    }
  }, []);

  const refreshCharts = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const [jobsOverTime, workflowStatus, performanceData] = await Promise.all([
        DashboardApi.getJobsOverTime('7d'),
        DashboardApi.getWorkflowStatusDistribution(),
        DashboardApi.getPerformanceData('24h'),
      ]);
      
      setState(prev => ({
        ...prev,
        jobsOverTime,
        workflowStatus,
        performanceData,
        loading: false,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load chart data',
      }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const [metrics, jobsOverTime, workflowStatus, performanceData] = await Promise.all([
        DashboardApi.getSystemMetrics(),
        DashboardApi.getJobsOverTime('7d'),
        DashboardApi.getWorkflowStatusDistribution(),
        DashboardApi.getPerformanceData('24h'),
      ]);
      
      setState(prev => ({
        ...prev,
        metrics,
        jobsOverTime,
        workflowStatus,
        performanceData,
        loading: false,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data',
      }));
    }
  }, []);

  // Load initial data
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshAll();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshAll]);

  return {
    ...state,
    refreshMetrics,
    refreshCharts,
    refreshAll,
  };
}