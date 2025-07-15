import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const workflowTriggerRate = new Rate('workflow_trigger_success_rate');
const workflowTriggerLatency = new Trend('workflow_trigger_latency');
const queueDepthMetric = new Counter('queue_depth_counter');
const errorRate = new Rate('error_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 20 }, // Ramp up to 20 VUs over 2 minutes
    { duration: '8m', target: 100 }, // Stay at 100 VUs for 8 minutes (main test)
    { duration: '2m', target: 0 }, // Ramp down to 0 VUs over 2 minutes
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests must complete within 200ms
    http_req_failed: ['rate<0.05'], // Error rate must be less than 5%
    workflow_trigger_success_rate: ['rate>0.95'], // 95% success rate for workflow triggers
    workflow_trigger_latency: ['p(95)<200'], // 95% of workflow triggers under 200ms
  },
};

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key-prefix_test-secret';

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

// Test data
const testWorkflow = {
  name: 'Load Test Workflow',
  description: 'Workflow for k6 load testing',
  enabled: true,
  schema: {
    id: 'load-test-workflow',
    name: 'Load Test Workflow',
    triggers: [
      {
        type: 'webhook',
        config: {
          path: '/visa-status-update'
        }
      }
    ],
    steps: [
      {
        id: 'log-step',
        type: 'log.info',
        config: {
          message: 'Processing visa status update for {{applicant.name}}'
        }
      },
      {
        id: 'whatsapp-step',
        type: 'whatsapp.send',
        config: {
          contact: '+1234567890',
          template: 'visa_approved',
          variables: {
            applicant_name: '{{applicant.name}}',
            visa_type: '{{applicant.visa_type}}',
            approval_date: '{{applicant.approval_date}}'
          }
        },
        retries: 3
      }
    ]
  }
};

let workflowId;

