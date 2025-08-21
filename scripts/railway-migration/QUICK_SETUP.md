# Railway Quick Setup Guide

## Current Status
✅ Code updated to support self-hosted Grafana  
✅ Validation scripts created  
📝 Waiting for Railway project setup  

## Step-by-Step Setup

### 1. Railway Dashboard Setup (You're doing this now)

1. **Create Project**: Name it "VisAPI"
2. **Connect GitHub**: Select `VadimVDM/VisAPI` repository, main branch
3. **Add Redis Service**:
   - Click "+ New" → "Database" → "Redis"
   - Railway auto-configures everything
   
4. **Add Grafana Service** (Optional for now):
   - Click "+ New" → "Docker Image"
   - Image: `grafana/grafana:latest`
   - Add environment variables:
     ```
     GF_SECURITY_ADMIN_USER=admin
     GF_SECURITY_ADMIN_PASSWORD=<choose-secure-password>
     GF_INSTALL_PLUGINS=redis-datasource
     ```

### 2. Configure Backend Service

After Railway creates the backend service from GitHub:

1. Go to the backend service → Variables tab
2. Copy ALL variables from `railway-env-vars.md`
3. For Redis, add: `REDIS_URL=${{Redis.REDIS_URL}}`
4. Remove all Grafana Cloud variables (USERNAME, PASSWORD, etc.)
5. Set `GRAFANA_CLOUD_ENABLED=false`

### 3. Configure Custom Domain

1. Backend Service → Settings → Networking
2. Add custom domain: `api.visanet.app`
3. Railway provides CNAME target
4. Update DNS at your provider

### 4. Verify Deployment

Once deployed, test with:
```bash
# Test Railway deployment
curl https://[railway-url]/api/v1/healthz

# After DNS switch
curl https://api.visanet.app/api/v1/healthz
```

## Key Differences from Render

| Render | Railway |
|--------|---------|
| `rediss://` (TLS) | `redis://` (internal network) |
| Upstash Redis | Railway Redis |
| Grafana Cloud | Self-hosted Grafana |
| Manual deploys available | Auto-deploy only (from GitHub) |

## Environment Variable Changes

### Redis
- **OLD**: `REDIS_URL=rediss://...upstash.io`
- **NEW**: `REDIS_URL=${{Redis.REDIS_URL}}`

### Grafana
- **ADD**: `GRAFANA_CLOUD_ENABLED=false`
- **REMOVE**: All `GRAFANA_PROMETHEUS_USERNAME/PASSWORD` variables
- **UPDATE**: `GRAFANA_PROMETHEUS_URL=http://grafana.railway.internal:9090/api/v1/write`

## Testing Commands

```bash
# Validate migration (compare Railway vs Render)
./scripts/railway-migration/validate-migration.sh

# Check Redis (once both are configured)
RAILWAY_REDIS_URL="redis://..." \
UPSTASH_REDIS_URL="rediss://..." \
./scripts/railway-migration/verify-redis.sh
```

## Support

- Railway Dashboard: https://railway.app
- Railway Docs: https://docs.railway.app
- Our migration plan: `/tasks/railway-migration-plan.md`

## Next Steps After Setup

1. ✅ Monitor deployment logs in Railway
2. ✅ Test health endpoint
3. ✅ Configure custom domain
4. ✅ Run validation scripts
5. ✅ Switch DNS when ready

---
Good luck with the setup! The code is ready for Railway deployment.