# Game Day Runbook: Worker Process Failure Scenario

## Scenario Overview

**Name**: BullMQ Worker Process Crash / Memory Exhaustion  
**Type**: Service Component Failure  
**Severity**: P1 - High  
**Expected Duration**: 10-20 minutes  
**Recovery Time Objective (RTO)**: 15 minutes  

## Scenario Description

This scenario simulates worker process failures including crashes, memory exhaustion, and unresponsive workers. The system should detect failed workers, redistribute work, and maintain processing capability with degraded capacity.

## Pre-requisites

- [ ] Access to Render dashboard and CLI
- [ ] Access to monitoring dashboards (Grafana, Bull-Board)
- [ ] Chaos engineering toolkit installed
- [ ] Load testing tools ready (k6)
- [ ] Team communication channel open

## Scenario Execution Steps

### 1. Pre-Failure Baseline (T-5 minutes)

```bash
# Record current worker status
render ps --service worker

# Check current processing metrics
curl https://api.visanet.app/api/v1/queue/metrics \
  -H "X-API-Key: $API_KEY" | jq '{
    active_workers: .workers.active,
    jobs_per_minute: .processingRate,
    queue_depth: .depth
  }'

# Note memory usage per worker
curl https://api.visanet.app/api/metrics | grep worker_memory

# Generate baseline load
cd load-tests/
k6 run scenarios/baseline-load.js --duration=2m
```

### 2. Initiate Worker Failures (T+0 minutes)

Choose one or more failure modes:

#### Option A: Memory Exhaustion
```bash
# Trigger memory leak in specific worker
cd chaos-engineering/
./experiments/resource-exhaustion.sh worker memory high

# Alternative: Send memory-intensive jobs
curl -X POST https://api.visanet.app/api/v1/test/memory-bomb \
  -H "X-API-Key: $ADMIN_KEY" \
  -d '{"size": "2GB", "workers": 1}'
```

#### Option B: Process Crash
```bash
# Force worker crash
./experiments/service-failure.sh worker crash

# Alternative via Render CLI
render exec worker --command "kill -9 $(pgrep -f 'worker')"
```

#### Option C: CPU Starvation
```bash
# Consume all CPU on worker
./experiments/resource-exhaustion.sh worker cpu high
```

### 3. Monitor System Response (T+2 minutes)

**Expected Behavior:**
- Failed worker detected within 60 seconds
- Jobs redistributed to healthy workers
- Auto-scaling triggers (if configured)
- Processing continues at reduced capacity
- Alerts fire for worker health

**Monitoring Commands:**
```bash
# Watch worker status
watch -n 5 'render ps --service worker | grep -E "(running|failed)"'

# Monitor job redistribution
curl https://api.visanet.app/api/v1/queue/workers \
  -H "X-API-Key: $API_KEY" | jq

# Check for stalled jobs
curl https://api.visanet.app/api/v1/queue/stalled \
  -H "X-API-Key: $API_KEY"

# View Bull-Board dashboard
echo "Bull-Board: https://api.visanet.app/admin/queue"
```

### 4. Load Testing During Failure (T+5 minutes)

```bash
# Run load test with degraded workers
k6 run scenarios/stress-test.js \
  --vus 50 \
  --duration 5m \
  --env EXPECT_DEGRADED=true

# Monitor performance degradation
watch -n 5 'k6 stats | grep -E "(http_req_duration|http_req_failed)"'
```

### 5. Recovery Actions (T+10 minutes)

#### Automatic Recovery
```bash
# Verify auto-healing
render ps --service worker
# Should show new workers spinning up
```

#### Manual Recovery if Needed
```bash
# Scale workers manually
render scale worker --count=5

# Restart all workers
render restart worker

# Clear stalled jobs
curl -X POST https://api.visanet.app/api/v1/queue/maintenance/clear-stalled \
  -H "X-API-Key: $ADMIN_KEY"
```

### 6. Post-Recovery Validation (T+15 minutes)

```bash
# Verify all workers healthy
render ps --service worker | grep running | wc -l

# Check processing resumed
curl https://api.visanet.app/api/v1/queue/metrics \
  -H "X-API-Key: $API_KEY" | jq '.processingRate'

# Ensure no jobs lost
curl https://api.visanet.app/api/v1/queue/stats \
  -H "X-API-Key: $API_KEY" | jq '{
    completed: .completed,
    failed: .failed,
    stalled: .stalled
  }'

# Run integrity check
./scripts/queue-integrity-check.sh
```

