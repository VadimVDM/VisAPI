# S4-QA-01 Load Testing Implementation

Comprehensive k6 load testing suite for the VisAPI project, specifically designed for S4-QA-01 requirements.

## Overview

This implementation provides production-ready load testing capabilities with:

- **Main Load Test**: 5k requests/minute for 30 minutes with realistic traffic distribution
- **PDF Batch Test**: 10GB PDF generation workload with Supabase Storage testing
- **Performance Suite**: Orchestrated test execution with comprehensive reporting
- **Test Data Generator**: Realistic visa processing data for authentic testing
- **Environment Configuration**: Multi-environment support with proper settings

## Test Files

### Core Test Scripts

- **`s4-qa-01-load-test.js`**: Main load test targeting 5k requests/minute
- **`s4-qa-01-pdf-batch-test.js`**: PDF generation and storage testing for 10GB target
- **`performance-suite.js`**: Orchestrated execution of all tests with setup/teardown
- **`config.js`**: Centralized configuration for all environments
- **`utils/test-data-generator.js`**: Realistic test data generation utilities

### Legacy Test Scripts

- **`smoke-test.js`**: Basic functionality verification
- **`visa-workflow-load-test.js`**: Original workflow load testing

## Quick Start

### Prerequisites

1. Install k6:

   ```bash
   # macOS
   brew install k6

   # Linux
   sudo apt-get install k6

   # Windows
   choco install k6
   ```

2. Ensure the backend is running:

   ```bash
   pnpm dev:backend
   ```

3. Set up environment variables:
   ```bash
   export BASE_URL="http://localhost:3000"
   export API_KEY="visapi_your-secret-key"
   ```

### Running Tests

#### Individual Tests

```bash
# Run main S4-QA-01 load test
pnpm load:s4-qa-01

# Run PDF batch test
pnpm load:s4-qa-01-pdf

# Run performance suite (all tests)
pnpm load:performance-suite

# Run smoke test only
pnpm load:smoke
```

#### Environment-Specific Tests

```bash
# Development environment
pnpm load:s4-qa-01-dev
pnpm load:pdf-batch-dev
pnpm load:suite-dev

# Staging environment
pnpm load:s4-qa-01-staging
pnpm load:pdf-batch-staging
pnpm load:suite-staging

# Production environment (requires proper API keys)
pnpm load:s4-qa-01-production
pnpm load:pdf-batch-production
pnpm load:suite-production
```

#### Selective Suite Execution

```bash
# Run only smoke test in suite
pnpm load:suite-smoke-only

# Run only load test in suite
pnpm load:suite-load-only

# Run only PDF batch test in suite
pnpm load:suite-pdf-only
```

## Test Configuration

### Main Load Test (s4-qa-01-load-test.js)

**Target**: 5,000 requests/minute for 30 minutes

**Traffic Distribution**:

- 80% Webhook triggers (`/api/v1/triggers/visa-status-update`)
- 10% Queue metrics (`/api/v1/queue/metrics`)
- 5% Workflow management (`/api/v1/workflows/*`)
- 5% Health checks (`/api/v1/healthz`, `/api/v1/livez`, `/api/v1/version`)

**Performance Thresholds**:

- P95 latency < 200ms
- Error rate < 5%
- Overall success rate > 95%
- Individual endpoint success rates > 95%

**Virtual Users**: 83 VUs (5000 req/min ÷ 60 sec = 83.33 req/sec)

### PDF Batch Test (s4-qa-01-pdf-batch-test.js)

**Target**: Generate 10GB worth of PDF documents

**Test Types**:

- 70% PDF generation via workflow triggers
- 15% Direct storage upload testing
- 15% Presigned URL generation and testing

**Performance Thresholds**:

- P95 latency < 5 seconds (PDF generation is slower)
- Error rate < 5%
- PDF generation success rate > 90%
- Storage upload success rate > 95%
- File processing P95 latency < 30 seconds

**Virtual Users**: 10 VUs (optimized for file operations)

### Performance Suite (performance-suite.js)

**Orchestrated Execution**:

