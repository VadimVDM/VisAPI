# Railway Migration Implementation Plan

**Created:** August 21, 2025  
**Status:** Planning Phase  
**Priority:** High  
**Impact:** Full Infrastructure Migration  

## Executive Summary

Complete infrastructure migration from current setup to Railway-centric deployment:
- **Backend**: Render → Railway
- **Redis**: Upstash → Railway Redis
- **Monitoring**: Grafana Cloud → Self-hosted Grafana on Railway

## 1. Current Infrastructure Analysis

### 1.1 Backend on Render (srv-d1qn5sre5dus73f531o0)
```yaml
Service Details:
- URL: https://api.visanet.app (custom domain)
- Region: Frankfurt (EU)
- Plan: Starter ($7/month)
- Build Command: pnpm install && pnpm nx build backend
- Start Command: node dist/apps/backend/main.js
- Health Check: /api/v1/healthz
- Environment: Node.js 22.16.0
- Auto-deploy: Enabled on main branch
- SSH: srv-d1qn5sre5dus73f531o0@ssh.frankfurt.render.com
```

### 1.2 Redis on Upstash
```yaml
Connection Details:
- URL: rediss://[password]@[host].upstash.io:6379
- TLS: Required (rediss://)
- Persistence: AOF enabled
- Features: BullMQ queues, idempotency keys, rate limiting
- Critical Queues:
  - critical (priority tasks)
  - default (standard tasks)
  - bulk (low priority)
  - slack, whatsapp, pdf (connectors)
  - cgb-sync (CGB WhatsApp sync)
  - dlq (dead letter queue)
```

### 1.3 Grafana Cloud Monitoring
```yaml
Configuration:
- Stack: visanet
- Prometheus URL: https://prometheus-prod-24-prod-eu-west-2.grafana.net/api/prom/push
- Username: 2563247
- Metrics Prefix: visapi_
- Push Interval: 30 seconds
- Dashboards:
  - Production Dashboard: /d/ee4deafb-60c7-4cb1-a2d9-aa14f7ef334e
  - Alerting Dashboard: /d/4582a630-7be8-41ec-98a0-2e65adeb9828
```

### 1.4 Critical Environment Variables
```bash
# Core Backend
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://[user]:[pass]@[host]/[db]?sslmode=require
REDIS_URL=rediss://[password]@[host].upstash.io:6379

# Supabase
SUPABASE_URL=https://pangdzwamawwgmvxnwkk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[secret]
SUPABASE_ANON_KEY=[key]

# Security
JWT_SECRET=[32+ char secret]
SESSION_SECRET=[32+ char secret]
CORS_ORIGIN=https://app.visanet.app,https://api.visanet.app

# Monitoring (Current Grafana Cloud)
GRAFANA_REMOTE_WRITE_ENABLED=true
GRAFANA_PROMETHEUS_URL=https://prometheus-prod-24-prod-eu-west-2.grafana.net/api/prom/push
GRAFANA_PROMETHEUS_USERNAME=2563247
GRAFANA_PROMETHEUS_PASSWORD=[secret]

# Integrations
CGB_API_KEY=[secret]
RESEND_API_KEY=[secret]
SLACK_WEBHOOK_URL=[webhook]
```

## 2. Migration Plan

### Phase 1: Railway Project Setup (Day 1)

#### 1.1 Create Railway Project via Dashboard
```yaml
Steps:
1. Login to Railway Dashboard (railway.app)
2. Create New Project → "visapi"
3. Connect GitHub Repository:
   - Repository: VadimVDM/VisAPI
   - Branch: main
   - Auto-deploy: Enabled
4. Railway auto-detects NX monorepo and configures:
   - Build Command: pnpm install && pnpm nx build backend
   - Start Command: node dist/apps/backend/main.js
   - Watch Path: /apps/backend/**
```

#### 1.2 Add Redis Service to Project
```yaml
In Railway Dashboard:
1. Click "+ New" → "Database" → "Redis"
2. Configuration (auto-provisioned):
   - Name: Redis
   - Internal URL: redis.railway.internal
   - Persistence: Enabled by default
   - Version: Latest stable (8.x)
3. Copy connection string from Redis service variables:
   - REDIS_URL: redis://default:[password]@[host]:[port]
   - REDISHOST: [auto-generated].railway.internal
   - REDISPORT: 6379
   - REDISUSER: default
   - REDISPASSWORD: [auto-generated]
```

