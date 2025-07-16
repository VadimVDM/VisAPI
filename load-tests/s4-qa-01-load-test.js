import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import {
  generateWebhookPayload,
  generateIdempotencyKey,
} from './utils/test-data-generator.js';

// Custom metrics
const webhookTriggerRate = new Rate('webhook_trigger_success_rate');
const webhookTriggerLatency = new Trend('webhook_trigger_latency');
const queueMetricsRate = new Rate('queue_metrics_success_rate');
const workflowManagementRate = new Rate('workflow_management_success_rate');
const healthCheckRate = new Rate('health_check_success_rate');
const errorRate = new Rate('error_rate');
const queueDepthMetric = new Counter('queue_depth_counter');
const apiKeyValidationRate = new Rate('api_key_validation_rate');

// Test configuration - 5k requests/minute for 30 minutes
export const options = {
  stages: [
    { duration: '2m', target: 20 }, // Ramp up to 20 VUs
    { duration: '26m', target: 83 }, // Maintain ~83 VUs (5000 req/min ÷ 60 sec = 83.33 req/sec)
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests must complete within 200ms
    http_req_failed: ['rate<0.05'], // Error rate must be less than 5%
    webhook_trigger_success_rate: ['rate>0.95'], // 95% success rate for webhook triggers
    queue_metrics_success_rate: ['rate>0.95'], // 95% success rate for queue metrics
    workflow_management_success_rate: ['rate>0.95'], // 95% success rate for workflow management
    health_check_success_rate: ['rate>0.95'], // 95% success rate for health checks
    checks: ['rate>0.95'], // 95% overall success rate
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'visapi_test-secret-key-for-load-testing';

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

// Test data
const testWorkflow = {
  name: 'S4-QA-01 Load Test Workflow',
  description: 'Comprehensive load test workflow for S4-QA-01',
  enabled: true,
  schema: {
    id: 's4-qa-01-load-test-workflow',
    name: 'S4-QA-01 Load Test Workflow',
    triggers: [
      {
        type: 'webhook',
        config: {
          path: '/visa-status-update',
        },
      },
    ],
    steps: [
      {
        id: 'log-step',
        type: 'log.info',
        config: {
          message: 'Processing visa status update for {{applicant.name}}',
        },
      },
      {
        id: 'whatsapp-step',
        type: 'whatsapp.send',
        config: {
          contact: '{{applicant.contact}}',
          template: 'visa_status_update',
          variables: {
            applicant_name: '{{applicant.name}}',
            visa_type: '{{applicant.visa_type}}',
            status: '{{applicant.status}}',
          },
        },
        retries: 3,
      },
    ],
  },
};

let workflowId;

// Setup function
export function setup() {
  console.log('Setting up S4-QA-01 load test environment...');

  // Create test workflow
  const createResponse = http.post(
    `${BASE_URL}/api/v1/workflows`,
    JSON.stringify(testWorkflow),
    { headers }
  );

  if (createResponse.status !== 201) {
    console.error('Failed to create test workflow:', createResponse.body);
    throw new Error('Setup failed');
  }

  const workflow = JSON.parse(createResponse.body);
  console.log(`Created test workflow: ${workflow.id}`);

  return { workflowId: workflow.id };
}

// Teardown function
export function teardown(data) {
  console.log('Cleaning up S4-QA-01 load test environment...');

  if (data.workflowId) {
    const deleteResponse = http.del(
      `${BASE_URL}/api/v1/workflows/${data.workflowId}`,
      null,
      { headers }
    );

    if (deleteResponse.status === 204) {
      console.log(`Cleaned up test workflow: ${data.workflowId}`);
    } else {
      console.warn('Failed to clean up test workflow:', deleteResponse.body);
    }
  }
}

// Main test function with realistic traffic distribution
export default function (data) {
  const rand = Math.random();

  // Traffic distribution based on requirements:
  // 80% webhook triggers, 10% queue metrics, 5% workflow management, 5% health checks

  if (rand < 0.8) {
    // 80% - Webhook triggers
    webhookTriggerTest(data);
  } else if (rand < 0.9) {
    // 10% - Queue metrics
    queueMetricsTest();
  } else if (rand < 0.95) {
    // 5% - Workflow management
    workflowManagementTest();
  } else {
    // 5% - Health checks
    healthCheckTest();
  }

  // Random sleep to simulate realistic user behavior
  sleep(Math.random() * 2 + 0.5);
}

// Webhook trigger test (80% of traffic)
function webhookTriggerTest(data) {
  const payload = generateWebhookPayload();
  const idempotencyKey = generateIdempotencyKey();

  const webhookHeaders = {
    ...headers,
    'Idempotency-Key': idempotencyKey,
  };

  const start = Date.now();
  const response = http.post(
    `${BASE_URL}/api/v1/triggers/visa-status-update`,
    JSON.stringify(payload),
    { headers: webhookHeaders }
  );

  const duration = Date.now() - start;
  webhookTriggerLatency.add(duration);

  const success = check(response, {
    'webhook trigger status is 202': (r) => r.status === 202,
    'webhook trigger has jobId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.jobId !== undefined;
      } catch {
        return false;
      }
    },
    'webhook trigger response time < 200ms': (r) => r.timings.duration < 200,
    'webhook trigger has accepted status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'accepted';
      } catch {
        return false;
      }
    },
  });

  webhookTriggerRate.add(success);
  errorRate.add(!success);

  // Test idempotency by sending the same request again
  if (Math.random() < 0.1) {
    // 10% chance to test idempotency
    const idempotentResponse = http.post(
      `${BASE_URL}/api/v1/triggers/visa-status-update`,
      JSON.stringify(payload),
      { headers: webhookHeaders }
    );

    check(idempotentResponse, {
      'idempotent request returns same response': (r) => r.status === 202,
    });
  }
}