// Setup function to create test workflow
export function setup() {
  console.log('Setting up load test environment...');
  
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

// Teardown function to clean up
export function teardown(data) {
  console.log('Cleaning up load test environment...');
  
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

// Main test function
export default function(data) {
  const applicantId = Math.floor(Math.random() * 10000);
  
  // Test scenario 1: Health check
  const healthResponse = http.get(`${BASE_URL}/api/v1/healthz`);
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  });
  
  // Test scenario 2: Workflow trigger
  const triggerPayload = {
    context: {
      applicant: {
        name: `Test Applicant ${applicantId}`,
        visa_type: 'Tourist',
        approval_date: '2025-07-15',
        id: applicantId
      }
    }
  };
  
  const triggerStart = Date.now();
  const triggerResponse = http.post(
    `${BASE_URL}/api/v1/workflows/${data.workflowId}/trigger`,
    JSON.stringify(triggerPayload),
    { headers }
  );
  
  const triggerDuration = Date.now() - triggerStart;
  workflowTriggerLatency.add(triggerDuration);
  
  const triggerSuccess = check(triggerResponse, {
    'workflow trigger status is 200': (r) => r.status === 200,
    'workflow trigger has jobId': (r) => JSON.parse(r.body).jobId !== undefined,
    'workflow trigger response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  workflowTriggerRate.add(triggerSuccess);
  errorRate.add(!triggerSuccess);
  
  // Test scenario 3: Queue metrics
  const queueResponse = http.get(`${BASE_URL}/api/v1/queue/metrics`, { headers });
  check(queueResponse, {
    'queue metrics status is 200': (r) => r.status === 200,
    'queue metrics response time < 100ms': (r) => r.timings.duration < 100,
  });
  
  if (queueResponse.status === 200) {
    const queueMetrics = JSON.parse(queueResponse.body);
    queueDepthMetric.add(queueMetrics.waiting || 0);
    
    // Alert if queue depth is too high
    if (queueMetrics.waiting > 1000) {
      console.warn(`High queue depth detected: ${queueMetrics.waiting}`);
    }
  }
  
  // Test scenario 4: Logs endpoint
  const logsResponse = http.get(
    `${BASE_URL}/api/v1/logs?limit=10&workflow_id=${data.workflowId}`,
    { headers }
  );
  
  check(logsResponse, {
    'logs endpoint status is 200': (r) => r.status === 200,
    'logs endpoint response time < 150ms': (r) => r.timings.duration < 150,
  });
  
  // Test scenario 5: API key validation
  const invalidKeyResponse = http.get(`${BASE_URL}/api/v1/workflows`, {
    headers: { 'X-API-Key': 'invalid-key' }
  });
  
  check(invalidKeyResponse, {
    'invalid API key returns 401': (r) => r.status === 401,
  });
  
  // Random sleep between 1-3 seconds to simulate real user behavior
  sleep(Math.random() * 2 + 1);
}

// Additional test scenarios
export function webhookTriggerTest(data) {
  // Test webhook trigger endpoint
  const webhookResponse = http.post(
    `${BASE_URL}/api/v1/triggers/visa-status-update`,
    JSON.stringify({
      applicant_id: Math.floor(Math.random() * 10000),
      status: 'approved',
      timestamp: new Date().toISOString()
    }),
    { headers }
  );
  
  check(webhookResponse, {
    'webhook trigger status is 200': (r) => r.status === 200,
    'webhook trigger response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  sleep(1);
}

export function adminDashboardTest() {
  // Test admin dashboard endpoints
  const dashboardResponse = http.get(`${BASE_URL}/api/v1/dashboard/stats`, { headers });
  
  check(dashboardResponse, {
    'dashboard stats status is 200': (r) => r.status === 200,
    'dashboard stats response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}

// Performance test scenarios
export const scenarios = {
  workflow_triggers: {
    executor: 'ramping-vus',
    exec: 'default',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 20 },
      { duration: '8m', target: 100 },
      { duration: '2m', target: 0 },
    ],
  },
  webhook_triggers: {
    executor: 'constant-vus',
    exec: 'webhookTriggerTest',
    vus: 10,
    duration: '10m',
    startTime: '1m',
  },
  admin_dashboard: {
    executor: 'constant-vus',
    exec: 'adminDashboardTest',
    vus: 5,
    duration: '10m',
    startTime: '30s',
  },
};

// Test summary
export function handleSummary(data) {
  const summary = {
    test_run: {
      timestamp: new Date().toISOString(),
      duration: data.metrics.iteration_duration.values.avg,
      total_requests: data.metrics.http_reqs.values.count,
      failed_requests: data.metrics.http_req_failed.values.count,
      error_rate: data.metrics.http_req_failed.values.rate,
      p95_latency: data.metrics.http_req_duration.values['p(95)'],
      avg_latency: data.metrics.http_req_duration.values.avg,
    },
    workflow_performance: {
      trigger_success_rate: data.metrics.workflow_trigger_success_rate?.values.rate || 0,
      trigger_p95_latency: data.metrics.workflow_trigger_latency?.values['p(95)'] || 0,
      trigger_avg_latency: data.metrics.workflow_trigger_latency?.values.avg || 0,
    },
    queue_metrics: {
      max_queue_depth: data.metrics.queue_depth_counter?.values.max || 0,
      avg_queue_depth: data.metrics.queue_depth_counter?.values.avg || 0,
    },
    thresholds: {
      p95_latency_passed: data.metrics.http_req_duration.values['p(95)'] < 200,
      error_rate_passed: data.metrics.http_req_failed.values.rate < 0.05,
      workflow_success_rate_passed: (data.metrics.workflow_trigger_success_rate?.values.rate || 0) > 0.95,
    }
  };
  
  console.log('=== Load Test Summary ===');
  console.log(`Total Requests: ${summary.test_run.total_requests}`);
  console.log(`Failed Requests: ${summary.test_run.failed_requests}`);
  console.log(`Error Rate: ${(summary.test_run.error_rate * 100).toFixed(2)}%`);
  console.log(`P95 Latency: ${summary.test_run.p95_latency.toFixed(2)}ms`);
  console.log(`Average Latency: ${summary.test_run.avg_latency.toFixed(2)}ms`);
  console.log(`Workflow Trigger Success Rate: ${(summary.workflow_performance.trigger_success_rate * 100).toFixed(2)}%`);
  console.log(`Workflow Trigger P95 Latency: ${summary.workflow_performance.trigger_p95_latency.toFixed(2)}ms`);
  console.log(`Max Queue Depth: ${summary.queue_metrics.max_queue_depth}`);
  
  // Pass/Fail status
  const allThresholdsPassed = Object.values(summary.thresholds).every(Boolean);
  console.log(`\n=== Test Result: ${allThresholdsPassed ? 'PASSED' : 'FAILED'} ===`);
  
  return {
    'summary.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Helper function for text summary
function textSummary(data, { indent = '', enableColors = false } = {}) {
  const colorize = enableColors ? (text, color) => `\x1b[${color}m${text}\x1b[0m` : (text) => text;
  
  return `
${indent}checks.........................: ${colorize(data.metrics.checks.values.passes, '32')}/${data.metrics.checks.values.passes + data.metrics.checks.values.fails} (${((data.metrics.checks.values.passes / (data.metrics.checks.values.passes + data.metrics.checks.values.fails)) * 100).toFixed(1)}%)
${indent}data_received..................: ${(data.metrics.data_received.values.count / 1024 / 1024).toFixed(2)} MB
${indent}data_sent......................: ${(data.metrics.data_sent.values.count / 1024 / 1024).toFixed(2)} MB
${indent}http_req_duration..............: avg=${data.metrics.http_req_duration.values.avg.toFixed(2)}ms min=${data.metrics.http_req_duration.values.min.toFixed(2)}ms med=${data.metrics.http_req_duration.values.med.toFixed(2)}ms max=${data.metrics.http_req_duration.values.max.toFixed(2)}ms p(90)=${data.metrics.http_req_duration.values['p(90)'].toFixed(2)}ms p(95)=${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}http_req_failed................: ${((data.metrics.http_req_failed.values.rate || 0) * 100).toFixed(2)}% ✓ ${data.metrics.http_req_failed.values.count} ✗ ${data.metrics.http_reqs.values.count - data.metrics.http_req_failed.values.count}
${indent}http_reqs......................: ${data.metrics.http_reqs.values.count} (${(data.metrics.http_reqs.values.rate || 0).toFixed(2)}/s)
${indent}iteration_duration.............: avg=${data.metrics.iteration_duration.values.avg.toFixed(2)}ms min=${data.metrics.iteration_duration.values.min.toFixed(2)}ms med=${data.metrics.iteration_duration.values.med.toFixed(2)}ms max=${data.metrics.iteration_duration.values.max.toFixed(2)}ms p(90)=${data.metrics.iteration_duration.values['p(90)'].toFixed(2)}ms p(95)=${data.metrics.iteration_duration.values['p(95)'].toFixed(2)}ms
${indent}iterations.....................: ${data.metrics.iterations.values.count} (${(data.metrics.iterations.values.rate || 0).toFixed(2)}/s)
${indent}vus............................: ${data.metrics.vus.values.value} min=${data.metrics.vus.values.min} max=${data.metrics.vus.values.max}
${indent}vus_max........................: ${data.metrics.vus_max.values.value} min=${data.metrics.vus_max.values.min} max=${data.metrics.vus_max.values.max}
  `;
}