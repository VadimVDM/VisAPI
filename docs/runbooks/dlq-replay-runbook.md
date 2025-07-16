# DLQ (Dead Letter Queue) Replay Runbook

**Document**: S4-DOC-01  
**Version**: 1.0  
**Last Updated**: July 16, 2025  
**Owner**: VisAPI Operations Team

## Overview

This runbook provides step-by-step procedures for diagnosing, analyzing, and replaying failed jobs from the Dead Letter Queue (DLQ) in the VisAPI system.

### When to Use This Runbook

- Jobs are failing after exhausting retry attempts
- Queue backlog is growing due to persistent failures
- Need to replay jobs after fixing underlying issues
- System alerts indicate high failure rates in queue processing

### System Architecture

VisAPI uses BullMQ with Redis (Upstash) for job queuing with three priority levels:

- **Critical Queue**: Priority 10 (urgent system operations)
- **Default Queue**: Priority 5 (standard workflow processing)
- **Bulk Queue**: Priority 1 (background tasks)

Failed jobs are retained (`removeOnFail: false`) and configured with exponential backoff retry logic.

## Prerequisites

### Required Access

- **Production API Access**: Valid API key with `queues:read` scope
- **Redis Access**: Connection to Upstash Redis instance
- **Monitoring Access**: Grafana/Prometheus dashboards
- **Logs Access**: Application logs via production logging system

### Required Tools

- `curl` or HTTP client for API calls
- `redis-cli` for direct Redis operations
- `node` for running JavaScript utilities
- Access to production environment variables

### Environment Variables

```bash
# Required for queue operations
export REDIS_URL="rediss://default:password@host:port"
export API_BASE_URL="https://api.visanet.app"
export API_KEY="visapi_your_api_key_here"
```

## Step-by-Step DLQ Replay Process

### Step 1: Identify Failed Jobs

#### Check Queue Metrics

```bash
# Get current queue status
curl -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/queue/metrics"
```

**Expected Response:**

```json
[
  {
    "name": "critical",
    "waiting": 0,
    "active": 2,
    "completed": 1205,
    "failed": 15,
    "delayed": 0
  },
  {
    "name": "default",
    "waiting": 5,
    "active": 1,
    "completed": 8932,
    "failed": 42,
    "delayed": 3
  },
  {
    "name": "bulk",
    "waiting": 12,
    "active": 0,
    "completed": 2156,
    "failed": 8,
    "delayed": 0
  }
]
```

#### Review System Health

```bash
# Check overall system health
curl "$API_BASE_URL/api/v1/healthz"

# Check detailed health including Redis
curl "$API_BASE_URL/health"
```

### Step 2: Analyze Failure Reasons

#### Direct Redis Inspection

```bash
# Connect to Redis and examine failed jobs
redis-cli -u "$REDIS_URL"

# List failed jobs in default queue
LRANGE bull:default:failed 0 -1

# Get specific job details
HGETALL bull:default:job_id
```

#### Application Logs Analysis

```bash
# Search for job failures in logs
curl -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/logs?level=error&limit=100&search=job"
```

### Step 3: Fix Underlying Issues

#### Common Failure Scenarios

**1. Database Connection Issues**

```bash
# Check database health
curl "$API_BASE_URL/health"

# Verify database connectivity
psql "$DATABASE_URL" -c "SELECT 1;"
```

**2. External API Failures**

```bash
# Check CGB API connectivity
curl -H "Authorization: Bearer $CGB_API_KEY" \
  "$CGB_API_URL/health"

# Verify Slack webhook
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "Health check"}'
```

**3. Redis Connection Issues**

```bash
# Test Redis connectivity
redis-cli -u "$REDIS_URL" ping
```

### Step 4: Execute Replay Commands

#### Method 1: Using Queue Service API (Recommended)

Currently, the queue service provides these management operations:

```bash
# Pause queue during maintenance
curl -X POST -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/queue/pause/default"

# Resume queue after fixes
curl -X POST -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/queue/resume/default"

# Clean failed jobs (remove old failures)
curl -X POST -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/queue/clean/default" \
  -H "Content-Type: application/json" \
  -d '{"grace": 86400000, "limit": 100, "status": "failed"}'
```