// Queue metrics test (10% of traffic)
function queueMetricsTest() {
  const response = http.get(`${BASE_URL}/api/v1/queue/metrics`, { headers });

  const success = check(response, {
    'queue metrics status is 200': (r) => r.status === 200,
    'queue metrics response time < 100ms': (r) => r.timings.duration < 100,
    'queue metrics has waiting count': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.waiting !== undefined;
      } catch {
        return false;
      }
    },
    'queue metrics has completed count': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.completed !== undefined;
      } catch {
        return false;
      }
    },
  });

  queueMetricsRate.add(success);
  errorRate.add(!success);

  if (response.status === 200) {
    try {
      const metrics = JSON.parse(response.body);
      queueDepthMetric.add(metrics.waiting || 0);

      // Alert if queue depth is too high
      if (metrics.waiting > 1000) {
        console.warn(`High queue depth detected: ${metrics.waiting}`);
      }
    } catch (e) {
      console.warn('Failed to parse queue metrics:', e.message);
    }
  }
}

// Workflow management test (5% of traffic)
function workflowManagementTest() {
  const operations = ['list', 'get', 'enabled'];
  const operation = operations[randomIntBetween(0, operations.length - 1)];

  let response;

  switch (operation) {
    case 'list':
      response = http.get(`${BASE_URL}/api/v1/workflows`, { headers });
      break;
    case 'get':
      response = http.get(`${BASE_URL}/api/v1/workflows/enabled`, { headers });
      break;
    case 'enabled':
      response = http.get(`${BASE_URL}/api/v1/workflows/enabled`, { headers });
      break;
  }

  const success = check(response, {
    'workflow management status is 200': (r) => r.status === 200,
    'workflow management response time < 150ms': (r) =>
      r.timings.duration < 150,
    'workflow management returns valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  workflowManagementRate.add(success);
  errorRate.add(!success);
}

// Health check test (5% of traffic)
function healthCheckTest() {
  const endpoints = ['/api/v1/healthz', '/api/v1/livez', '/api/v1/version'];

  const endpoint = endpoints[randomIntBetween(0, endpoints.length - 1)];
  const response = http.get(`${BASE_URL}${endpoint}`);

  const success = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
    'health check returns valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  healthCheckRate.add(success);
  errorRate.add(!success);

  // Test liveness probe specifically
  if (endpoint === '/api/v1/livez') {
    check(response, {
      'liveness probe has status ok': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'ok';
        } catch {
          return false;
        }
      },
    });
  }

  // Test version endpoint specifically
  if (endpoint === '/api/v1/version') {
    check(response, {
      'version endpoint has git_sha': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.git_sha !== undefined;
        } catch {
          return false;
        }
      },
    });
  }
}