1. Pre-flight checks (API connectivity, authentication, database, queue)
2. Smoke test (basic functionality verification)
3. Load test (if smoke test passes)
4. PDF batch test (parallel or sequential)
5. Comprehensive reporting and cleanup

**Features**:

- Automatic setup and teardown
- Failure isolation (smoke test failure stops suite)
- Comprehensive reporting
- Resource cleanup

## API Authentication

All tests use API key authentication with the `visapi_` prefix:

```javascript
const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': 'visapi_your-secret-key',
};
```

Required scopes:

- `triggers:create` - For webhook triggers
- `workflows:read` - For workflow management
- `queues:read` - For queue metrics
- `logs:read` - For log access (if applicable)

## Test Data Generation

The `utils/test-data-generator.js` provides realistic test data:

### Webhook Payloads

```javascript
import { generateWebhookPayload } from './utils/test-data-generator.js';

const payload = generateWebhookPayload();
// Returns complete visa application data with:
// - Applicant information
// - Visa details
// - Document verification status
// - Processing history
// - Financial information
// - Risk assessment
```

### PDF Generation Data

```javascript
import { generatePDFWorkflowPayload } from './utils/test-data-generator.js';

const pdfData = generatePDFWorkflowPayload();
// Returns PDF generation parameters with:
// - Applicant details
// - Visa certificate data
// - Template options
// - Security features
// - Embassy information
```

### Applicant Data

```javascript
import { generateApplicantData } from './utils/test-data-generator.js';

const applicant = generateApplicantData();
// Returns complete applicant profile with:
// - Personal information
// - Contact details
// - Travel documents
// - Visa history
// - Financial information
// - Risk factors
```

## Environment Configuration

The `config.js` file provides environment-specific settings:

### Development

- Reduced load targets
- Extended timeouts
- Verbose logging
- Relaxed thresholds

### Staging

- Moderate load targets
- Production-like settings
- Balanced logging
- Realistic thresholds

### Production

- Full load targets
- Strict timeouts
- Minimal logging
- Stringent thresholds

## Monitoring and Metrics

### Custom Metrics

**Load Test Metrics**:

- `webhook_trigger_success_rate`
- `webhook_trigger_latency`
- `queue_metrics_success_rate`
- `workflow_management_success_rate`
- `health_check_success_rate`
- `queue_depth_counter`

**PDF Batch Test Metrics**:

- `pdf_generation_success_rate`
- `pdf_generation_latency`
- `storage_upload_success_rate`
- `presigned_url_success_rate`
- `file_processing_latency`
- `pdf_size_bytes`
- `storage_usage_bytes`

### Thresholds

All tests include comprehensive threshold monitoring:

```javascript
thresholds: {
  http_req_duration: ['p(95)<200'],
  http_req_failed: ['rate<0.05'],
  webhook_trigger_success_rate: ['rate>0.95'],
  // ... additional thresholds
}
```

## Output and Reporting

### Test Results

Each test generates detailed JSON reports:

```bash
# Generated files
load-test-results.json           # Main load test results
pdf-batch-test-results.json      # PDF batch test results
performance-suite-results.json   # Complete suite results
```

### Console Output

Real-time progress reporting:

- Request counts and rates
- Error rates and latencies
- Queue depth monitoring
- PDF generation progress
- Storage usage tracking

### Summary Reports

Comprehensive text summaries:

- Performance metrics
- Threshold compliance
- Traffic distribution analysis
- Resource utilization
- Pass/fail status

## Error Handling

### Retry Logic

- Configurable retry attempts
- Exponential backoff
- Jitter for avoiding thundering herd

### Timeout Management

- Request-specific timeouts
- Long-running operation handling
- Graceful degradation

### Failure Isolation

- Test-specific error handling
- Suite-level failure management
- Resource cleanup on failure

## Storage Testing

### Supabase Integration

- Direct storage upload testing
- Presigned URL generation
- File size and type validation
- Storage quota monitoring

### Cost Estimation

- Storage usage calculation
- Cost projection based on usage
- Free tier limit monitoring