#### Method 2: Direct Redis Operations

**⚠️ Warning**: Use with extreme caution in production.

```bash
# Move failed jobs back to waiting queue
redis-cli -u "$REDIS_URL" << 'EOF'
-- Get failed job IDs
local failed_jobs = redis.call('lrange', 'bull:default:failed', 0, -1)

for i, job_id in ipairs(failed_jobs) do
  -- Move job back to waiting
  redis.call('lpush', 'bull:default:waiting', job_id)
  redis.call('lrem', 'bull:default:failed', 1, job_id)

  -- Reset job status
  redis.call('hset', 'bull:default:' .. job_id, 'attemptsMade', 0)
  redis.call('hset', 'bull:default:' .. job_id, 'finishedOn', '')
  redis.call('hset', 'bull:default:' .. job_id, 'processedOn', '')
  redis.call('hset', 'bull:default:' .. job_id, 'failedReason', '')
end

return #failed_jobs
EOF
```

#### Method 3: Selective Replay by Job Type

```bash
# Example: Replay only WhatsApp jobs
redis-cli -u "$REDIS_URL" << 'EOF'
local failed_jobs = redis.call('lrange', 'bull:default:failed', 0, -1)
local replayed = 0

for i, job_id in ipairs(failed_jobs) do
  local job_data = redis.call('hget', 'bull:default:' .. job_id, 'data')
  if job_data and string.find(job_data, 'whatsapp.send') then
    redis.call('lpush', 'bull:default:waiting', job_id)
    redis.call('lrem', 'bull:default:failed', 1, job_id)
    redis.call('hset', 'bull:default:' .. job_id, 'attemptsMade', 0)
    replayed = replayed + 1
  end
end

return replayed
EOF
```

### Step 5: Monitor Success Rate

#### Real-time Monitoring

```bash
# Monitor queue metrics every 30 seconds
while true; do
  echo "$(date): Queue Status"
  curl -s -H "X-API-Key: $API_KEY" \
    "$API_BASE_URL/api/v1/queue/metrics" | jq '.'
  sleep 30
done
```

#### Success Rate Calculation

```bash
# Calculate success rate over time
curl -s -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/queue/metrics" | \
  jq -r '.[] | "\(.name): \((.completed/(.completed+.failed)*100)|round)% success"'
```

## Queue Management Commands

### Available Queue Operations

The QueueService provides these management methods:

```typescript
// Available in apps/backend/src/queue/queue.service.ts
async pauseQueue(queueName: string): Promise<void>
async resumeQueue(queueName: string): Promise<void>
async drainQueue(queueName: string): Promise<void>
async cleanQueue(queueName: string, grace: number, limit: number, status: string): Promise<string[]>
async getQueueMetrics(queueName?: string): Promise<QueueMetrics[]>
```

### Queue Management Examples

```bash
# Pause all processing (maintenance mode)
for queue in critical default bulk; do
  curl -X POST -H "X-API-Key: $API_KEY" \
    "$API_BASE_URL/api/v1/queue/pause/$queue"
done

# Resume all queues
for queue in critical default bulk; do
  curl -X POST -H "X-API-Key: $API_KEY" \
    "$API_BASE_URL/api/v1/queue/resume/$queue"
done

# Drain waiting jobs (emergency stop)
curl -X POST -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/queue/drain/default"
```

## Common Failure Scenarios

### 1. Database Connection Timeout

**Symptoms:**

- Jobs failing with "connection timeout" errors
- High number of failed jobs across all queues
- Health check showing database as unhealthy

**Resolution:**

```bash
# Check database health
curl "$API_BASE_URL/health"

# Verify connection pool settings
# Check environment variables:
# - DATABASE_URL
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY

# Restart workers if needed
curl -X POST -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/queue/pause/default"
sleep 10
curl -X POST -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/queue/resume/default"
```