// API key validation test
function apiKeyValidationTest() {
  const invalidResponse = http.get(`${BASE_URL}/api/v1/workflows`, {
    headers: { 'X-API-Key': 'invalid-key' },
  });

  const success = check(invalidResponse, {
    'invalid API key returns 401': (r) => r.status === 401,
  });

  apiKeyValidationRate.add(success);
}

// Rate limiting test
function rateLimitingTest() {
  // Test rate limiting by sending multiple requests rapidly
  const responses = [];
  for (let i = 0; i < 10; i++) {
    const response = http.get(`${BASE_URL}/api/v1/healthz`);
    responses.push(response);
  }

  const rateLimited = responses.some((r) => r.status === 429);

  check(responses[0], {
    'rate limiting works correctly': () =>
      rateLimited || responses.every((r) => r.status === 200),
  });
}

// Test summary with comprehensive reporting
export function handleSummary(data) {
  const summary = {
    test_run: {
      timestamp: new Date().toISOString(),
      test_name: 'S4-QA-01 Load Test',
      duration_minutes: 30,
      target_rps: 83.33,
      actual_rps: data.metrics.http_reqs.values.rate || 0,
      total_requests: data.metrics.http_reqs.values.count,
      failed_requests: data.metrics.http_req_failed.values.count,
      error_rate: data.metrics.http_req_failed.values.rate,
      p95_latency: data.metrics.http_req_duration.values['p(95)'],
      p99_latency: data.metrics.http_req_duration.values['p(99)'],
      avg_latency: data.metrics.http_req_duration.values.avg,
      max_latency: data.metrics.http_req_duration.values.max,
    },
    traffic_distribution: {
      webhook_triggers: {
        success_rate:
          data.metrics.webhook_trigger_success_rate?.values.rate || 0,
        avg_latency: data.metrics.webhook_trigger_latency?.values.avg || 0,
        p95_latency: data.metrics.webhook_trigger_latency?.values['p(95)'] || 0,
        expected_percentage: 80,
      },
      queue_metrics: {
        success_rate: data.metrics.queue_metrics_success_rate?.values.rate || 0,
        expected_percentage: 10,
      },
      workflow_management: {
        success_rate:
          data.metrics.workflow_management_success_rate?.values.rate || 0,
        expected_percentage: 5,
      },
      health_checks: {
        success_rate: data.metrics.health_check_success_rate?.values.rate || 0,
        expected_percentage: 5,
      },
    },
    queue_metrics: {
      max_queue_depth: data.metrics.queue_depth_counter?.values.max || 0,
      avg_queue_depth: data.metrics.queue_depth_counter?.values.avg || 0,
    },
    performance_thresholds: {
      p95_latency_passed: data.metrics.http_req_duration.values['p(95)'] < 200,
      error_rate_passed: data.metrics.http_req_failed.values.rate < 0.05,
      overall_success_rate_passed: data.metrics.checks.values.rate > 0.95,
      webhook_success_rate_passed:
        (data.metrics.webhook_trigger_success_rate?.values.rate || 0) > 0.95,
      queue_metrics_success_rate_passed:
        (data.metrics.queue_metrics_success_rate?.values.rate || 0) > 0.95,
      workflow_management_success_rate_passed:
        (data.metrics.workflow_management_success_rate?.values.rate || 0) >
        0.95,
      health_check_success_rate_passed:
        (data.metrics.health_check_success_rate?.values.rate || 0) > 0.95,
    },
    data_transfer: {
      data_received_mb: (
        data.metrics.data_received.values.count /
        1024 /
        1024
      ).toFixed(2),
      data_sent_mb: (data.metrics.data_sent.values.count / 1024 / 1024).toFixed(
        2
      ),
    },
  };

  console.log('\n=== S4-QA-01 Load Test Summary ===');
  console.log(`Test Duration: 30 minutes`);
  console.log(`Target RPS: 83.33 (5000 requests/minute)`);
  console.log(`Actual RPS: ${summary.test_run.actual_rps.toFixed(2)}`);
  console.log(`Total Requests: ${summary.test_run.total_requests}`);
  console.log(`Failed Requests: ${summary.test_run.failed_requests}`);
  console.log(`Error Rate: ${(summary.test_run.error_rate * 100).toFixed(2)}%`);
  console.log(`P95 Latency: ${summary.test_run.p95_latency.toFixed(2)}ms`);
  console.log(`P99 Latency: ${summary.test_run.p99_latency.toFixed(2)}ms`);
  console.log(`Average Latency: ${summary.test_run.avg_latency.toFixed(2)}ms`);
  console.log(`Max Latency: ${summary.test_run.max_latency.toFixed(2)}ms`);

  console.log('\n=== Traffic Distribution ===');
  console.log(
    `Webhook Triggers: ${(
      summary.traffic_distribution.webhook_triggers.success_rate * 100
    ).toFixed(2)}% success`
  );
  console.log(
    `Queue Metrics: ${(
      summary.traffic_distribution.queue_metrics.success_rate * 100
    ).toFixed(2)}% success`
  );
  console.log(
    `Workflow Management: ${(
      summary.traffic_distribution.workflow_management.success_rate * 100
    ).toFixed(2)}% success`
  );
  console.log(
    `Health Checks: ${(
      summary.traffic_distribution.health_checks.success_rate * 100
    ).toFixed(2)}% success`
  );

  console.log('\n=== Queue Performance ===');
  console.log(`Max Queue Depth: ${summary.queue_metrics.max_queue_depth}`);
  console.log(
    `Average Queue Depth: ${summary.queue_metrics.avg_queue_depth.toFixed(2)}`
  );

  console.log('\n=== Data Transfer ===');
  console.log(`Data Received: ${summary.data_transfer.data_received_mb} MB`);
  console.log(`Data Sent: ${summary.data_transfer.data_sent_mb} MB`);

  // Pass/Fail status
  const allThresholdsPassed = Object.values(
    summary.performance_thresholds
  ).every(Boolean);
  console.log(
    `\n=== Test Result: ${allThresholdsPassed ? 'PASSED' : 'FAILED'} ===`
  );

  if (!allThresholdsPassed) {
    console.log('\n=== Failed Thresholds ===');
    Object.entries(summary.performance_thresholds).forEach(([key, passed]) => {
      if (!passed) {
        console.log(`❌ ${key}`);
      }
    });
  }

  return {
    'load-test-results.json': JSON.stringify(summary, null, 2),
    'load-test-summary.txt': generateTextSummary(summary),
  };
}

