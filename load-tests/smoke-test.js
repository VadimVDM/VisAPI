import http from 'k6/http';
import { check, sleep } from 'k6';

// Smoke test configuration - minimal load to verify basic functionality
export const options = {
  vus: 5, // 5 virtual users
  duration: '30s', // Run for 30 seconds
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete within 500ms
    http_req_failed: ['rate<0.1'], // Error rate must be less than 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key-prefix_test-secret';

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

export default function() {
  // Test 1: Health check
  const healthResponse = http.get(`${BASE_URL}/api/v1/healthz`);
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check has uptime': (r) => JSON.parse(r.body).uptime !== undefined,
  });

  // Test 2: Version endpoint
  const versionResponse = http.get(`${BASE_URL}/api/v1/version`);
  check(versionResponse, {
    'version endpoint status is 200': (r) => r.status === 200,
    'version has git_sha': (r) => JSON.parse(r.body).git_sha !== undefined,
  });

  // Test 3: Workflows endpoint
  const workflowsResponse = http.get(`${BASE_URL}/api/v1/workflows`, { headers });
  check(workflowsResponse, {
    'workflows endpoint status is 200': (r) => r.status === 200,
    'workflows returns array': (r) => Array.isArray(JSON.parse(r.body)),
  });

  // Test 4: Queue metrics
  const queueResponse = http.get(`${BASE_URL}/api/v1/queue/metrics`, { headers });
  check(queueResponse, {
    'queue metrics status is 200': (r) => r.status === 200,
    'queue metrics has waiting count': (r) => JSON.parse(r.body).waiting !== undefined,
  });

  // Test 5: Logs endpoint
  const logsResponse = http.get(`${BASE_URL}/api/v1/logs?limit=5`, { headers });
  check(logsResponse, {
    'logs endpoint status is 200': (r) => r.status === 200,
    'logs has data array': (r) => JSON.parse(r.body).data !== undefined,
  });

  sleep(1);
}

export function handleSummary(data) {
  const passed = data.metrics.checks.values.passes;
  const failed = data.metrics.checks.values.fails;
  const total = passed + failed;
  const passRate = (passed / total * 100).toFixed(1);
  const avgLatency = data.metrics.http_req_duration.values.avg.toFixed(2);
  const p95Latency = data.metrics.http_req_duration.values['p(95)'].toFixed(2);
  const errorRate = (data.metrics.http_req_failed.values.rate * 100).toFixed(2);
  
  console.log('=== Smoke Test Results ===');
  console.log(`Checks: ${passed}/${total} (${passRate}%)`);
  console.log(`Average Latency: ${avgLatency}ms`);
  console.log(`P95 Latency: ${p95Latency}ms`);
  console.log(`Error Rate: ${errorRate}%`);
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  
  const success = failed === 0 && data.metrics.http_req_failed.values.rate < 0.1;
  console.log(`\n=== Result: ${success ? 'PASSED' : 'FAILED'} ===`);
  
  return {
    'smoke-test-results.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      passed: success,
      checks: { passed, failed, total, passRate },
      performance: { avgLatency, p95Latency, errorRate },
      requests: data.metrics.http_reqs.values.count
    }, null, 2)
  };
}