## Best Practices

### Running Tests

1. **Start with smoke tests** to verify basic functionality
2. **Use development environment** for initial testing
3. **Monitor system resources** during load testing
4. **Review logs** for error patterns
5. **Clean up test data** after completion

### Performance Optimization

1. **Gradual ramp-up** to avoid overwhelming the system
2. **Monitor queue depth** to prevent bottlenecks
3. **Use idempotency keys** to prevent duplicate processing
4. **Implement proper timeouts** for long-running operations
5. **Scale resources** based on test results

### Troubleshooting

1. **Check API key permissions** if authentication fails
2. **Verify database connectivity** if health checks fail
3. **Monitor Redis queue** for processing delays
4. **Review error logs** for specific failure patterns
5. **Validate test data** if unexpected behaviors occur

## Integration with CI/CD

### GitHub Actions Integration

```yaml
name: Load Testing
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install k6
        run: |
          sudo apt-get update
          sudo apt-get install k6
      - name: Run load tests
        env:
          BASE_URL: ${{ secrets.STAGING_BASE_URL }}
          API_KEY: ${{ secrets.STAGING_API_KEY }}
        run: |
          pnpm load:suite-staging
```

### Monitoring Integration

- **Grafana dashboards** for real-time metrics
- **Slack notifications** for test results
- **Email alerts** for failures
- **Prometheus metrics** integration

## Advanced Usage

### Custom Test Scenarios

```javascript
// Custom VU distribution
export const options = {
  scenarios: {
    heavy_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '10m',
      exec: 'webhookTriggerTest',
    },
    light_monitoring: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30m',
      exec: 'healthCheckTest',
    },
  },
};
```

### Environment Variables

```bash
# Test configuration
export BASE_URL="https://api.visanet.app"
export API_KEY="visapi_production-key"
export NODE_ENV="production"

# Test parameters
export TARGET_RPS="100"
export TEST_DURATION="15m"
export MAX_VUS="50"

# Feature flags
export SKIP_SETUP="false"
export RUN_SMOKE_ONLY="false"
export ENABLE_CLEANUP="true"
```

## Troubleshooting Guide

### Common Issues

1. **API Key Authentication Errors**

   - Verify API key format (`visapi_` prefix)
   - Check key permissions and scopes
   - Ensure key is not expired

2. **High Error Rates**

   - Check system resources (CPU, memory)
   - Review database connection limits
   - Monitor Redis queue capacity

3. **Slow Response Times**

   - Verify network connectivity
   - Check database query performance
   - Monitor queue processing times

4. **PDF Generation Failures**

   - Verify Puppeteer dependencies
   - Check storage permissions
   - Monitor file system space

5. **Storage Upload Issues**
   - Verify Supabase configuration
   - Check storage bucket permissions
   - Monitor storage quotas

### Debug Commands

```bash
# Test connectivity
curl -H "X-API-Key: visapi_your-key" http://localhost:3000/api/v1/healthz

# Check queue status
curl -H "X-API-Key: visapi_your-key" http://localhost:3000/api/v1/queue/metrics

# Validate workflow
curl -H "X-API-Key: visapi_your-key" http://localhost:3000/api/v1/workflows

# Test webhook trigger
curl -X POST -H "Content-Type: application/json" \
  -H "X-API-Key: visapi_your-key" \
  -H "Idempotency-Key: test-123" \
  -d '{"test": "data"}' \
  http://localhost:3000/api/v1/triggers/test-webhook
```

## Support

For issues or questions:

1. Check the [project documentation](../docs/)
2. Review the [troubleshooting guide](#troubleshooting-guide)
3. Examine test logs and error messages
4. Verify configuration settings
5. Test with reduced load first

## Contributing

When adding new tests:

1. Follow the existing code structure
2. Use the configuration system
3. Include proper error handling
4. Add comprehensive documentation
5. Test across all environments
6. Update this README as needed

---

**Last Updated**: July 16, 2025  
**Version**: S4-QA-01 Implementation  
**Author**: VisAPI Load Testing Team