#### 1.3 Add Grafana Service to Project
```yaml
In Railway Dashboard:
1. Click "+ New" → "Template" → Search "Grafana"
   OR manually add:
   - Click "+ New" → "Docker Image"
   - Image: grafana/grafana:latest
   - Port: 3000
   
2. Configure Grafana Environment Variables:
   - GF_SECURITY_ADMIN_USER: admin
   - GF_SECURITY_ADMIN_PASSWORD: [secure-password]
   - GF_INSTALL_PLUGINS: redis-datasource
   - GF_SERVER_ROOT_URL: https://grafana-production.up.railway.app
   
3. Add Volume for persistence:
   - Mount Path: /var/lib/grafana
   - Size: 5GB
```

#### 1.4 Configure Service Communication
```yaml
Railway Private Network (automatic):
- Backend → Redis: redis.railway.internal:6379
- Backend → Grafana: grafana.railway.internal:3000
- All services share private network by default
- No additional configuration needed
```

### Phase 2: Configuration Updates (Day 1-2)

#### 2.1 Update Environment Variables in Railway Dashboard
```bash
# Backend Service Variables (Add in Railway Dashboard)
# Copy all existing from Render, then update these:

# Redis (Railway provides these automatically, reference them):
REDIS_URL=${{Redis.REDIS_URL}}
# This references the Redis service's URL directly

# Grafana (Update from Cloud to Self-hosted)
GRAFANA_CLOUD_ENABLED=false
GRAFANA_PROMETHEUS_URL=http://grafana.railway.internal:9090/api/v1/write
GRAFANA_REMOTE_WRITE_ENABLED=true
# Remove these (no longer needed for self-hosted):
# GRAFANA_PROMETHEUS_USERNAME (delete)
# GRAFANA_PROMETHEUS_PASSWORD (delete)

# All other variables remain the same:
# - DATABASE_URL (Supabase)
# - SUPABASE_* variables
# - CGB_API_KEY
# - RESEND_API_KEY
# - etc.
```

#### 2.2 Code Changes Required

**File: `/apps/backend/src/metrics/remote-write.service.ts`**
```typescript
// Update to support both Grafana Cloud and self-hosted
private async pushMetrics(): Promise<void> {
  try {
    const metrics = await globalRegistry.metrics();
    const isCloud = this.configService.get<boolean>('GRAFANA_CLOUD_ENABLED', true);
    
    // ... existing metric filtering code ...
    
    const config = isCloud ? {
      url: this.url,
      auth: {
        username: this.username,
        password: this.password,
      },
      // ... existing config
    } : {
      url: this.url || 'http://grafana.railway.internal:9090/api/v1/write',
      // No auth needed for internal Railway network
      timeout: 10000,
      headers: {
        'User-Agent': 'visapi-remote-write/1.0',
      },
    };
    
    const result = await pushTimeseries(timeSeries, config);
    // ... rest of existing code
  }
}
```

**No changes needed to configuration.ts** - Redis URL handling already supports both `redis://` and `rediss://` URLs.

### Phase 3: Data Migration (Day 2)

#### 3.1 Redis Data Migration
```bash
# Step 1: Create Redis backup from Upstash
redis-cli -u $UPSTASH_REDIS_URL --rdb dump.rdb

# Step 2: Stop queue processing on Render
# Set QUEUE_PROCESSING_ENABLED=false in Render

# Step 3: Import to Railway Redis
redis-cli -u $RAILWAY_REDIS_URL --pipe < dump.rdb

# Step 4: Verify data integrity
redis-cli -u $RAILWAY_REDIS_URL
> DBSIZE
> KEYS queue:*
> LLEN queue:default
```

#### 3.2 Grafana Dashboards Migration
```bash
# Export from Grafana Cloud
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  https://visanet.grafana.net/api/dashboards/uid/ee4deafb-60c7-4cb1-a2d9-aa14f7ef334e \
  > production-dashboard.json

curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  https://visanet.grafana.net/api/dashboards/uid/4582a630-7be8-41ec-98a0-2e65adeb9828 \
  > alerting-dashboard.json

# Import to Railway Grafana
curl -X POST -H "Content-Type: application/json" \
  -d @production-dashboard.json \
  http://grafana.[railway-domain]/api/dashboards/db

curl -X POST -H "Content-Type: application/json" \
  -d @alerting-dashboard.json \
  http://grafana.[railway-domain]/api/dashboards/db
```