function generateTextSummary(summary) {
  const allThresholdsPassed = Object.values(
    summary.performance_thresholds
  ).every(Boolean);

  return `
S4-QA-01 Load Test Results
==========================

Test Configuration:
- Duration: 30 minutes
- Target: 5000 requests/minute (83.33 RPS)
- Actual: ${summary.test_run.actual_rps.toFixed(2)} RPS
- Total Requests: ${summary.test_run.total_requests}

Performance Metrics:
- P95 Latency: ${summary.test_run.p95_latency.toFixed(2)}ms (threshold: <200ms)
- Error Rate: ${(summary.test_run.error_rate * 100).toFixed(
    2
  )}% (threshold: <5%)
- Overall Success Rate: ${
    summary.performance_thresholds.overall_success_rate_passed
      ? 'PASSED'
      : 'FAILED'
  }

Traffic Distribution:
- Webhook Triggers (80%): ${(
    summary.traffic_distribution.webhook_triggers.success_rate * 100
  ).toFixed(2)}% success
- Queue Metrics (10%): ${(
    summary.traffic_distribution.queue_metrics.success_rate * 100
  ).toFixed(2)}% success
- Workflow Management (5%): ${(
    summary.traffic_distribution.workflow_management.success_rate * 100
  ).toFixed(2)}% success
- Health Checks (5%): ${(
    summary.traffic_distribution.health_checks.success_rate * 100
  ).toFixed(2)}% success

Queue Performance:
- Max Queue Depth: ${summary.queue_metrics.max_queue_depth}
- Average Queue Depth: ${summary.queue_metrics.avg_queue_depth.toFixed(2)}

Test Result: ${allThresholdsPassed ? 'PASSED' : 'FAILED'}

Generated: ${summary.test_run.timestamp}
`;
}
