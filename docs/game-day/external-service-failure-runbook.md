# Game Day Runbook: External Service Failure Scenario

## Scenario Overview

**Name**: Third-Party Service Outage (WhatsApp/Resend/Supabase)  
**Type**: External Dependency Failure  
**Severity**: P1 - High  
**Expected Duration**: 15-30 minutes  
**Recovery Time Objective (RTO)**: 20 minutes

## Scenario Description

This scenario simulates failures of critical external services including WhatsApp CGB API, Resend email service, and Supabase storage/database. The system should gracefully degrade, queue retries, and recover automatically when services return.

## Pre-requisites

- [ ] Access to all external service dashboards
- [ ] API keys for manual testing
- [ ] Network traffic control tools ready
- [ ] Monitoring dashboards open
- [ ] Runbook for each service type

## Scenario Execution Steps

### 1. Pre-Failure Health Check (T-5 minutes)

```bash
# Test all external services
curl -X POST https://api.visanet.app/api/v1/health/external-services \
  -H "X-API-Key: $API_KEY" | jq

# Verify connector status
curl https://api.visanet.app/api/v1/connectors/status \
  -H "X-API-Key: $API_KEY" | jq

# Create test jobs for each service
# WhatsApp test
curl -X POST https://api.visanet.app/api/v1/test/whatsapp \
  -H "X-API-Key: $API_KEY" \
  -d '{"to": "+1234567890", "template": "test_message"}'

# Email test
curl -X POST https://api.visanet.app/api/v1/test/email \
  -H "X-API-Key: $API_KEY" \
  -d '{"to": "test@visanet.com", "subject": "Game Day Test"}'
```

### 2. Initiate Service Failures (T+0 minutes)

Choose one or more services to simulate failure:

#### Option A: WhatsApp CGB API Failure

```bash
# Block WhatsApp API endpoint
cd chaos-engineering/
./experiments/external-service-failure.sh whatsapp block

# Alternative: Rate limit to simulate quota exceeded
./experiments/rate-limit.sh graph.callsbase.com 0
```

#### Option B: Resend Email Service Failure

```bash
# Block Resend API
./experiments/external-service-failure.sh resend block

# Alternative: Simulate API errors
./experiments/api-fault-injection.sh api.resend.com 500
```

#### Option C: Supabase Storage Failure

```bash
# Block Supabase storage endpoints
./experiments/external-service-failure.sh supabase-storage block

# Alternative: Simulate slow responses
./experiments/latency-injection.sh "*.supabase.co" 30000
```

#### Option D: Multiple Service Failure

```bash
# Catastrophic scenario - multiple services fail
./chaos-runner.sh external-service-failure all medium
```

### 3. Monitor System Behavior (T+2 minutes)

**Expected Behavior by Service:**

**WhatsApp Failure:**

- Jobs enter retry queue with exponential backoff
- Circuit breaker activates after 5 consecutive failures
- Webhook returns 202 Accepted with warning
- Alternative notification channels activated (if configured)

**Email Failure:**

- Email jobs queued for retry
- Fallback to alternative email service (if configured)
- Non-critical emails deferred
- Critical emails logged for manual sending

**Storage Failure:**

- PDF generation jobs fail gracefully
- Temporary files cached locally
- Upload retries with exponential backoff
- User notified of delayed document availability

**Monitoring Commands:**

```bash
# Check circuit breaker status
curl https://api.visanet.app/api/v1/circuit-breakers \
  -H "X-API-Key: $API_KEY" | jq

# Monitor retry queues
curl https://api.visanet.app/api/v1/queue/retries \
  -H "X-API-Key: $API_KEY" | jq '.byService'

# Check degraded mode flags
curl https://api.visanet.app/api/v1/system/degraded-services \
  -H "X-API-Key: $API_KEY"

# View service-specific error rates
watch -n 5 'curl -s https://api.visanet.app/api/metrics | grep -E "(whatsapp|email|storage)_error_rate"'
```

