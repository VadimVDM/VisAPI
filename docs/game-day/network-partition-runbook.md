# Game Day Runbook: Network Partition Scenario

## Scenario Overview

**Name**: Network Partition / Split-Brain Scenario  
**Type**: Infrastructure Failure  
**Severity**: P0 - Critical  
**Expected Duration**: 10-20 minutes  
**Recovery Time Objective (RTO)**: 15 minutes  

## Scenario Description

This scenario simulates network partitions between different components of the VisAPI system, including frontend-to-backend, backend-to-database, and worker-to-queue partitions. Tests the system's ability to handle split-brain scenarios and maintain data consistency.

## Pre-requisites

- [ ] Network control tools installed (tc, iptables)
- [ ] Access to all service providers (Vercel, Render, Supabase, Upstash)
- [ ] Multiple monitoring points configured
- [ ] Data consistency verification scripts ready
- [ ] Communication channels established

## Network Topology

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Vercel    │ ──(1)─→ │    Render    │ ──(3)─→ │   Upstash    │
│  Frontend   │         │   Gateway    │         │    Redis     │
└─────────────┘         └──────┬───────┘         └──────────────┘
                               │ (2)                      
                               ↓                          
                        ┌──────────────┐         ┌──────────────┐
                        │   Supabase   │ ←─(4)── │    Render    │
                        │   Database   │         │    Worker    │
                        └──────────────┘         └──────────────┘

Partition Points:
(1) Frontend ↔ Backend
(2) Backend ↔ Database  
(3) Backend ↔ Queue
(4) Worker ↔ Database
```

## Scenario Execution Steps

### 1. Pre-Partition Validation (T-5 minutes)

```bash
# Establish baseline connectivity
./scripts/network-connectivity-test.sh all

# Record current state
curl https://api.visanet.app/api/v1/system/snapshot \
  -H "X-API-Key: $API_KEY" > pre-partition-state.json

# Start continuous monitoring
./monitors/network-partition-monitor.sh start

# Create marker transactions
for i in {1..5}; do
  curl -X POST https://api.visanet.app/api/v1/test/marker \
    -H "X-API-Key: $API_KEY" \
    -d "{\"id\": \"pre-partition-$i\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
done
```

### 2. Initiate Network Partitions (T+0 minutes)

Choose partition scenario:

#### Scenario A: Frontend-Backend Partition
```bash
# Simulate Vercel to Render connectivity loss
cd chaos-engineering/
./experiments/network-partition.sh vercel-render bidirectional

# Alternative: DNS failure simulation
./experiments/dns-failure.sh api.visanet.app --from vercel
```

#### Scenario B: Backend-Database Partition
```bash
# Partition Render from Supabase
./experiments/network-partition.sh render-supabase bidirectional

# Monitor connection pool behavior
watch -n 2 'curl -s https://api.visanet.app/api/metrics | grep -E "(db_pool|db_connection)"'
```

#### Scenario C: Queue Split-Brain
```bash
# Partition between gateway and workers
./experiments/network-partition.sh gateway-redis unidirectional
./experiments/network-partition.sh worker-redis unidirectional

# This creates split-brain where gateway and workers see different queue states
```

#### Scenario D: Complete Region Partition
```bash
# Simulate full region failure
./experiments/region-partition.sh us-east-1 isolate
```

### 3. Monitor Partition Impact (T+2 minutes)

**Expected Behaviors by Partition Type:**

**Frontend-Backend Partition:**
- Frontend shows connection errors
- Cached data served where available
- Login/auth flows fail
- Read operations may succeed with stale data

**Backend-Database Partition:**
- API returns 503 for write operations
- Read operations from connection pool/cache
- Health checks report database unhealthy
- Write operations queued (if implemented)

**Queue Split-Brain:**
- Gateway and workers process different jobs
- Potential for duplicate processing
- Job state inconsistencies
- DLQ may receive false positives

**Monitoring Commands:**
```bash
# Check partition detection
curl https://api.visanet.app/api/v1/network/partition-status \
  -H "X-API-Key: $API_KEY" | jq

