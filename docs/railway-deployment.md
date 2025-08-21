# Railway Deployment Reference

**Platform:** Railway  
**Status:** Production Live  
**Auto-deploy:** Enabled from GitHub main branch

## Railway Architecture

```
Railway Project: VisAPI
├── Backend Service (NestJS)
│   ├── Auto-deploy from GitHub main branch
│   ├── Custom domain: api.visanet.app
│   └── Node.js 22 via Nixpacks
└── Redis Service
    ├── Persistent storage
    ├── Public URL for connectivity
    └── 7.2.5 Bitnami Redis
```

## Environment Configuration

### Backend Service Variables

```bash
# Core
NODE_ENV=production
PORT=3000

# Database (Supabase - unchanged)
DATABASE_URL=postgresql://...@db.pangdzwamawwgmvxnwkk.supabase.co:5432/postgres
SUPABASE_URL=https://pangdzwamawwgmvxnwkk.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Redis (Railway)
REDIS_URL=${{redis.REDIS_PUBLIC_URL}}  # Uses public URL for connectivity

# Monitoring
GRAFANA_CLOUD_ENABLED=false  # Prepared for self-hosted
GRAFANA_REMOTE_WRITE_ENABLED=true
GRAFANA_PROMETHEUS_URL=http://grafana.railway.internal:9090/api/v1/write

# All other services remain unchanged
```

### Redis Configuration

Railway Redis uses public URL due to internal DNS resolution timing:
- **Public URL**: `redis://default:[password]@hopper.proxy.rlwy.net:25566`
- **Internal URL**: `redis://default:[password]@redis.railway.internal:6379` (future use)

## Deployment Process

### Automatic Deployment

1. Push to `main` branch on GitHub
2. Railway automatically detects changes
3. Builds using Nixpacks configuration
4. Deploys with zero-downtime

### Manual Deployment

Not required - Railway only supports auto-deploy from GitHub.

### Build Configuration

**Nixpacks Configuration** (`.nixpacks.json`):
```json
{
  "providers": ["node"],
  "buildPlan": {
    "phases": {
      "setup": {
        "nixPkgs": ["nodejs_22", "pnpm-9_x", ...]
      }
    }
  }
}
```

**Build Commands**:
- Build: `pnpm install && pnpm nx build backend`
- Start: `node dist/apps/backend/main.js`
- Health Check: `/api/v1/healthz`

## Monitoring & Health

### Health Endpoints

- **Health Check**: `https://api.visanet.app/api/v1/healthz`
- **Liveness**: `https://api.visanet.app/api/v1/livez`
- **Version**: `https://api.visanet.app/api/v1/version`
- **Metrics**: `https://api.visanet.app/api/v1/metrics`

### Railway Dashboard

Monitor services at: https://railway.app/project/[project-id]

Features:
- Real-time logs
- Metrics & observability
- Environment variables management
- Deployment history


## Troubleshooting

### Redis Connection Issues

If seeing `ENOTFOUND redis.railway.internal`:
1. Use `REDIS_PUBLIC_URL` instead of internal URL
2. Ensure Redis service is running
3. Check environment variable references

### Build Failures

If build fails:
1. Check Nixpacks configuration
2. Verify Node.js version compatibility
3. Review build logs in Railway dashboard

### Route Warnings

Path-to-regexp warnings are handled by:
- Using proper route syntax (`@All()` and `@All('*')`)
- Excluding problematic routes from Swagger with `@ApiExcludeEndpoint()`

## Support & Resources

- **Railway Dashboard**: https://railway.app
- **Railway Docs**: https://docs.railway.app