### 4. Test Graceful Degradation (T+5 minutes)

```bash
# Verify workflows continue with degraded services
curl -X POST https://api.visanet.app/api/v1/workflows/test-degraded \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "steps": ["validation", "processing", "notification", "storage"],
    "expect_failures": ["notification", "storage"]
  }'

# Check user-facing error messages
curl -X POST https://api.visanet.app/api/v1/triggers/visa-application \
  -H "X-API-Key: $API_KEY" \
  -d @test-data/visa-application.json \
  -v 2>&1 | grep -E "(Warning|Degraded)"
```

### 5. Recovery Procedures (T+15 minutes)

#### Restore Service Connectivity

```bash
# Unblock services
./experiments/external-service-failure.sh --restore-all

# Verify connectivity restored
curl -X POST https://api.visanet.app/api/v1/health/external-services \
  -H "X-API-Key: $API_KEY" | jq '.services'
```

#### Process Retry Queues

```bash
# Trigger immediate retry for queued jobs
curl -X POST https://api.visanet.app/api/v1/queue/retry-all \
  -H "X-API-Key: $API_KEY" \
  -d '{"service": "whatsapp", "max_age_minutes": 30}'

# Monitor retry progress
watch -n 5 'curl -s https://api.visanet.app/api/v1/queue/retries/progress | jq'
```

### 6. Post-Recovery Validation (T+20 minutes)

```bash
# Verify all services operational
for service in whatsapp email storage; do
  echo "Testing $service..."
  curl https://api.visanet.app/api/v1/connectors/$service/test \
    -H "X-API-Key: $API_KEY"
done

# Check retry queue empty
curl https://api.visanet.app/api/v1/queue/retries \
  -H "X-API-Key: $API_KEY" | jq '.total'

# Verify no data loss
curl https://api.visanet.app/api/v1/audit/failed-operations \
  -H "X-API-Key: $API_KEY" \
  -d '{"from": "30m ago", "status": "unrecoverable"}'
```

## Service-Specific Recovery Procedures

### WhatsApp Recovery

```bash
# 1. Verify WABA API token valid
curl -X GET "https://graph.facebook.com/v23.0/me" \
  -H "Authorization: Bearer $WABA_ACCESS_TOKEN"

# If token expired (401 error), refresh immediately:
# See: /docs/whatsapp-business-api-setup.md#step-41-access-token-expiration--refresh
# Quick steps:
#   1. Go to Meta Business Suite > Business Settings > System Users
#   2. Generate New Token for WhatsApp API system user
#   3. Update WABA_ACCESS_TOKEN in Railway
#   4. Redeploy backend service

# 2. Check message template status
curl https://api.visanet.app/api/v1/whatsapp/templates \
  -H "X-API-Key: $API_KEY"

# 3. Force template sync after token refresh
curl -X POST https://api.visanet.app/api/v1/whatsapp/templates/sync \
  -H "X-API-Key: $API_KEY"

# 4. Process high-priority messages first
curl -X POST https://api.visanet.app/api/v1/queue/prioritize \
  -H "X-API-Key: $API_KEY" \
  -d '{"service": "whatsapp", "priority": "critical"}'
```

### Email Recovery

```bash
# 1. Verify Resend API key
curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY"

# 2. Check email domain verification
curl https://api.visanet.app/api/v1/email/domains \
  -H "X-API-Key: $API_KEY"

# 3. Resend failed emails
curl -X POST https://api.visanet.app/api/v1/email/retry-failed \
  -H "X-API-Key: $API_KEY"
```

### Storage Recovery

```bash
# 1. Verify Supabase connectivity
curl https://$SUPABASE_PROJECT.supabase.co/storage/v1/list \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"

# 2. Upload cached files
curl -X POST https://api.visanet.app/api/v1/storage/upload-cached \
  -H "X-API-Key: $API_KEY"

# 3. Regenerate missing PDFs
curl -X POST https://api.visanet.app/api/v1/pdf/regenerate-failed \
  -H "X-API-Key: $API_KEY"
```