# Monitor split-brain detection
watch -n 5 'curl -s https://api.visanet.app/api/v1/consensus/status | jq'

# Check data consistency
./scripts/consistency-check.sh --continuous

# View error rates by component
curl https://api.visanet.app/api/metrics | grep -E "error_rate{component="
```

### 4. Test Data Consistency (T+5 minutes)

```bash
# Attempt writes during partition
for i in {1..10}; do
  curl -X POST https://api.visanet.app/api/v1/test/write \
    -H "X-API-Key: $API_KEY" \
    -d "{\"id\": \"partition-test-$i\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
    -w "\nStatus: %{http_code}\n"
done

# Check for split-brain writes
curl https://api.visanet.app/api/v1/test/consistency-report \
  -H "X-API-Key: $API_KEY" \
  -d '{"check_type": "split_brain", "time_range": "5m"}'

# Verify queue consistency
./scripts/queue-consistency-check.sh --detect-duplicates
```

### 5. Recovery Procedures (T+10 minutes)

#### Heal Network Partition
```bash
# Restore network connectivity
./experiments/network-partition.sh --restore-all

# Verify connectivity restored
./scripts/network-connectivity-test.sh all --verify
```

#### Resolve Split-Brain
```bash
# 1. Identify split-brain victims
curl https://api.visanet.app/api/v1/consistency/split-brain-detect \
  -H "X-API-Key: $API_KEY"

# 2. Merge queue states (if split-brain in queue)
curl -X POST https://api.visanet.app/api/v1/queue/merge-split-brain \
  -H "X-API-Key: $API_KEY" \
  -d '{"strategy": "timestamp_based", "dry_run": false}'

# 3. Reconcile database inconsistencies
curl -X POST https://api.visanet.app/api/v1/database/reconcile \
  -H "X-API-Key: $API_KEY" \
  -d '{"strategy": "last_write_wins", "audit": true}'
```

### 6. Post-Recovery Validation (T+15 minutes)

```bash
# Verify all components connected
curl https://api.visanet.app/api/v1/system/connectivity-matrix \
  -H "X-API-Key: $API_KEY" | jq

# Check for data inconsistencies
./scripts/data-integrity-check.sh --full

# Validate marker transactions
for i in {1..5}; do
  curl https://api.visanet.app/api/v1/test/marker/pre-partition-$i \
    -H "X-API-Key: $API_KEY"
done

# Generate consistency report
curl -X POST https://api.visanet.app/api/v1/reports/partition-recovery \
  -H "X-API-Key: $API_KEY" \
  -d '{"partition_start": "15m ago", "include_metrics": true}'
```

## Partition-Specific Recovery Procedures

### Frontend-Backend Partition Recovery
```bash
# 1. Clear frontend cache
curl -X POST https://app.visanet.app/api/cache/clear \
  -H "Authorization: Bearer $VERCEL_TOKEN"

# 2. Force CDN purge
curl -X POST https://api.vercel.com/v1/purge \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -d '{"domain": "app.visanet.app"}'

# 3. Verify frontend-backend connectivity
curl https://app.visanet.app/api/health
```

### Database Partition Recovery
```bash
# 1. Reset connection pools
curl -X POST https://api.visanet.app/api/v1/database/reset-pools \
  -H "X-API-Key: $ADMIN_KEY"

# 2. Verify database consistency
psql $DATABASE_URL -c "SELECT * FROM consistency_check();"

# 3. Replay failed writes from WAL
curl -X POST https://api.visanet.app/api/v1/database/replay-wal \
  -H "X-API-Key: $ADMIN_KEY" \
  -d '{"from_timestamp": "20m ago"}'
```

### Queue Partition Recovery
```bash
# 1. Stop all workers
render scale worker --count=0

# 2. Export queue state
curl https://api.visanet.app/api/v1/queue/export \
  -H "X-API-Key: $ADMIN_KEY" > queue-state.json

# 3. Clear and reimport
curl -X POST https://api.visanet.app/api/v1/queue/clear \
  -H "X-API-Key: $ADMIN_KEY"

curl -X POST https://api.visanet.app/api/v1/queue/import \
  -H "X-API-Key: $ADMIN_KEY" \
  --data-binary @queue-state.json

