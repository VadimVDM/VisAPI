import {
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';

export const metricsProviders = [
  makeHistogramProvider({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  }),

  makeCounterProvider({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  }),

  makeGaugeProvider({
    name: 'http_active_connections',
    help: 'Number of active HTTP connections',
  }),

  makeHistogramProvider({
    name: 'job_latency_seconds',
    help: 'Job processing latency in seconds',
    labelNames: ['job_name', 'queue', 'success'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
  }),

  makeCounterProvider({
    name: 'job_fail_total',
    help: 'Total number of failed jobs',
    labelNames: ['job_name', 'queue'],
  }),

  makeGaugeProvider({
    name: 'queue_depth_total',
    help: 'Current depth of job queues',
    labelNames: ['queue', 'priority'],
  }),

  makeCounterProvider({
    name: 'webhook_processed_total',
    help: 'Total number of webhooks processed',
    labelNames: ['status'],
  }),

  makeHistogramProvider({
    name: 'workflow_execution_duration_seconds',
    help: 'Workflow execution duration in seconds',
    labelNames: ['workflow_id', 'success'],
    buckets: [0.5, 1, 5, 10, 30, 60, 300, 600],
  }),

  makeHistogramProvider({
    name: 'api_key_validation_duration_seconds',
    help: 'API key validation duration in seconds',
    labelNames: ['valid'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
  }),

  makeCounterProvider({
    name: 'redis_operations_total',
    help: 'Total number of Redis operations',
    labelNames: ['operation', 'success'],
  }),

  makeCounterProvider({
    name: 'redis_operation_errors_total',
    help: 'Total number of Redis operation errors',
    labelNames: ['operation'],
  }),
];