### 2. WhatsApp API Rate Limiting

**Symptoms:**

- WhatsApp jobs failing with 429 errors
- Jobs backing up in critical/default queues
- CGB API returning rate limit responses

**Resolution:**

```bash
# Move WhatsApp jobs to bulk queue (lower priority)
# Check CGB API status
curl -H "Authorization: Bearer $CGB_API_KEY" \
  "$CGB_API_URL/contacts"

# Implement throttling by pausing and resuming
curl -X POST -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/queue/pause/default"
sleep 60  # Wait for rate limit reset
curl -X POST -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/queue/resume/default"
```

### 3. Redis Connection Issues

**Symptoms:**

- All jobs failing to process
- Queue metrics returning errors
- Redis health check failing

**Resolution:**

```bash
# Test Redis connectivity
redis-cli -u "$REDIS_URL" ping

# Check Redis memory usage
redis-cli -u "$REDIS_URL" info memory

# Restart Redis connection (if using connection pooling)
# This requires application restart or connection pool refresh
```

### 4. Memory/Resource Exhaustion

**Symptoms:**

- Jobs failing with out of memory errors
- PDF generation jobs failing
- System performance degradation

**Resolution:**

```bash
# Clean up old completed jobs
curl -X POST -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/queue/clean/default" \
  -H "Content-Type: application/json" \
  -d '{"grace": 3600000, "limit": 1000, "status": "completed"}'

# Monitor system resources
curl "$API_BASE_URL/api/v1/healthz"
```

## Monitoring and Alerting

### Queue Metrics Monitoring

```bash
# Set up continuous monitoring
#!/bin/bash
while true; do
  METRICS=$(curl -s -H "X-API-Key: $API_KEY" \
    "$API_BASE_URL/api/v1/queue/metrics")

  TOTAL_FAILED=$(echo "$METRICS" | jq '[.[].failed] | add')
  TOTAL_WAITING=$(echo "$METRICS" | jq '[.[].waiting] | add')

  # Alert if too many failures
  if [ "$TOTAL_FAILED" -gt 100 ]; then
    echo "ALERT: High failure count: $TOTAL_FAILED"
    # Send alert to Slack or monitoring system
  fi

  # Alert if queue is backing up
  if [ "$TOTAL_WAITING" -gt 1000 ]; then
    echo "ALERT: Queue backlog: $TOTAL_WAITING"
  fi

  sleep 60
done
```

### Prometheus Metrics

The system exposes these metrics for monitoring:

- `queue_depth_total{queue="default", status="failed"}` - Failed job count
- `job_latency_seconds{job="whatsapp.send"}` - Job processing latency
- `job_fail_total{job="pdf.generate"}` - Job failure count
- `http_request_duration_seconds` - API response times

### Grafana Alerts

Configure alerts for:

- Queue depth > 1000 jobs
- Failure rate > 5% over 5 minutes
- Job latency > 30 seconds (p95)
- Redis connection failures

## Escalation Procedures

### Level 1: Operational Issues

**When to escalate:**

- Failed job count > 50 and growing
- Queue processing stopped for > 15 minutes
- Database connection failures

**Actions:**

1. Check system health endpoints
2. Review recent deployments
3. Attempt standard DLQ replay procedures
4. Monitor success rate

### Level 2: System-Wide Failures

**When to escalate:**

- Multiple queue failures across different job types
- Database/Redis infrastructure issues
- External API failures (CGB, Slack)

**Actions:**

1. Pause all queue processing
2. Investigate infrastructure status
3. Contact external service providers
4. Prepare for potential rollback

### Level 3: Critical System Failure

**When to escalate:**

- Complete system outage
- Data corruption suspected
- Security incident

**Actions:**

1. Immediate system isolation
2. Preserve logs and job data
3. Activate incident response team
4. Communicate with stakeholders

## Troubleshooting Common Issues

### Issue: Jobs Stuck in Active State

**Symptoms:**

- Jobs showing as "active" but not processing
- Workers appear to be hanging

**Resolution:**

