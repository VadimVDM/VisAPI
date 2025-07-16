# Game Day Runbook: Redis Failover Scenario

## Scenario Overview

**Name**: Redis Connection Failure / Failover Event  
**Type**: External Service Failure  
**Severity**: P0 - Critical  
**Expected Duration**: 5-15 minutes  
**Recovery Time Objective (RTO)**: 10 minutes  

## Scenario Description

This scenario simulates a complete Redis (Upstash) connection failure or forced failover event. The system should gracefully handle the loss of the queue system, prevent data loss, and automatically recover when Redis becomes available again.

## Pre-requisites

- [ ] Access to Upstash Redis dashboard
- [ ] Access to production monitoring dashboards (Grafana)
- [ ] Chaos engineering toolkit installed and verified
- [ ] Notification channels configured (Slack)
- [ ] At least 2 team members present

## Scenario Execution Steps

### 1. Pre-Failure Verification (T-5 minutes)

```bash
# Verify current system health
curl https://api.visanet.app/api/v1/healthz

# Check queue metrics
curl https://api.visanet.app/api/v1/queue/metrics \
  -H "X-API-Key: $API_KEY"

# Note current queue depth and processing rate
echo "Queue Depth: $(curl -s https://api.visanet.app/api/v1/queue/metrics | jq '.depth')"
echo "Processing Rate: $(curl -s https://api.visanet.app/api/v1/queue/metrics | jq '.processingRate')"
```

### 2. Initiate Failure (T+0 minutes)

```bash
# Option A: Network partition simulation (recommended)
cd chaos-engineering/
./experiments/network-partition.sh api.visanet.app upstash-redis

# Option B: Block Redis connection at Upstash level
# - Go to Upstash dashboard
# - Navigate to Security settings
# - Temporarily remove production IP from allowlist

# Option C: Simulate with chaos toolkit
./chaos-runner.sh external-service-failure redis high
```

### 3. Monitor Impact (T+1 minute)

**Expected Behavior:**
- Health endpoint reports Redis unhealthy
- New webhook requests receive 503 Service Unavailable
- Existing jobs continue processing from memory
- Alerts fire in Slack within 60 seconds

**Monitoring Commands:**
```bash
# Watch health endpoint
watch -n 5 'curl -s https://api.visanet.app/api/v1/healthz | jq'

# Monitor error logs
curl https://api.visanet.app/api/v1/logs?level=error&service=queue

# Check Grafana dashboard
echo "Dashboard: https://grafana.com/d/ee4deafb-60c7-4cb1-a2d9-aa14f7ef334e"
```

### 4. Verify Resilience Features (T+2 minutes)

- [ ] Circuit breaker activated (prevents cascading failures)
- [ ] Jobs queued in memory buffer (up to 1000 jobs)
- [ ] Webhook endpoints return appropriate error codes
- [ ] No data loss for in-flight operations
- [ ] Monitoring alerts triggered

### 5. Recovery Process (T+5 minutes)

```bash
# Option A: Restore network connectivity
./experiments/network-partition.sh --restore

# Option B: Re-enable Upstash access
# - Return to Upstash dashboard
# - Add production IP back to allowlist

# Option C: Stop chaos experiment
./chaos-runner.sh --stop
```

### 6. Post-Recovery Validation (T+7 minutes)

```bash
# Verify Redis connectivity restored
curl https://api.visanet.app/api/v1/healthz | jq '.redis'

# Check queue recovery
curl https://api.visanet.app/api/v1/queue/metrics \
  -H "X-API-Key: $API_KEY" | jq

# Verify job processing resumed
watch -n 5 'curl -s https://api.visanet.app/api/v1/queue/metrics | jq ".processingRate"'

# Check for any failed jobs in DLQ
curl https://api.visanet.app/api/v1/queue/dlq \
  -H "X-API-Key: $API_KEY"
```

## Success Criteria

- [ ] System detects Redis failure within 30 seconds
- [ ] Health endpoint accurately reports Redis status
- [ ] No permanent data loss during outage
- [ ] Automatic recovery when Redis returns
- [ ] Memory buffer prevents job loss (up to limit)
- [ ] Alerts fired and received in Slack
- [ ] Recovery completed within RTO (10 minutes)

## Failure Modes & Mitigations

### Scenario: Memory buffer overflow
**Mitigation**: Implement webhook request throttling
```bash
# Check memory usage during failure
curl https://api.visanet.app/api/metrics | grep memory_usage
```

### Scenario: Redis doesn't auto-recover
**Mitigation**: Manual Redis restart procedure
```bash
# Follow Redis failover runbook
# See: docs/runbooks/redis-failover-runbook.md
```

### Scenario: Jobs stuck after recovery
**Mitigation**: Force queue restart
```bash
# Restart worker processes
# Via Render dashboard or API
```

## Rollback Procedure

If the system doesn't recover automatically:

1. **Immediate Actions**:
   ```bash
   # Scale down workers to 0
   render scale worker --count=0
   
   # Clear any corrupted state
   # (Commands specific to your Redis setup)
   
   # Scale workers back up
   render scale worker --count=3
   ```

2. **Data Recovery**:
   - Check application logs for queued job data
   - Manually requeue critical jobs if needed
   - Run DLQ replay procedure if jobs were lost

## Key Metrics to Track

- **Redis Connection Latency**: Should return to <5ms
- **Queue Depth**: Should match pre-failure levels ±10%
- **Job Processing Rate**: Should resume at normal rate
- **Error Rate**: Should drop to 0% post-recovery
- **Memory Usage**: Should return to baseline

## Lessons Learned Template

After completing the scenario, document:

1. **What Went Well**:
   - 
   
2. **What Could Be Improved**:
   - 

3. **Action Items**:
   - [ ] Item 1 (Owner, Due Date)
   - [ ] Item 2 (Owner, Due Date)

4. **Metrics Collected**:
   - Time to detect: _____ seconds
   - Time to alert: _____ seconds
   - Time to recover: _____ minutes
   - Jobs lost: _____
   - Peak memory usage: _____ MB

## Related Documentation

- [Redis Failover Operational Runbook](../runbooks/redis-failover-runbook.md)
- [Queue Monitoring Guide](../monitoring/queue-metrics.md)
- [Chaos Engineering Toolkit](../../chaos-engineering/README.md)
- [Incident Response Playbook](../runbooks/incident-response.md)

## Contact Information

- **On-Call Engineer**: Check PagerDuty
- **Redis Team**: #redis-support (Slack)
- **Platform Team**: #platform-oncall (Slack)
- **Escalation**: Engineering Manager