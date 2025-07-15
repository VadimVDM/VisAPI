# Load Testing with k6

This directory contains k6 load testing scripts for the VisAPI platform.

## Prerequisites

1. Install k6:
   ```bash
   # macOS
   brew install k6
   
   # Ubuntu/Debian
   sudo apt-get install k6
   
   # Windows
   choco install k6
   ```

2. Ensure the backend is running:
   ```bash
   pnpm dev:backend
   ```

## Test Scripts

### 1. Smoke Test (`smoke-test.js`)
Basic functionality verification with minimal load.

```bash
# Run smoke test
k6 run load-tests/smoke-test.js

# Run with custom environment
BASE_URL=https://api.visanet.app API_KEY=your-api-key k6 run load-tests/smoke-test.js
```

**Configuration:**
- 5 virtual users
- 30 second duration
- Tests basic endpoints (health, version, workflows, queue, logs)

### 2. Full Load Test (`visa-workflow-load-test.js`)
Comprehensive load testing for the visa workflow system.

```bash
# Run full load test
k6 run load-tests/visa-workflow-load-test.js

# Run with custom configuration
BASE_URL=https://api.visanet.app API_KEY=your-api-key k6 run load-tests/visa-workflow-load-test.js
```

**Configuration:**
- Ramp up: 2 minutes to 20 VUs
- Sustain: 8 minutes at 100 VUs
- Ramp down: 2 minutes to 0 VUs
- Multiple test scenarios (workflow triggers, webhooks, admin dashboard)

## Performance Thresholds

### Smoke Test
- P95 latency < 500ms
- Error rate < 10%

### Load Test
- P95 latency < 200ms
- Error rate < 5%
- Workflow trigger success rate > 95%

## Test Scenarios

### Workflow Triggers
- Creates test workflow
- Triggers workflow execution
- Verifies job completion
- Monitors queue depth

### Webhook Triggers
- Tests webhook endpoint
- Validates idempotency
- Monitors processing time

### Admin Dashboard
- Tests dashboard statistics
- Validates API key authentication
- Monitors response times

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | API base URL |
| `API_KEY` | `test-api-key-prefix_test-secret` | API key for authentication |

## Output

Tests generate detailed reports including:
- Request/response metrics
- Error rates and latencies
- Custom workflow performance metrics
- Queue depth monitoring
- Pass/fail status for all thresholds

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Run k6 Load Tests
  run: |
    k6 run load-tests/smoke-test.js
    k6 run load-tests/visa-workflow-load-test.js
```

## Interpreting Results

### Key Metrics
- **http_req_duration**: Request latency (avg, p95, max)
- **http_req_failed**: Error rate percentage
- **workflow_trigger_success_rate**: Workflow execution success rate
- **queue_depth_counter**: Queue processing metrics

### Success Criteria
- All thresholds pass
- No failed requests
- Workflow triggers complete successfully
- Queue depth remains manageable

### Troubleshooting

Common issues and solutions:

1. **High error rates**: Check API key and backend health
2. **Slow response times**: Verify database and Redis connectivity
3. **Workflow failures**: Check connector configurations
4. **Queue depth issues**: Monitor BullMQ dashboard

## Performance Baseline

Expected performance for a healthy system:
- Health check: < 50ms
- Workflow trigger: < 200ms
- Queue metrics: < 100ms
- Logs query: < 150ms
- Error rate: < 1%