```bash
# Check active jobs
redis-cli -u "$REDIS_URL" LRANGE bull:default:active 0 -1

# Force job cleanup (use with caution)
curl -X POST -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/queue/clean/default" \
  -H "Content-Type: application/json" \
  -d '{"grace": 300000, "limit": 10, "status": "active"}'
```

### Issue: Duplicate Jobs in Queue

**Symptoms:**

- Same job appearing multiple times
- Duplicate notifications/actions

**Resolution:**

```bash
# Check for duplicate job IDs
redis-cli -u "$REDIS_URL" << 'EOF'
local waiting_jobs = redis.call('lrange', 'bull:default:waiting', 0, -1)
local seen = {}
local duplicates = {}

for i, job_id in ipairs(waiting_jobs) do
  if seen[job_id] then
    table.insert(duplicates, job_id)
  else
    seen[job_id] = true
  end
end

return duplicates
EOF
```

### Issue: Job Data Corruption

**Symptoms:**

- Jobs failing with JSON parse errors
- Invalid job data structure

**Resolution:**

```bash
# Inspect job data structure
redis-cli -u "$REDIS_URL" HGETALL bull:default:job_id

# Clean corrupted jobs
curl -X POST -H "X-API-Key: $API_KEY" \
  "$API_BASE_URL/api/v1/queue/clean/default" \
  -H "Content-Type: application/json" \
  -d '{"grace": 0, "limit": 50, "status": "failed"}'
```

## Configuration Reference

### Queue Configuration

```typescript
// Default job configuration (from queue.service.ts)
const defaultOptions = {
  attempts: 3, // QUEUE_MAX_RETRIES
  backoff: {
    type: 'exponential',
    delay: 5000, // QUEUE_RETRY_DELAY (ms)
  },
  removeOnComplete: true, // Cleanup successful jobs
  removeOnFail: false, // Retain failed jobs for replay
};
```

### Environment Variables

```bash
# Queue configuration
QUEUE_CONCURRENCY=10           # Max concurrent jobs per queue
QUEUE_MAX_RETRIES=3            # Retry attempts before DLQ
QUEUE_RETRY_DELAY=5000         # Base delay between retries (ms)

# Redis configuration
REDIS_URL=rediss://...         # Redis connection string
REDIS_TLS=true                 # Enable TLS for production

# Monitoring
LOG_LEVEL=info                 # Logging level
METRICS_ENABLED=true           # Enable Prometheus metrics
```

## Recovery Verification

### Post-Replay Checklist

1. **Queue Health Check**

   ```bash
   curl -H "X-API-Key: $API_KEY" \
     "$API_BASE_URL/api/v1/queue/metrics"
   ```

2. **System Health Verification**

   ```bash
   curl "$API_BASE_URL/api/v1/healthz"
   curl "$API_BASE_URL/health"
   ```

3. **End-to-End Testing**

   ```bash
   # Test workflow trigger
   curl -X POST -H "X-API-Key: $API_KEY" \
     "$API_BASE_URL/api/v1/triggers/test-workflow" \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

4. **Monitor for 15 minutes**
   - No new failures
   - Jobs processing normally
   - Success rate > 95%

### Success Criteria

- ✅ Failed job count reduced to < 10
- ✅ Queue processing resumed normally
- ✅ No new failures for 15 minutes
- ✅ System health checks passing
- ✅ End-to-end workflows functioning

## Emergency Contacts

### Internal Team

- **DevOps Lead**: emergency-devops@visanet.com
- **Backend Team**: backend-team@visanet.com
- **Operations**: ops@visanet.com

### External Services

- **Render Support**: support@render.com
- **Upstash Support**: support@upstash.com
- **Supabase Support**: support@supabase.com

---

**Document Control:**

- Last Review: July 16, 2025
- Next Review: August 16, 2025
- Version Control: Git-tracked in `/docs/runbooks/`
- Approval: DevOps Team Lead

**Related Documents:**

- System Architecture Overview
- Queue Configuration Guide
- Monitoring and Alerting Setup
- Incident Response Procedures