### Phase 4: DNS & Domain Configuration (Day 2-3)

#### 4.1 Configure Custom Domains in Railway
```yaml
In Railway Dashboard:

1. Backend Service → Settings → Domains:
   - Add Custom Domain: api.visanet.app
   - Railway provides CNAME target: [service-name].up.railway.app
   - Update DNS: api.visanet.app → CNAME → [railway-provided-domain]

2. Grafana Service → Settings → Domains:
   - Add Custom Domain: grafana.visanet.app  
   - Railway provides CNAME target: [grafana-service].up.railway.app
   - Update DNS: grafana.visanet.app → CNAME → [railway-provided-domain]

3. Railway automatically provisions SSL certificates via Let's Encrypt
```

#### 4.2 SSL Certificate Configuration
```bash
# Railway automatically provisions Let's Encrypt certificates
# Verify SSL after DNS propagation:
curl -I https://api.visanet.app
```

### Phase 5: Deployment & Validation (Day 3)

#### 5.1 Pre-Deployment Checklist
- [ ] All environment variables configured in Railway
- [ ] Redis data migrated and verified
- [ ] Grafana dashboards imported
- [ ] DNS records updated (but not switched)
- [ ] Health check endpoint tested
- [ ] Queue processing temporarily disabled

#### 5.2 Deployment Steps
```bash
# 1. Deploy to Railway (parallel to Render)
railway up

# 2. Test Railway deployment
curl https://[railway-backend-domain]/api/v1/healthz

# 3. Run smoke tests
pnpm test:e2e --api-url=https://[railway-backend-domain]

# 4. Switch DNS (minimal downtime)
# Update api.visanet.app CNAME to Railway

# 5. Monitor for 30 minutes
# Check logs, metrics, error rates
```

#### 5.3 Validation Tests
```typescript
// Health Check
GET /api/v1/healthz
Expected: { status: "ok", redis: "connected", db: "connected" }

// Queue Processing
POST /api/v1/queue/test
Expected: Job processed successfully

// Metrics Collection
GET /api/v1/metrics
Expected: visapi_ metrics present

// Grafana Dashboard
https://grafana.visanet.app
Expected: All panels showing data
```

## 3. Rollback Plan

### Immediate Rollback (< 1 hour)
```bash
# 1. Switch DNS back to Render
api.visanet.app → CNAME → visapi.onrender.com

# 2. Re-enable queue processing on Render
QUEUE_PROCESSING_ENABLED=true

# 3. Verify Render deployment
curl https://api.visanet.app/api/v1/healthz
```

### Data Rollback
```bash
# Redis rollback (if needed)
redis-cli -u $RAILWAY_REDIS_URL --rdb railway-backup.rdb
redis-cli -u $UPSTASH_REDIS_URL --pipe < railway-backup.rdb
```

## 4. Post-Migration Tasks

### 4.1 Update Documentation
- [ ] Update README.md with Railway deployment instructions
- [ ] Update CLAUDE.md with new infrastructure details
- [ ] Update environment variable documentation
- [ ] Create Railway-specific runbook

### 4.2 GitHub Integration (Already Configured)
```yaml
# No CI/CD changes needed!
# Railway auto-deploys from GitHub on push to main
# Same as current Render setup

Verify in Railway Dashboard:
1. Settings → GitHub Integration
2. Confirm auto-deploy is enabled
3. Check branch is set to 'main'
4. Verify build logs for successful deploys
```

### 4.3 Cleanup Old Infrastructure
```bash
# After 7 days of stable operation:
# 1. Cancel Render subscription
# 2. Delete Upstash Redis instance
# 3. Downgrade Grafana Cloud to free tier
# 4. Archive old environment variables
```

## 5. Cost Analysis

### Current Monthly Costs
- Render Starter: $7/month
- Upstash Redis: ~$10/month (pay-per-request)
- Grafana Cloud: $0 (free tier)
- **Total: ~$17/month**

### Railway Projected Costs
- Railway Backend: ~$5/month (usage-based)
- Railway Redis: ~$5/month 
- Railway Grafana: ~$3/month
- **Total: ~$13/month**