## Success Criteria

- [ ] All external service failures detected within 60 seconds
- [ ] Circuit breakers activate appropriately
- [ ] Graceful degradation maintains core functionality
- [ ] No data loss during outage
- [ ] Automatic retry processing on recovery
- [ ] Clear user communication about degraded services
- [ ] Full recovery within RTO

## Degradation Strategy by Service

| Service  | Impact   | Degradation Strategy          | User Experience               |
| -------- | -------- | ----------------------------- | ----------------------------- |
| WhatsApp | High     | Queue & retry, email fallback | "Notification delayed"        |
| Email    | Medium   | Queue & retry, log critical   | "Email will be sent shortly"  |
| Storage  | Low      | Local cache, delayed upload   | "Document processing delayed" |
| Database | Critical | Read-only mode, cache serving | "Limited functionality"       |

## Monitoring & Alerting

### Key Metrics

```bash
# Service availability
curl https://api.visanet.app/api/metrics | grep -E "external_service_availability{service="

# Retry queue depth by service
curl https://api.visanet.app/api/metrics | grep retry_queue_depth

# Circuit breaker state
curl https://api.visanet.app/api/metrics | grep circuit_breaker_state

# User impact score
curl https://api.visanet.app/api/metrics | grep degraded_mode_impact
```

### Alert Thresholds

- Service unavailable > 30 seconds: Warning
- Service unavailable > 2 minutes: Critical
- Retry queue > 1000 items: Warning
- Retry queue > 5000 items: Critical

## Common Issues & Solutions

### Issue: Circuit breaker won't reset

```bash
# Manual reset after verifying service health
curl -X POST https://api.visanet.app/api/v1/circuit-breakers/reset \
  -H "X-API-Key: $ADMIN_KEY" \
  -d '{"service": "whatsapp", "verify_health": true}'
```

### Issue: Retry storm after recovery

```bash
# Implement rate limiting on retries
curl -X POST https://api.visanet.app/api/v1/queue/retry-config \
  -H "X-API-Key: $ADMIN_KEY" \
  -d '{"rate_limit": 100, "per_minute": true}'
```

### Issue: Memory exhaustion from queued jobs

```bash
# Offload to persistent storage
curl -X POST https://api.visanet.app/api/v1/queue/offload-memory \
  -H "X-API-Key: $ADMIN_KEY" \
  -d '{"threshold_mb": 500}'
```

## Lessons Learned Template

### Failure Response

1. Time to detect: **\_** seconds
2. Circuit breaker activation: **\_** seconds
3. Degradation effectiveness: **\_**%
4. User notifications sent: **\_**

### Recovery Metrics

1. Service restoration time: **\_** minutes
2. Retry queue processing: **\_** minutes
3. Total jobs affected: **\_**
4. Jobs successfully recovered: **\_**%

### Improvement Opportunities

- [ ] Detection speed
- [ ] Fallback mechanisms
- [ ] User communication
- [ ] Recovery automation

## Related Documentation

- [External Service Integration Guide](../integrations/external-services.md)
- [Circuit Breaker Patterns](../architecture/circuit-breakers.md)
- [Retry Strategy Configuration](../configuration/retry-policies.md)
- [Service Level Objectives](../sla/external-dependencies.md)

## Vendor Contacts

### WhatsApp CGB

- Status Page: https://status.callsbase.com
- Support: support@callsbase.com
- Escalation: whatsapp-enterprise@meta.com

### Resend

- Status Page: https://status.resend.com
- Support: support@resend.com
- API Issues: api-support@resend.com

### Supabase

- Status Page: https://status.supabase.com
- Support: support@supabase.com
- Enterprise Support: enterprise@supabase.com