## Success Criteria

- [ ] Failed workers detected within 60 seconds
- [ ] Jobs automatically redistributed
- [ ] No jobs permanently lost
- [ ] Processing continues (even if slower)
- [ ] Auto-scaling activates (if configured)
- [ ] System recovers within RTO
- [ ] Monitoring alerts triggered appropriately

## Performance Targets During Failure

| Metric | Normal | During Failure | Acceptable Degradation |
|--------|--------|----------------|----------------------|
| Workers | 3-5 | 1-2 | 60% reduction |
| Jobs/min | 1000 | 400 | 60% reduction |
| Latency P95 | 200ms | 500ms | 2.5x increase |
| Error Rate | <0.1% | <5% | 50x increase |

## Failure Modes & Mitigations

### Scenario: Cascading worker failures
**Detection**: Multiple workers failing in sequence
**Mitigation**: 
```bash
# Implement circuit breaker
curl -X POST https://api.visanet.app/api/v1/queue/circuit-breaker/activate \
  -H "X-API-Key: $ADMIN_KEY"

# Reduce worker concurrency
render env --service worker WORKER_CONCURRENCY=5
```

### Scenario: Memory leak propagation
**Detection**: All workers showing increasing memory
**Mitigation**:
```bash
# Rolling restart of workers
for i in {1..5}; do
  render restart worker --instance=$i
  sleep 30
done
```

### Scenario: Stalled job accumulation
**Detection**: Stalled count > 100
**Mitigation**:
```bash
# Force unlock stalled jobs
node scripts/force-unlock-jobs.js --stalled --force
```

## Recovery Procedures

### 1. Immediate Response (0-5 minutes)
- Acknowledge alerts
- Identify failed workers
- Verify job redistribution
- Monitor customer impact

### 2. Stabilization (5-10 minutes)
- Scale up healthy workers
- Clear any stalled jobs
- Apply temporary rate limits if needed
- Communicate status to stakeholders

### 3. Full Recovery (10-15 minutes)
- Restore original worker count
- Verify all queues processing
- Remove any temporary limits
- Document timeline and impact

## Monitoring & Metrics

### Real-time Dashboards
- [Grafana Queue Dashboard](https://grafana.com/d/queue-health)
- [Bull-Board UI](https://api.visanet.app/admin/queue)
- [Worker Health Matrix](https://grafana.com/d/worker-status)

### Key Metrics to Track
```bash
# Worker health score
curl https://api.visanet.app/api/metrics | grep worker_health_score

# Job completion rate
curl https://api.visanet.app/api/metrics | grep job_completion_rate  

# Queue backlog growth
curl https://api.visanet.app/api/metrics | grep queue_backlog_minutes
```

## Test Variations

### Variant 1: Single Worker Failure
- Impact: Minimal, tests redundancy
- Duration: 5 minutes
- Expected outcome: Seamless failover

### Variant 2: 50% Worker Failure
- Impact: Moderate, tests degraded mode
- Duration: 10 minutes
- Expected outcome: Continued operation at reduced capacity

### Variant 3: Complete Worker Failure
- Impact: Severe, tests recovery procedures
- Duration: 15 minutes
- Expected outcome: Full recovery with manual intervention

## Post-Incident Analysis

Document the following after each test:

1. **Timeline**:
   - T+0: Failure initiated
   - T+X: First detection
   - T+X: Automatic response
   - T+X: Manual intervention (if any)
   - T+X: Full recovery

2. **Impact Metrics**:
   - Jobs delayed: _____
   - Jobs failed: _____
   - Peak latency: _____ ms
   - Total downtime: _____ minutes

3. **Improvement Areas**:
   - Detection time
   - Auto-recovery effectiveness
   - Manual procedure clarity
   - Communication effectiveness

## Related Documentation

- [Worker Scaling Policies](../operations/worker-scaling.md)
- [Queue Architecture](../architecture/queue-design.md)
- [BullMQ Best Practices](../development/bullmq-patterns.md)
- [Incident Response Playbook](../runbooks/incident-response.md)

## Emergency Contacts

- **Platform On-Call**: PagerDuty
- **Worker Team Lead**: #worker-team (Slack)
- **Infrastructure**: #infra-support (Slack)
- **Customer Success**: For user impact assessment