import { LogEntry, LogFilters, LogStats, PaginatedResponse } from '@visapi/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class LogsApi {
  private static baseUrl = `${API_BASE_URL}/api/v1/logs`;

  static async getLogs(
    filters: LogFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<LogEntry>> {
    const params = new URLSearchParams();
    
    // Add pagination
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    // Add filters
    if (filters.level) params.append('level', filters.level);
    if (filters.workflow_id) params.append('workflow_id', filters.workflow_id);
    if (filters.job_id) params.append('job_id', filters.job_id);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.search) params.append('search', filters.search);

    const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getLogStats(): Promise<LogStats> {
    const response = await fetch(`${this.baseUrl}/stats`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch log stats: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getWorkflowLogs(
    workflowId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<LogEntry>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await fetch(`${this.baseUrl}/workflow/${workflowId}?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workflow logs: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getJobLogs(
    jobId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<LogEntry>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await fetch(`${this.baseUrl}/job/${jobId}?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job logs: ${response.statusText}`);
    }

    return await response.json();
  }

  static async exportLogs(
    filters: LogFilters = {},
    format: 'csv' | 'json' = 'csv'
  ): Promise<string> {
    const params = new URLSearchParams();
    
    // Add filters
    if (filters.level) params.append('level', filters.level);
    if (filters.workflow_id) params.append('workflow_id', filters.workflow_id);
    if (filters.job_id) params.append('job_id', filters.job_id);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.search) params.append('search', filters.search);
    
    params.append('format', format);

    const response = await fetch(`${this.baseUrl}/export?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to export logs: ${response.statusText}`);
    }

    return await response.text();
  }
}