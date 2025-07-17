import { QueueMetrics, WorkflowStats, SystemStats } from '@visapi/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class DashboardApi {
  private static baseUrl = `${API_BASE_URL}/api/v1`;

  static async getQueueMetrics(): Promise<QueueMetrics> {
    const response = await fetch(`${this.baseUrl}/queue/metrics`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch queue metrics: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getWorkflowStats(): Promise<WorkflowStats> {
    const response = await fetch(`${this.baseUrl}/workflows/stats`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workflow stats: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getSystemHealth(): Promise<SystemStats> {
    const response = await fetch(`${this.baseUrl}/healthz`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch system health: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getSystemMetrics(): Promise<{
    totalJobs: number;
    failedJobs: number;
    activeWorkflows: number;
    successRate: number;
    avgResponseTime: number;
  }> {
    const response = await fetch(`${this.baseUrl}/metrics/summary`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch system metrics: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getJobsOverTime(period: '24h' | '7d' | '30d' = '7d'): Promise<Array<{
    name: string;
    value: number;
  }>> {
    const response = await fetch(`${this.baseUrl}/metrics/jobs-over-time?period=${period}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch jobs over time: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getWorkflowStatusDistribution(): Promise<Array<{
    name: string;
    value: number;
  }>> {
    const response = await fetch(`${this.baseUrl}/workflows/status-distribution`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workflow status distribution: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getPerformanceData(period: '24h' | '7d' = '24h'): Promise<Array<{
    name: string;
    value: number;
  }>> {
    const response = await fetch(`${this.baseUrl}/metrics/performance?period=${period}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch performance data: ${response.statusText}`);
    }

    return await response.json();
  }
}