# 4. Restart workers
render scale worker --count=3
```

## Success Criteria

- [ ] Network partitions detected within 30 seconds
- [ ] No data corruption during partition
- [ ] Appropriate degraded mode activation
- [ ] Clear error messages to users
- [ ] Successful automatic recovery where possible
- [ ] Manual recovery procedures work as documented
- [ ] Data consistency maintained or restored
- [ ] Full service restoration within RTO

## Data Consistency Checks

### During Partition
```sql
-- Check for conflicting writes
SELECT * FROM detect_conflicts('partition_start_time'::timestamp);

-- Verify sequence consistency
SELECT * FROM verify_sequences();

-- Check for orphaned records
SELECT * FROM find_orphaned_records();
```

### After Recovery
```sql
-- Full consistency check
SELECT * FROM full_consistency_check();

-- Verify referential integrity
SELECT * FROM verify_foreign_keys();

-- Check for duplicate processing
SELECT * FROM detect_duplicate_jobs('partition_window');
```

## Common Issues & Mitigations

### Issue: Persistent split-brain after recovery
**Solution:**
```bash
# Force leader election
curl -X POST https://api.visanet.app/api/v1/consensus/force-election \
  -H "X-API-Key: $ADMIN_KEY"
```

### Issue: Connection pool exhaustion
**Solution:**
```bash
# Increase pool size temporarily
render env --service backend DB_POOL_SIZE=50

# Reset stuck connections
curl -X POST https://api.visanet.app/api/v1/database/reset-stuck-connections \
  -H "X-API-Key: $ADMIN_KEY"
```

### Issue: Cached stale data after recovery
**Solution:**
```bash
# Global cache invalidation
curl -X POST https://api.visanet.app/api/v1/cache/invalidate-all \
  -H "X-API-Key: $ADMIN_KEY"
```

## Performance Impact During Partition

| Metric | Normal | During Partition | Recovery Phase |
|--------|--------|-----------------|----------------|
| API Latency | 50ms | 200-5000ms | 100ms |
| Success Rate | 99.9% | 40-60% | 95% |
| Queue Throughput | 1000/min | 0-500/min | 800/min |
| DB Queries | 5000/min | 500/min | 4000/min |

## Test Variations

### Variation 1: Slow Network (not complete partition)
```bash
# Add 500ms latency
./experiments/latency-injection.sh render-supabase 500ms
```

### Variation 2: Intermittent Partition
```bash
# 30 seconds on, 30 seconds off
./experiments/network-partition.sh render-redis intermittent --interval 30s
```

### Variation 3: Asymmetric Partition
```bash
# Backend can reach database, but database cannot reach backend
./experiments/network-partition.sh render-supabase asymmetric
```

## Monitoring Dashboards

- [Network Topology View](https://grafana.com/d/network-topology)
- [Partition Detection Dashboard](https://grafana.com/d/partition-detection)
- [Consistency Monitoring](https://grafana.com/d/data-consistency)
- [Recovery Progress Tracker](https://grafana.com/d/recovery-progress)

## Post-Incident Report Template

### Executive Summary
- Partition type: _____________
- Duration: _____ minutes
- Data impact: _____________
- User impact: _____________

### Technical Details
1. **Detection Time**: _____ seconds
2. **Automated Responses**: 
   - [ ] Circuit breakers activated
   - [ ] Degraded mode enabled
   - [ ] Failover initiated
3. **Manual Interventions**:
   - _____________
4. **Recovery Steps**:
   - _____________

### Lessons Learned
1. What worked well:
2. What needs improvement:
3. Action items:

## Related Documentation

- [Network Architecture](../architecture/network-design.md)
- [Consensus Protocols](../architecture/consensus.md)
- [CAP Theorem Trade-offs](../architecture/cap-decisions.md)
- [Multi-Region Strategy](../architecture/multi-region.md)

## Emergency Contacts

- **Network Team**: #network-ops (Slack)
- **Database Team**: #database-oncall (Slack)
- **Security Team**: #security-incidents (Slack)
- **Executive Escalation**: CTO via PagerDuty