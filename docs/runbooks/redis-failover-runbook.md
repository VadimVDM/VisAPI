# Redis Failover Runbook

**Document ID:** S4-DOC-01  
**Version:** 1.0  
**Last Updated:** July 16, 2025  
**Maintainer:** VisAPI Operations Team

## Overview

This runbook provides comprehensive procedures for detecting, responding to, and recovering from Redis failures in the VisAPI system. Redis is a critical component that powers our job queue system (BullMQ), idempotency service, and distributed locking mechanisms.

### Redis Architecture

**Production Setup:**

- **Provider:** Upstash Redis
- **Connection:** TLS-encrypted (rediss://)
- **Persistence:** AOF (Append-Only File) enabled
- **Location:** Cloud-hosted with automatic backups

**Local Development:**

- **Provider:** Docker Compose Redis
- **Connection:** Plain TCP (redis://)
- **Location:** localhost:6379

### Critical Dependencies

Redis failure impacts these system components:

- **BullMQ Job Queues** - All workflow processing stops
- **Idempotency Service** - Webhook duplicate protection fails
- **Distributed Locking** - Concurrent operation safety compromised
- **Health Checks** - System reports unhealthy status
- **Admin Dashboard** - Queue monitoring unavailable

## Prerequisites

### Required Access

- [ ] Upstash Console access (production)
- [ ] Render.com dashboard access (backend deployment)
- [ ] Grafana Cloud access (monitoring)
- [ ] Slack #alerts channel access
- [ ] GitHub repository access (configuration changes)

### Required Tools

```bash
# Install Redis CLI
brew install redis  # macOS
sudo apt-get install redis-tools  # Ubuntu

# Install curl for API testing
curl --version

# Install jq for JSON processing
brew install jq  # macOS
sudo apt-get install jq  # Ubuntu
```

### Environment Variables

Ensure you have access to these production environment variables:

- `REDIS_URL` - Connection string (rediss://...)
- `UPSTASH_TOKEN` - API access token
- `RENDER_API_KEY` - Deployment management

## Redis Failure Detection

### Automated Monitoring

The system provides multiple layers of Redis failure detection:

#### 1. Health Check Endpoint

```bash
# Check overall system health
curl -s https://api.visanet.app/api/v1/health | jq '.'

# Expected healthy response:
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up",
      "message": "Database is accessible and responsive"
    },
    "redis": {
      "status": "up",
      "message": "Redis is accessible and responsive"
    }
  }
}

# Redis failure response:
{
  "status": "error",
  "error": {
    "redis": {
      "status": "down",
      "message": "Redis ping exceeded timeout (1s)"
    }
  }
}
```

#### 2. Grafana Alerts

Monitor these Redis-specific alerts:

- **Redis Connection Failures** - Triggers when ping fails
- **High Redis Latency** - Triggers when ping > 1000ms
- **Queue Depth Accumulation** - Indicates processing stoppage
- **Job Processing Failures** - May indicate Redis issues

#### 3. Application Logs

```bash
# Check Redis connection errors in logs
curl -s "https://api.visanet.app/api/v1/logs?level=error&search=redis" \
  -H "X-API-Key: visapi_your_key_here" | jq '.'

# Common Redis error patterns:
# - "Redis connection failed"
# - "ECONNREFUSED"
# - "Connection timeout"
# - "Redis ping exceeded timeout"
```

### Manual Detection

#### 1. Direct Redis Connection Test

```bash
# Test production Redis (requires REDIS_URL)
redis-cli -u "rediss://your-redis-url" ping
# Expected: PONG

# Test with timeout
timeout 5 redis-cli -u "rediss://your-redis-url" ping
# Expected: PONG within 5 seconds
```

#### 2. Queue Health Check

```bash
# Check queue metrics
curl -s "https://api.visanet.app/api/v1/queue/metrics" \
  -H "X-API-Key: visapi_your_key_here" | jq '.'

# Look for:
# - waiting_jobs > 0 (jobs not processing)
# - failed_jobs increasing
# - active_jobs = 0 (no processing)
```

#### 3. BullMQ Dashboard

Access the queue monitoring dashboard:

- **URL:** https://app.visanet.app/dashboard/queue
- **Look for:** Connection errors, stalled jobs, high queue depth

## Redis Failover Procedures

### Step 1: Confirm Redis Failure

**Time Estimate:** 2-5 minutes

```bash
# 1. Check system health
curl -s https://api.visanet.app/api/v1/health | jq '.error.redis // .info.redis'

# 2. Test direct connection
redis-cli -u "$REDIS_URL" ping

# 3. Check recent logs
curl -s "https://api.visanet.app/api/v1/logs?level=error&limit=50" \
  -H "X-API-Key: visapi_your_key_here" | jq '.data[] | select(.message | contains("redis"))'

# 4. Verify queue processing stopped
curl -s "https://api.visanet.app/api/v1/queue/metrics" \
  -H "X-API-Key: visapi_your_key_here" | jq '.active_jobs'
```

**Confirmation Criteria:**

- [ ] Health check shows Redis down
- [ ] Direct ping fails or times out
- [ ] Error logs show Redis connection issues
- [ ] Queue processing has stopped (active_jobs = 0)

### Step 2: Assess Failure Scope

**Time Estimate:** 1-2 minutes

Determine the type of failure:

#### A. Network/Connectivity Issues

```bash
# Test network connectivity
dig upstash.redis.db.hostname
nslookup upstash.redis.db.hostname
```

#### B. Authentication/Authorization Issues

```bash
# Check for auth errors in logs
curl -s "https://api.visanet.app/api/v1/logs?search=auth&search=redis" \
  -H "X-API-Key: visapi_your_key_here" | jq '.'
```

#### C. Resource Exhaustion

```bash
# Check Upstash Console for:
# - Memory usage
# - Connection limits
# - Rate limiting
```

### Step 3: Upstash-Specific Recovery

**Time Estimate:** 5-10 minutes

#### A. Check Upstash Console

1. **Login to Upstash Console**

   - URL: https://console.upstash.com/
   - Navigate to Redis > Your Database

2. **Check Database Status**

   - Look for: Status indicators, alerts, maintenance notices
   - Review: Metrics, connection count, memory usage

3. **Test Connection from Console**
   - Use built-in Redis CLI
   - Run: `PING` command
   - Expected: `PONG` response

#### B. Restart Redis Instance (if needed)

```bash
# If Upstash supports restart (check console UI)
# Follow provider-specific restart procedures
```

#### C. Scale Resources (if resource exhaustion)

```bash
# Upgrade Redis plan if needed
# - Increase memory limits
# - Increase connection limits
# - Upgrade to higher tier
```

### Step 4: Update Connection Configuration

**Time Estimate:** 3-5 minutes

If using a backup Redis instance:

#### A. Prepare New Connection String

```bash
# Format: rediss://username:password@host:port
# Example: rediss://default:abc123@upstash-redis.com:6379
NEW_REDIS_URL="rediss://default:your-new-password@new-host:6379"
```

#### B. Update Environment Variables

**Via Render Dashboard:**

1. Navigate to https://dashboard.render.com/
2. Select your backend service
3. Go to Environment tab
4. Update `REDIS_URL` variable
5. Save changes (triggers auto-deploy)

**Via Render API:**

```bash
curl -X PATCH "https://api.render.com/v1/services/your-service-id/env-vars" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "REDIS_URL": "rediss://new-connection-string"
  }'
```

### Step 5: Flush Stale Data

**Time Estimate:** 2-3 minutes

When switching Redis instances, clean up stale data:

```bash
# Connect to new Redis instance
redis-cli -u "$NEW_REDIS_URL"

# Clear job queue data (if safe to do so)
FLUSHDB

# Or selectively clear:
# Clear BullMQ data
EVAL "for _,k in ipairs(redis.call('keys','bull:*')) do redis.call('del',k) end" 0

# Clear idempotency data (if safe)
EVAL "for _,k in ipairs(redis.call('keys','idempotent:*')) do redis.call('del',k) end" 0
```

**⚠️ Warning:** Only flush data if:

- [ ] No critical jobs are in progress
- [ ] Idempotency window is acceptable to reset
- [ ] Backup/recovery plan is in place

### Step 6: Deploy Updated Configuration

**Time Estimate:** 3-5 minutes

```bash
# Check deployment status
curl -s "https://api.render.com/v1/services/your-service-id" \
  -H "Authorization: Bearer $RENDER_API_KEY" | jq '.service.status'

# Monitor deployment logs
curl -s "https://api.render.com/v1/services/your-service-id/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY" | jq '.deploys[0]'

# Wait for deployment completion
# Status should change from "build_in_progress" to "live"
```

### Step 7: Verify System Recovery

**Time Estimate:** 5-10 minutes

#### A. Health Check Verification

```bash
# Wait for deployment completion, then test
sleep 60

# Check system health
curl -s https://api.visanet.app/api/v1/health | jq '.'

# Verify Redis is up
curl -s https://api.visanet.app/api/v1/health | jq '.info.redis.status'
# Expected: "up"
```

#### B. Queue System Recovery

```bash
# Check queue metrics
curl -s "https://api.visanet.app/api/v1/queue/metrics" \
  -H "X-API-Key: visapi_your_key_here" | jq '.'

# Look for:
# - connection_status: "connected"
# - processing resuming (active_jobs > 0)
# - waiting_jobs decreasing
```

#### C. Functional Testing

```bash
# Test webhook trigger (creates job)
curl -X POST "https://api.visanet.app/api/v1/triggers/test" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: visapi_your_key_here" \
  -d '{
    "test": "redis-recovery-test",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# Check job processing
sleep 10
curl -s "https://api.visanet.app/api/v1/queue/metrics" \
  -H "X-API-Key: visapi_your_key_here" | jq '.completed_jobs'
```

#### D. Admin Dashboard Check

1. **Navigate to:** https://app.visanet.app/dashboard/queue
2. **Verify:** Queue dashboard loads without errors
3. **Check:** Job processing statistics are updating
4. **Confirm:** No connection errors displayed

## Monitoring and Detection

### Real-time Monitoring

#### 1. Grafana Dashboard

**URL:** https://your-grafana-instance.com/d/visapi-overview

**Key Metrics:**

- `redis_connection_status` - Connection health
- `redis_response_time` - Latency monitoring
- `bullmq_queue_depth` - Job accumulation
- `bullmq_failed_jobs` - Processing failures

#### 2. Automated Alerts

**Slack Channel:** #alerts

**Alert Conditions:**

- Redis ping fails for > 30 seconds
- Redis latency > 1000ms for > 2 minutes
- Queue depth > 1000 jobs
- Failed jobs > 50 in 5 minutes

#### 3. Log Monitoring

```bash
# Set up log monitoring for Redis errors
curl -s "https://api.visanet.app/api/v1/logs?level=error&search=redis&follow=true" \
  -H "X-API-Key: visapi_your_key_here"

# Key error patterns to watch:
# - "Redis connection failed"
# - "ECONNREFUSED"
# - "Connection timeout"
# - "Redis ping exceeded timeout"
```

### Proactive Monitoring

#### 1. Redis Health Check Script

```bash
#!/bin/bash
# redis-health-check.sh

REDIS_URL="$1"
THRESHOLD=1000  # 1 second threshold

if [ -z "$REDIS_URL" ]; then
    echo "Usage: $0 <redis-url>"
    exit 1
fi

start_time=$(date +%s%3N)
result=$(redis-cli -u "$REDIS_URL" ping 2>&1)
end_time=$(date +%s%3N)

duration=$((end_time - start_time))

if [ "$result" = "PONG" ] && [ $duration -lt $THRESHOLD ]; then
    echo "✅ Redis healthy - ${duration}ms"
    exit 0
else
    echo "❌ Redis unhealthy - ${duration}ms - $result"
    exit 1
fi
```

#### 2. Automated Recovery Script

```bash
#!/bin/bash
# redis-auto-recovery.sh

HEALTH_ENDPOINT="https://api.visanet.app/api/v1/health"
SLACK_WEBHOOK="$SLACK_WEBHOOK_URL"

# Check Redis health
health_check() {
    curl -s "$HEALTH_ENDPOINT" | jq -r '.info.redis.status // .error.redis.status'
}

# Send Slack notification
notify_slack() {
    local message="$1"
    curl -X POST "$SLACK_WEBHOOK" -d "{\"text\": \"$message\"}"
}

# Main recovery logic
main() {
    status=$(health_check)

    if [ "$status" != "up" ]; then
        notify_slack "🚨 Redis failure detected - Status: $status"

        # Trigger manual intervention
        notify_slack "📋 Follow Redis Failover Runbook: https://github.com/your-org/visapi/blob/main/docs/runbooks/redis-failover-runbook.md"

        # Log the incident
        echo "$(date): Redis failure detected - $status" >> /var/log/redis-incidents.log
    fi
}

main
```

## Production vs Local Development

### Production Environment

**Configuration:**

- **Provider:** Upstash Redis Cloud
- **Connection:** TLS-encrypted (rediss://)
- **Persistence:** AOF enabled with backups
- **Monitoring:** Grafana + Slack alerts
- **Failover:** Manual with this runbook

**Connection String Format:**

```bash
REDIS_URL="rediss://default:password@host:6379"
```

**Health Check:**

```bash
curl https://api.visanet.app/api/v1/health
```

### Local Development

**Configuration:**

- **Provider:** Docker Compose Redis
- **Connection:** Plain TCP (redis://)
- **Persistence:** None (data loss on restart)
- **Monitoring:** Docker logs
- **Failover:** `docker-compose restart redis`

**Connection String Format:**

```bash
REDIS_URL="redis://localhost:6379"
```

**Health Check:**

```bash
curl http://localhost:3000/api/v1/health
```

**Local Recovery:**

```bash
# Quick local Redis restart
docker-compose restart redis

# Or full reset
docker-compose down
docker-compose up -d
```

## Rollback Procedures

### Scenario: New Redis Instance Failing

**Time Estimate:** 3-5 minutes

If the new Redis instance is causing issues:

#### 1. Identify Original Connection

```bash
# Check git history for previous REDIS_URL
git log --grep="redis" --oneline -10

# Or check backup configuration
```

#### 2. Revert Environment Variable

```bash
# Via Render Dashboard
# 1. Navigate to Environment tab
# 2. Update REDIS_URL to previous value
# 3. Save and deploy

# Via Render API
curl -X PATCH "https://api.render.com/v1/services/your-service-id/env-vars" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "REDIS_URL": "rediss://original-connection-string"
  }'
```

#### 3. Verify Rollback

```bash
# Wait for deployment
sleep 60

# Check health
curl -s https://api.visanet.app/api/v1/health | jq '.info.redis'

# Verify queue processing
curl -s "https://api.visanet.app/api/v1/queue/metrics" \
  -H "X-API-Key: visapi_your_key_here" | jq '.active_jobs'
```

### Scenario: Configuration Corruption

**Time Estimate:** 5-10 minutes

If environment variables are corrupted:

#### 1. Reset to Known Good Configuration

```bash
# Deploy from git with known good config
git checkout main
git pull origin main

# Check .env.example for reference values
cat .env.example | grep REDIS_URL
```

#### 2. Manual Environment Reset

```bash
# Reset all Redis-related variables
REDIS_URL="rediss://your-working-connection"

# Update via Render
curl -X PATCH "https://api.render.com/v1/services/your-service-id/env-vars" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "REDIS_URL": "'$REDIS_URL'"
  }'
```

## Common Redis Failure Scenarios

### 1. Connection Timeout

**Symptoms:**

- Health check shows "Redis ping exceeded timeout (1s)"
- Queue jobs accumulating
- Slow application response

**Causes:**

- Network latency to Upstash
- Redis instance overloaded
- Connection pool exhaustion

**Resolution:**

```bash
# 1. Check network connectivity
ping your-upstash-host.com

# 2. Test with increased timeout
redis-cli -u "$REDIS_URL" --latency-history

# 3. Check connection pool settings
# Review BullMQ configuration in queue.module.ts

# 4. Scale Redis resources if needed
# Upgrade Upstash plan or optimize usage
```

### 2. Memory Exhaustion

**Symptoms:**

- Redis operations failing
- "OOM" errors in logs
- Slow Redis responses

**Causes:**

- Large job payloads
- Memory leaks in job data
- Insufficient Redis memory

**Resolution:**

```bash
# 1. Check memory usage
redis-cli -u "$REDIS_URL" info memory

# 2. Clear non-essential data
redis-cli -u "$REDIS_URL" eval "
  for _,k in ipairs(redis.call('keys','temp:*')) do
    redis.call('del',k)
  end
" 0

# 3. Optimize job payloads
# Review job data size in application code

# 4. Upgrade Redis plan
# Increase memory limits in Upstash console
```

### 3. Authentication Failures

**Symptoms:**

- "NOAUTH" or "AUTH failed" errors
- Sudden connection drops
- Intermittent failures

**Causes:**

- Password rotation
- Incorrect credentials
- TLS certificate issues

**Resolution:**

```bash
# 1. Verify credentials
redis-cli -u "$REDIS_URL" auth your-password

# 2. Check TLS connection
redis-cli -u "$REDIS_URL" --tls ping

# 3. Update credentials
# Get new password from Upstash console
# Update REDIS_URL environment variable

# 4. Test new connection
redis-cli -u "$NEW_REDIS_URL" ping
```

### 4. Queue Processing Stalled

**Symptoms:**

- Jobs stuck in "waiting" state
- No job processing activity
- Queue depth increasing

**Causes:**

- Redis connection lost during processing
- BullMQ worker crashes
- Deadlock in job processing

**Resolution:**

```bash
# 1. Check queue status
curl -s "https://api.visanet.app/api/v1/queue/metrics" \
  -H "X-API-Key: visapi_your_key_here" | jq '.'

# 2. Clear stalled jobs
redis-cli -u "$REDIS_URL" eval "
  for _,k in ipairs(redis.call('keys','bull:*:stalled')) do
    redis.call('del',k)
  end
" 0

# 3. Restart workers
# Redeploy backend service to restart BullMQ workers

# 4. Monitor recovery
# Check active_jobs and completed_jobs metrics
```

### 5. Idempotency Service Failures

**Symptoms:**

- Duplicate webhook processing
- "Idempotent operation failed" errors
- Distributed lock failures

**Causes:**

- Redis connection interruption
- Lock timeout issues
- Stale lock data

**Resolution:**

```bash
# 1. Check idempotency keys
redis-cli -u "$REDIS_URL" keys "idempotent:*"

# 2. Clear stale locks (carefully)
redis-cli -u "$REDIS_URL" eval "
  for _,k in ipairs(redis.call('keys','idempotent:*:lock')) do
    local ttl = redis.call('ttl',k)
    if ttl > 300 then  -- Older than 5 minutes
      redis.call('del',k)
    end
  end
" 0

# 3. Test idempotency
# Send duplicate webhook to test duplicate detection

# 4. Monitor for lock contention
# Check logs for lock acquisition failures
```

## Health Check Verification

### System Health Endpoints

#### 1. Primary Health Check

```bash
# Full system health
curl -s https://api.visanet.app/api/v1/health | jq '.'

# Expected healthy response:
{
  "status": "ok",
  "info": {
    "database": {"status": "up"},
    "redis": {"status": "up"}
  },
  "details": {
    "database": {"message": "Database is accessible and responsive"},
    "redis": {"message": "Redis is accessible and responsive"}
  }
}
```

#### 2. Liveness Probe

```bash
# Basic liveness check
curl -s https://api.visanet.app/api/v1/health/liveness

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-07-16T10:30:00.000Z"
}
```

#### 3. Redis-Specific Health

```bash
# Test Redis connectivity directly
redis-cli -u "$REDIS_URL" ping
# Expected: PONG

# Check Redis info
redis-cli -u "$REDIS_URL" info server | grep redis_version
# Expected: redis_version:6.2.x
```

### Queue Health Verification

#### 1. Queue Metrics

```bash
# Check queue health
curl -s "https://api.visanet.app/api/v1/queue/metrics" \
  -H "X-API-Key: visapi_your_key_here" | jq '.'

# Expected healthy response:
{
  "connection_status": "connected",
  "total_jobs": 1250,
  "active_jobs": 3,
  "waiting_jobs": 15,
  "completed_jobs": 1200,
  "failed_jobs": 2,
  "queues": {
    "critical": {"waiting": 0, "active": 1},
    "default": {"waiting": 10, "active": 2},
    "bulk": {"waiting": 5, "active": 0}
  }
}
```

#### 2. Job Processing Test

```bash
# Submit test job
curl -X POST "https://api.visanet.app/api/v1/triggers/health-check" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: visapi_your_key_here" \
  -d '{
    "test_id": "health-check-'$(date +%s)'",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# Wait and check processing
sleep 5
curl -s "https://api.visanet.app/api/v1/queue/metrics" \
  -H "X-API-Key: visapi_your_key_here" | jq '.completed_jobs'
```

### Recovery Verification Checklist

After Redis failover completion:

- [ ] **Health Check**: `/api/v1/health` shows Redis as "up"
- [ ] **Queue Connection**: Queue metrics show "connected" status
- [ ] **Job Processing**: New jobs are being processed (active_jobs > 0)
- [ ] **Queue Depth**: Waiting jobs are decreasing over time
- [ ] **Error Logs**: No new Redis connection errors
- [ ] **Admin Dashboard**: Queue dashboard loads without errors
- [ ] **Idempotency**: Duplicate webhook detection working
- [ ] **Monitoring**: Grafana shows healthy Redis metrics
- [ ] **Alerts**: No active Redis alerts in Slack

### Performance Verification

```bash
# Check Redis latency
redis-cli -u "$REDIS_URL" --latency-history

# Expected: < 100ms average latency

# Test job processing speed
start_time=$(date +%s)
curl -X POST "https://api.visanet.app/api/v1/triggers/perf-test" \
  -H "X-API-Key: visapi_your_key_here" \
  -d '{"test": "performance"}'

sleep 2
end_time=$(date +%s)
processing_time=$((end_time - start_time))

echo "Job processing time: ${processing_time}s"
# Expected: < 5s for simple jobs
```

## Emergency Contacts

### Escalation Chain

1. **On-Call Engineer** - Slack @oncall
2. **DevOps Team** - Slack #devops
3. **CTO** - emergency-contact@visanet.app
4. **External Support** - Upstash support if provider issue

### Communication Channels

- **Incident Response**: #incident-response
- **Status Updates**: #status-updates
- **External Communication**: status.visanet.app

### External Support

#### Upstash Support

- **Console**: https://console.upstash.com/support
- **Documentation**: https://docs.upstash.com/redis
- **Status Page**: https://status.upstash.com/

#### Render Support

- **Dashboard**: https://dashboard.render.com/support
- **Documentation**: https://render.com/docs
- **Status Page**: https://status.render.com/

## Runbook Maintenance

### Regular Review Schedule

- **Monthly**: Review and test procedures
- **Quarterly**: Update contact information
- **Semi-annually**: Full runbook validation
- **After incidents**: Update based on lessons learned

### Version Control

- **Repository**: https://github.com/your-org/visapi
- **File**: `/docs/runbooks/redis-failover-runbook.md`
- **Reviews**: Required for all changes
- **Approvals**: DevOps team lead

### Testing

```bash
# Monthly runbook test (non-production)
# 1. Set up test Redis instance
# 2. Follow failover procedures
# 3. Verify recovery steps
# 4. Document any issues or improvements
```

---

**Document History:**

- v1.0 - Initial creation (July 16, 2025)

**Next Review Date:** August 16, 2025

**Related Documents:**

- [DLQ Replay Runbook](./dlq-replay-runbook.md)
- [Environment Variables Guide](../environment-variables.md)
- [Database Schema Guide](../database-schema.md)