**Estimated Savings: $4/month (24% reduction)**

## 6. Technical Benefits

### Railway Advantages
1. **Unified Platform**: All services in one place
2. **Private Networking**: Services communicate internally
3. **Better Observability**: Built-in metrics and logs
4. **Simpler Configuration**: Environment variable injection
5. **Cost Efficiency**: Usage-based pricing
6. **Faster Deploys**: Better caching and build optimization

### Self-Hosted Grafana Benefits
1. **No Ingestion Limits**: Unlimited metrics
2. **Full Control**: Custom plugins and configurations
3. **Data Sovereignty**: Metrics stay in your infrastructure
4. **Cost Predictable**: Fixed resource costs

## 7. Risk Assessment

### High Risks
- **DNS Propagation**: 15-30 minute downtime possible
- **Redis Data Loss**: Backup and verify before migration
- **SSL Certificate**: May take time to provision

### Medium Risks
- **Performance Differences**: Railway may have different characteristics
- **Queue Processing**: Potential for duplicate job processing
- **Metric Gaps**: 1-2 hour gap during migration

### Low Risks
- **Environment Variables**: Well-documented and tested
- **Code Changes**: Minimal, backward-compatible

## 8. Success Criteria

### Immediate (Day 1)
- [ ] Backend responds on Railway URL
- [ ] Redis connection established
- [ ] Grafana accessible and collecting metrics

### Short-term (Week 1)
- [ ] Zero customer-facing downtime
- [ ] All queues processing normally
- [ ] Metrics flowing to self-hosted Grafana
- [ ] Response times ≤ Render baseline

### Long-term (Month 1)
- [ ] 99.9% uptime maintained
- [ ] Cost savings realized
- [ ] Team trained on Railway platform
- [ ] Documentation fully updated

## 9. Emergency Contacts

### Services
- **Railway Support**: support@railway.app
- **Render Status**: status.render.com
- **Upstash Status**: status.upstash.com

### DNS Providers
- **Cloudflare**: 1.1.1.1 (for quick DNS checks)
- **Domain Registrar**: [Your registrar support]

## 10. Migration Timeline

### Day 0 (Preparation)
- Review this document with team
- Gather all credentials
- Schedule migration window
- Notify stakeholders

### Day 1 (Setup)
- Morning: Create Railway project and services
- Afternoon: Configure environment variables
- Evening: Deploy test instance

### Day 2 (Migration)
- Morning: Migrate Redis data
- Afternoon: Import Grafana dashboards
- Evening: Run validation tests

### Day 3 (Cutover)
- Morning: Final testing
- Afternoon: DNS switch
- Evening: Monitor and validate

### Day 4-7 (Stabilization)
- Daily health checks
- Performance monitoring
- Issue resolution
- Documentation updates

### Day 8+ (Cleanup)
- Decommission old services
- Final documentation
- Post-mortem review

## Appendix A: Environment Variable Mapping

| Current (Render/Upstash/Grafana Cloud) | New (Railway) |
|----------------------------------------|---------------|
| REDIS_URL=rediss://...upstash.io | REDIS_URL=${{Redis.REDIS_URL}} |
| GRAFANA_PROMETHEUS_URL=https://grafana.net/... | GRAFANA_PROMETHEUS_URL=http://grafana.railway.internal:9090/api/v1/write |
| GRAFANA_PROMETHEUS_USERNAME=2563247 | (delete - not needed) |
| GRAFANA_PROMETHEUS_PASSWORD=glc_... | (delete - not needed) |
| GRAFANA_REMOTE_WRITE_ENABLED=true | GRAFANA_CLOUD_ENABLED=false |
| Build: Render dashboard | Build: GitHub auto-deploy |
| Deploy: git push → Render | Deploy: git push → Railway |

## Appendix B: Required Code Files to Update

1. `/apps/backend/src/metrics/remote-write.service.ts` - Update Prometheus configuration
2. `/libs/backend/core-config/src/lib/configuration.ts` - Add Railway config
3. `/.github/workflows/deploy-production.yml` - Add Railway deployment
4. `/docker-compose.yml` - Update local dev to match Railway Redis
5. `/.env.example` - Add Railway-specific variables
6. `/docs/deployment.md` - Update deployment documentation

