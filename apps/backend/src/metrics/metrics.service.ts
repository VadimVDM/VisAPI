import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    public httpRequestDuration: Histogram<string>,

    @InjectMetric('http_requests_total')
    public httpRequestsTotal: Counter<string>,

    @InjectMetric('http_active_connections')
    public httpActiveConnections: Gauge<string>,

    @InjectMetric('job_latency_seconds')
    public jobLatencySeconds: Histogram<string>,

    @InjectMetric('job_fail_total')
    public jobFailTotal: Counter<string>,

    @InjectMetric('queue_depth_total')
    public queueDepthTotal: Gauge<string>,

    @InjectMetric('webhook_processed_total')
    public webhookProcessedTotal: Counter<string>,

    @InjectMetric('workflow_execution_duration_seconds')
    public workflowExecutionDuration: Histogram<string>,

    @InjectMetric('api_key_validation_duration_seconds')
    public apiKeyValidationDuration: Histogram<string>,

    @InjectMetric('redis_operations_total')
    public redisOperationsTotal: Counter<string>,

    @InjectMetric('redis_operation_errors_total')
    public redisOperationErrorsTotal: Counter<string>,
  ) {}

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ): void {
    const labels = { method, route, status_code: statusCode.toString() };

    this.httpRequestDuration.observe(labels, duration / 1000); // Convert to seconds
    this.httpRequestsTotal.inc(labels);
  }

  incrementActiveConnections(): void {
    this.httpActiveConnections.inc();
  }

  decrementActiveConnections(): void {
    this.httpActiveConnections.dec();
  }

  recordJobExecution(
    jobName: string,
    queue: string,
    success: boolean,
    duration: number,
  ): void {
    const labels = { job_name: jobName, queue, success: success.toString() };

    this.jobLatencySeconds.observe(labels, duration / 1000);

    if (!success) {
      this.jobFailTotal.inc({ job_name: jobName, queue });
    }
  }

  setQueueDepth(queue: string, priority: string, depth: number): void {
    this.queueDepthTotal.set({ queue, priority }, depth);
  }

  incrementWebhookProcessed(status: 'success' | 'failure'): void {
    this.webhookProcessedTotal.inc({ status });
  }

  recordWorkflowExecution(
    workflowId: string,
    duration: number,
    success: boolean,
  ): void {
    this.workflowExecutionDuration.observe(
      { workflow_id: workflowId, success: success.toString() },
      duration / 1000,
    );
  }

  recordApiKeyValidation(duration: number, valid: boolean): void {
    this.apiKeyValidationDuration.observe(
      { valid: valid.toString() },
      duration / 1000,
    );
  }

  recordRedisOperation(operation: string, success: boolean): void {
    this.redisOperationsTotal.inc({ operation, success: success.toString() });

    if (!success) {
      this.redisOperationErrorsTotal.inc({ operation });
    }
  }
}