## Appendix C: Railway Dashboard Navigation

```yaml
Project Structure:
visapi (Project)
├── visapi-backend (Service - GitHub Connected)
│   ├── Variables (Environment configs)
│   ├── Settings (Domains, health checks)
│   └── Logs (Real-time logging)
├── Redis (Service - Database)
│   ├── Variables (Connection strings)
│   ├── Data (Browse keys via CLI)
│   └── Settings (Memory, persistence)
└── Grafana (Service - Docker)
    ├── Variables (Admin credentials)
    ├── Settings (Domain, networking)
    └── Volume (Persistent storage)

Key Dashboard Actions:
- Deploy: Automatic on GitHub push
- Rollback: Click deployment → "Rollback to this version"
- Logs: Real-time view in each service
- Metrics: Built-in observability tab
- Variables: Reference other services with ${{Service.VARIABLE}}
```

## Appendix D: Validation Scripts

### Health Check Script
```bash
#!/bin/bash
# validate-migration.sh

RAILWAY_URL="https://[railway-backend-domain]"
RENDER_URL="https://api.visanet.app"

echo "Comparing Railway vs Render responses..."

# Health check
echo "Health Check:"
diff <(curl -s $RAILWAY_URL/api/v1/healthz | jq .) \
     <(curl -s $RENDER_URL/api/v1/healthz | jq .)

# Metrics
echo "Metrics Check:"
railway_metrics=$(curl -s $RAILWAY_URL/api/v1/metrics | grep visapi_ | wc -l)
render_metrics=$(curl -s $RENDER_URL/api/v1/metrics | grep visapi_ | wc -l)
echo "Railway metrics: $railway_metrics, Render metrics: $render_metrics"

# Response time
echo "Response Time:"
curl -w "Railway: %{time_total}s\n" -o /dev/null -s $RAILWAY_URL/api/v1/healthz
curl -w "Render: %{time_total}s\n" -o /dev/null -s $RENDER_URL/api/v1/healthz
```

### Redis Migration Verification
```bash
#!/bin/bash
# verify-redis.sh

echo "Verifying Redis migration..."

# Check queue counts
for queue in critical default bulk slack whatsapp pdf cgb-sync dlq; do
  upstash_count=$(redis-cli -u $UPSTASH_REDIS_URL llen queue:$queue)
  railway_count=$(redis-cli -u $RAILWAY_REDIS_URL llen queue:$queue)
  echo "$queue: Upstash=$upstash_count, Railway=$railway_count"
done

# Check key counts
upstash_keys=$(redis-cli -u $UPSTASH_REDIS_URL dbsize)
railway_keys=$(redis-cli -u $RAILWAY_REDIS_URL dbsize)
echo "Total keys: Upstash=$upstash_keys, Railway=$railway_keys"
```

## Notes for Next AI Session

### Critical Context Preserved
1. **CGB Metrics Issue**: Just fixed missing Prometheus metric providers in QueueModule (commit 8506737)
2. **Vizi Webhook**: Working correctly with order creation after validation fixes
3. **Current Deployment**: Render deployment may still be failing - Railway migration will resolve this
4. **Database**: Supabase remains unchanged (pangdzwamawwgmvxnwkk)
5. **Frontend**: Vercel deployment remains unchanged

### Do NOT Rediscover
1. **Redis Queues**: All queue names and purposes documented in section 1.2
2. **Environment Variables**: Complete list in section 1.4 and Appendix A
3. **Grafana Metrics**: All custom metrics use `visapi_` prefix
4. **Build Commands**: Exact commands documented in section 1.1
5. **Health Endpoints**: `/api/v1/healthz` for health checks

### Migration Priorities
1. **Zero Downtime**: Use parallel deployment strategy
2. **Data Integrity**: Redis backup before migration is critical
3. **Monitoring Continuity**: Grafana must be ready before switching
4. **Rollback Ready**: Keep Render active for 7 days post-migration

### Known Issues to Address
- Remote write service needs update for self-hosted Grafana
- Redis connection string format differs (rediss:// vs redis://)
- Grafana dashboards may need panel adjustments for self-hosted
- Railway uses internal DNS for service communication

---

**Document Version:** 1.0  
**Last Updated:** August 21, 2025  
**Next Review:** Before migration execution  
**Owner:** Engineering Team