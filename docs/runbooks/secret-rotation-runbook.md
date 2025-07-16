# Secret Rotation Runbook

**Document**: S4-DOC-01  
**Version**: 1.0  
**Last Updated**: July 16, 2025  
**Author**: VisAPI Operations Team

## Overview

This runbook provides comprehensive procedures for rotating secrets in the VisAPI production environment. Secret rotation is a critical security practice that reduces the risk of credential compromise and maintains compliance with security policies.

### Secret Management Strategy

- **Principle**: Zero-trust approach with regular rotation
- **Rotation Frequency**: 90 days for API keys, 30 days for high-privilege secrets
- **Storage**: Environment variables in deployment platforms (Vercel, Render)
- **Access Control**: Role-based access with audit logging

## Prerequisites

### Required Access

Before starting secret rotation, ensure you have:

- [ ] **Supabase Admin Access**: Full project permissions for database operations
- [ ] **Render Dashboard Access**: Environment variable management for backend services
- [ ] **Vercel Dashboard Access**: Environment variable management for frontend
- [ ] **Upstash Console Access**: Redis instance management and connection strings
- [ ] **GitHub Repository Access**: For updating deployment secrets
- [ ] **External Service Access**: Admin access to Slack, WhatsApp (CGB), Resend platforms

### Required Tools

- [ ] **CLI Tools**: `curl`, `jq`, `openssl`
- [ ] **Database Client**: `psql` or Supabase CLI
- [ ] **Password Manager**: For secure secret generation and storage
- [ ] **Monitoring Access**: Grafana/Prometheus for verification

### Emergency Contacts

- **Primary**: Operations Team Lead
- **Secondary**: Security Team Lead
- **Escalation**: CTO/Technical Lead

## Secret Inventory

### Core Application Secrets

| Secret Type    | Current Location | Rotation Frequency | Impact Level |
| -------------- | ---------------- | ------------------ | ------------ |
| JWT_SECRET     | Render Backend   | 30 days            | HIGH         |
| SESSION_SECRET | Render Backend   | 30 days            | HIGH         |
| CRON_SECRET    | Render Backend   | 30 days            | MEDIUM       |
| API_KEY_PREFIX | Render Backend   | 90 days            | LOW          |

### Database & Infrastructure

| Secret Type               | Current Location        | Rotation Frequency | Impact Level |
| ------------------------- | ----------------------- | ------------------ | ------------ |
| DATABASE_URL              | Render Backend          | 90 days            | CRITICAL     |
| REDIS_URL                 | Render Backend          | 90 days            | HIGH         |
| SUPABASE_SERVICE_ROLE_KEY | Render Backend + Vercel | 90 days            | CRITICAL     |
| SUPABASE_ANON_KEY         | Render Backend + Vercel | 90 days            | MEDIUM       |

### External Service Keys

| Secret Type          | Current Location | Rotation Frequency | Impact Level |
| -------------------- | ---------------- | ------------------ | ------------ |
| CGB_API_KEY          | Render Backend   | 90 days            | MEDIUM       |
| RESEND_API_KEY       | Render Backend   | 90 days            | MEDIUM       |
| SLACK_BOT_TOKEN      | Render Backend   | 90 days            | MEDIUM       |
| SLACK_SIGNING_SECRET | Render Backend   | 90 days            | MEDIUM       |
| SLACK_WEBHOOK_URL    | Render Backend   | 90 days            | MEDIUM       |

### Deployment Secrets

| Secret Type       | Current Location | Rotation Frequency | Impact Level |
| ----------------- | ---------------- | ------------------ | ------------ |
| VERCEL_API_TOKEN  | GitHub Actions   | 90 days            | HIGH         |
| RENDER_API_KEY    | GitHub Actions   | 90 days            | HIGH         |
| UPSTASH_API_KEY   | GitHub Actions   | 90 days            | HIGH         |
| CODECOV_TOKEN     | GitHub Actions   | 90 days            | LOW          |
| SLACK_WEBHOOK_URL | GitHub Actions   | 90 days            | MEDIUM       |

## Step-by-Step Rotation Process

### Phase 1: Pre-Rotation Preparation

1. **Schedule Maintenance Window**

   ```bash
   # Notify stakeholders
   curl -X POST $SLACK_WEBHOOK_URL \
     -H 'Content-Type: application/json' \
     -d '{"text": "🔄 SECRET ROTATION: Starting maintenance window for secret rotation"}'
   ```

2. **Backup Current Configuration**

   ```bash
   # Export current environment variables
   mkdir -p ./rotation-backup/$(date +%Y%m%d)

   # Note: Manual backup from dashboards required
   echo "Manual backup required from:"
   echo "- Render: https://dashboard.render.com/web/srv-*/environment"
   echo "- Vercel: https://vercel.com/dashboard/project/environment"
   echo "- GitHub: https://github.com/organization/repository/settings/secrets"
   ```

3. **Health Check Pre-Rotation**

   ```bash
   # Verify all services are healthy
   curl -f https://api.visanet.app/api/v1/healthz || exit 1
   curl -f https://app.visanet.app/health || exit 1

   # Check queue status
   curl -f https://api.visanet.app/api/v1/queue/metrics || exit 1
   ```

### Phase 2: Generate New Secrets

1. **Generate Core Application Secrets**

   ```bash
   # Generate JWT secret (64 characters)
   NEW_JWT_SECRET=$(openssl rand -hex 32)
   echo "New JWT Secret: $NEW_JWT_SECRET"

   # Generate session secret (64 characters)
   NEW_SESSION_SECRET=$(openssl rand -hex 32)
   echo "New Session Secret: $NEW_SESSION_SECRET"

   # Generate cron secret (32 characters)
   NEW_CRON_SECRET=$(openssl rand -hex 16)
   echo "New Cron Secret: $NEW_CRON_SECRET"
   ```

2. **Generate API Key Prefix (if rotating)**
   ```bash
   # Generate new prefix (keep existing format)
   NEW_API_KEY_PREFIX="vapi_$(date +%Y%m)_"
   echo "New API Key Prefix: $NEW_API_KEY_PREFIX"
   ```

### Phase 3: Update Infrastructure Secrets

1. **Rotate Database Credentials**

   ```bash
   # For Supabase - Generate new service role key
   echo "Navigate to: https://supabase.com/dashboard/project/pangdzwamawwgmvxnwkk/settings/api"
   echo "1. Click 'Reset' on service_role key"
   echo "2. Copy new key to clipboard"
   echo "3. Update NEW_SUPABASE_SERVICE_ROLE_KEY variable"

   # Store new key
   read -s -p "Enter new Supabase service role key: " NEW_SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Rotate Redis Credentials**

   ```bash
   # For Upstash - Reset password
   echo "Navigate to: https://console.upstash.com/redis/your-database"
   echo "1. Go to 'Details' tab"
   echo "2. Click 'Reset Password'"
   echo "3. Copy new connection string"

   # Store new connection string
   read -s -p "Enter new Redis URL: " NEW_REDIS_URL
   ```

### Phase 4: Update External Service Keys

1. **Rotate WhatsApp API Key**

   ```bash
   # CGB API rotation
   echo "Navigate to: https://app.chatgptbuilder.io/dashboard/api-keys"
   echo "1. Revoke old key"
   echo "2. Generate new key"
   echo "3. Update integrations"

   read -s -p "Enter new CGB API key: " NEW_CGB_API_KEY
   ```

2. **Rotate Email Service Key**

   ```bash
   # Resend API key rotation
   echo "Navigate to: https://resend.com/api-keys"
   echo "1. Create new API key"
   echo "2. Test with verification email"
   echo "3. Revoke old key after verification"

   read -s -p "Enter new Resend API key: " NEW_RESEND_API_KEY
   ```

3. **Rotate Slack Integration Keys**

   ```bash
   # Slack bot token rotation
   echo "Navigate to: https://api.slack.com/apps/YOUR_APP_ID/oauth"
   echo "1. Reinstall app to workspace"
   echo "2. Copy new bot token"
   echo "3. Update webhook URL if needed"

   read -s -p "Enter new Slack bot token: " NEW_SLACK_BOT_TOKEN
   ```

### Phase 5: Update Environment Variables

1. **Update Render Backend Environment**

   ```bash
   # Navigate to Render dashboard
   echo "Navigate to: https://dashboard.render.com/web/srv-*/environment"
   echo "Update the following variables:"
   echo "- JWT_SECRET: $NEW_JWT_SECRET"
   echo "- SESSION_SECRET: $NEW_SESSION_SECRET"
   echo "- CRON_SECRET: $NEW_CRON_SECRET"
   echo "- DATABASE_URL: $NEW_DATABASE_URL"
   echo "- REDIS_URL: $NEW_REDIS_URL"
   echo "- SUPABASE_SERVICE_ROLE_KEY: $NEW_SUPABASE_SERVICE_ROLE_KEY"
   echo "- CGB_API_KEY: $NEW_CGB_API_KEY"
   echo "- RESEND_API_KEY: $NEW_RESEND_API_KEY"
   echo "- SLACK_BOT_TOKEN: $NEW_SLACK_BOT_TOKEN"
   ```

2. **Update Vercel Frontend Environment**

   ```bash
   # Navigate to Vercel dashboard
   echo "Navigate to: https://vercel.com/dashboard/project/environment"
   echo "Update the following variables:"
   echo "- SUPABASE_SERVICE_KEY: $NEW_SUPABASE_SERVICE_ROLE_KEY"
   echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY: $NEW_SUPABASE_ANON_KEY"
   ```

3. **Update GitHub Actions Secrets**
   ```bash
   # Navigate to GitHub repository settings
   echo "Navigate to: https://github.com/organization/repository/settings/secrets"
   echo "Update the following repository secrets:"
   echo "- RENDER_API_KEY: (if rotated)"
   echo "- VERCEL_API_TOKEN: (if rotated)"
   echo "- UPSTASH_API_KEY: (if rotated)"
   ```

### Phase 6: Rolling Service Restart

1. **Restart Backend Services**

   ```bash
   # Trigger Render deployment
   curl -X POST "https://api.render.com/v1/services/srv-*/deploys" \
     -H "Authorization: Bearer $RENDER_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"clearCache": "do_not_clear"}'

   # Wait for deployment completion
   sleep 60

   # Verify health
   curl -f https://api.visanet.app/api/v1/healthz || exit 1
   ```

2. **Restart Frontend Services**

   ```bash
   # Trigger Vercel deployment
   curl -X POST "https://api.vercel.com/v1/deployments" \
     -H "Authorization: Bearer $VERCEL_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "visapi-frontend", "target": "production"}'

   # Wait for deployment completion
   sleep 60

   # Verify health
   curl -f https://app.visanet.app/health || exit 1
   ```

### Phase 7: Verification and Testing

1. **Authentication Verification**

   ```bash
   # Test API key authentication
   curl -H "X-API-Key: $EXISTING_API_KEY" \
     https://api.visanet.app/api/v1/workflows

   # Test database connectivity
   curl -f https://api.visanet.app/api/v1/healthz/database

   # Test Redis connectivity
   curl -f https://api.visanet.app/api/v1/healthz/redis
   ```

2. **Integration Testing**

   ```bash
   # Test WhatsApp integration
   curl -X POST https://api.visanet.app/api/v1/test/whatsapp \
     -H "X-API-Key: $EXISTING_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"message": "Test after rotation"}'

   # Test email integration
   curl -X POST https://api.visanet.app/api/v1/test/email \
     -H "X-API-Key: $EXISTING_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"to": "admin@visanet.com", "subject": "Test after rotation"}'

   # Test Slack integration
   curl -X POST https://api.visanet.app/api/v1/test/slack \
     -H "X-API-Key: $EXISTING_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"message": "Test after rotation"}'
   ```

3. **Queue System Verification**

   ```bash
   # Check queue metrics
   curl -f https://api.visanet.app/api/v1/queue/metrics

   # Test job processing
   curl -X POST https://api.visanet.app/api/v1/test/queue \
     -H "X-API-Key: $EXISTING_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"job": "test-rotation"}'
   ```

### Phase 8: Revoke Old Secrets

1. **Revoke External Service Keys**

   ```bash
   # Revoke old CGB API key
   echo "Navigate to: https://app.chatgptbuilder.io/dashboard/api-keys"
   echo "Delete the old API key"

   # Revoke old Resend API key
   echo "Navigate to: https://resend.com/api-keys"
   echo "Delete the old API key"

   # Revoke old Slack tokens (if applicable)
   echo "Navigate to: https://api.slack.com/apps/YOUR_APP_ID/oauth"
   echo "Revoke old installation if new one was created"
   ```

2. **Clean Up Database**

   ```bash
   # For Supabase - old keys are automatically invalidated
   echo "Old Supabase keys are automatically invalidated"

   # For Redis - old connection strings are automatically invalidated
   echo "Old Redis connection strings are automatically invalidated"
   ```

## Environment-Specific Procedures

### Production Environment

**Special Considerations:**

- Requires 24-hour advance notice to stakeholders
- Must be performed during low-traffic windows (typically 2-6 AM UTC)
- Requires dual approval from operations and security teams
- All changes must be peer-reviewed before execution

**Production-Only Steps:**

1. **Load Balancer Preparation**

   ```bash
   # Ensure multiple instances are running
   curl -X PATCH "https://api.render.com/v1/services/srv-*/scaling" \
     -H "Authorization: Bearer $RENDER_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"minReplicas": 2, "maxReplicas": 10}'
   ```

2. **Database Connection Pooling**

   ```bash
   # Verify connection pool settings
   curl -f https://api.visanet.app/api/v1/healthz/database/pool
   ```

3. **Enhanced Monitoring**
   ```bash
   # Enable detailed logging during rotation
   curl -X POST https://api.visanet.app/api/v1/admin/logging \
     -H "X-API-Key: $ADMIN_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"level": "debug", "duration": 3600}'
   ```

### Staging Environment

**Simplified Process:**

- No advance notice required
- Can be performed during business hours
- Single approval sufficient
- Used for testing rotation procedures

**Staging-Specific Steps:**

1. **Test Secret Generation**

   ```bash
   # Use shorter secrets for testing
   TEST_JWT_SECRET=$(openssl rand -hex 16)
   TEST_SESSION_SECRET=$(openssl rand -hex 16)
   ```

2. **Accelerated Verification**
   ```bash
   # Reduced wait times
   sleep 30  # Instead of 60 seconds
   ```

## Specific Rotation Procedures

### API Key Rotation (90-day cycle)

The VisAPI system uses a prefix/secret pattern with bcrypt hashing for API keys.

**Current Implementation:**

- Format: `vapi_<64-character-hex-secret>`
- Storage: Prefix stored in plaintext, secret hashed with bcrypt (rounds=12)
- Validation: Compare provided secret against stored hash

**Rotation Process:**

1. **Generate New API Keys**

   ```bash
   # Use the existing API to generate new keys
   curl -X POST https://api.visanet.app/api/v1/api-keys \
     -H "X-API-Key: $CURRENT_ADMIN_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Admin Key - Post Rotation",
       "scopes": ["keys:create", "keys:read", "keys:delete", "workflows:create", "workflows:read", "logs:read"]
     }'
   ```

2. **Update Client Applications**

   ```bash
   # Update any external clients or integrations
   echo "Update API keys in:"
   echo "- Postman collections"
   echo "- External monitoring tools"
   echo "- Third-party integrations"
   ```

3. **Revoke Old Keys**

   ```bash
   # List all keys to identify old ones
   curl -H "X-API-Key: $NEW_ADMIN_KEY" \
     https://api.visanet.app/api/v1/api-keys

   # Revoke old keys
   curl -X DELETE https://api.visanet.app/api/v1/api-keys/$OLD_KEY_ID \
     -H "X-API-Key: $NEW_ADMIN_KEY"
   ```

### JWT Secret Rotation

**Impact:** High - affects all user sessions
**Downtime:** ~30 seconds during restart

**Process:**

1. **Generate New Secret**

   ```bash
   NEW_JWT_SECRET=$(openssl rand -hex 32)
   ```

2. **Update Environment**

   ```bash
   # Update in Render dashboard
   echo "JWT_SECRET: $NEW_JWT_SECRET"
   ```

3. **Restart Services**

   ```bash
   # Trigger deployment
   curl -X POST "https://api.render.com/v1/services/srv-*/deploys" \
     -H "Authorization: Bearer $RENDER_API_KEY"
   ```

4. **Verify Impact**
   ```bash
   # All users will need to re-authenticate
   echo "Users will be logged out and need to sign in again"
   ```

### Database Credentials Rotation

**Impact:** Critical - affects all database operations
**Downtime:** ~60 seconds during connection pool refresh

**Process:**

1. **Create New Service Role Key**

   ```bash
   # In Supabase dashboard
   echo "Navigate to: https://supabase.com/dashboard/project/pangdzwamawwgmvxnwkk/settings/api"
   echo "Reset service_role key"
   ```

2. **Update Connection String**

   ```bash
   # New connection string format
   NEW_DATABASE_URL="postgresql://postgres.pangdzwamawwgmvxnwkk:$NEW_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
   ```

3. **Update Environment and Restart**
   ```bash
   # Update DATABASE_URL in Render
   # Restart services
   # Verify database connectivity
   ```

### External Service Key Rotation

#### WhatsApp (CGB) API Key

**Impact:** Medium - affects WhatsApp message sending
**Downtime:** None if done correctly

**Process:**

1. **Generate New Key**

   ```bash
   echo "Navigate to: https://app.chatgptbuilder.io/dashboard/api-keys"
   echo "Generate new API key"
   ```

2. **Test New Key**

   ```bash
   # Test before updating production
   curl -X POST "$CGB_API_URL/test" \
     -H "Authorization: Bearer $NEW_CGB_API_KEY"
   ```

3. **Update and Verify**
   ```bash
   # Update CGB_API_KEY in Render
   # Test WhatsApp integration
   # Revoke old key
   ```

#### Email (Resend) API Key

**Impact:** Medium - affects email notifications
**Downtime:** None if done correctly

**Process:**

1. **Generate New Key**

   ```bash
   echo "Navigate to: https://resend.com/api-keys"
   echo "Create new API key with same permissions"
   ```

2. **Test New Key**

   ```bash
   # Test email sending
   curl -X POST "https://api.resend.com/emails" \
     -H "Authorization: Bearer $NEW_RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "test@visanet.app",
       "to": "admin@visanet.com",
       "subject": "Test after rotation",
       "html": "Test message"
     }'
   ```

3. **Update and Verify**
   ```bash
   # Update RESEND_API_KEY in Render
   # Test email integration
   # Delete old key
   ```

#### Slack Integration Keys

**Impact:** Medium - affects Slack notifications
**Downtime:** None if done correctly

**Process:**

1. **Rotate Bot Token**

   ```bash
   echo "Navigate to: https://api.slack.com/apps/YOUR_APP_ID/oauth"
   echo "Reinstall app to workspace to get new token"
   ```

2. **Test New Token**

   ```bash
   # Test Slack API
   curl -X POST "https://slack.com/api/chat.postMessage" \
     -H "Authorization: Bearer $NEW_SLACK_BOT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "channel": "#test",
       "text": "Test after rotation"
     }'
   ```

3. **Update Webhook URL (if needed)**
   ```bash
   # Update SLACK_WEBHOOK_URL if changed
   # Test webhook
   curl -X POST $NEW_SLACK_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{"text": "Test after rotation"}'
   ```

## Verification Steps

### Authentication Verification

1. **API Key Authentication**

   ```bash
   # Test primary admin key
   curl -H "X-API-Key: $ADMIN_API_KEY" \
     https://api.visanet.app/api/v1/api-keys

   # Test workflow access
   curl -H "X-API-Key: $ADMIN_API_KEY" \
     https://api.visanet.app/api/v1/workflows

   # Test log access
   curl -H "X-API-Key: $ADMIN_API_KEY" \
     https://api.visanet.app/api/v1/logs
   ```

2. **Session Authentication**

   ```bash
   # Test admin dashboard login
   curl -X POST https://app.visanet.app/api/auth/signin \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@visanet.com"}'

   # Verify magic link works
   echo "Check admin@visanet.com inbox for magic link"
   ```

### Database Connectivity

1. **Connection Pool Status**

   ```bash
   # Check database health
   curl -f https://api.visanet.app/api/v1/healthz/database

   # Check connection pool metrics
   curl -f https://api.visanet.app/api/v1/healthz/database/pool
   ```

2. **Query Performance**

   ```bash
   # Test basic queries
   curl -H "X-API-Key: $ADMIN_API_KEY" \
     https://api.visanet.app/api/v1/workflows?limit=5

   # Test complex queries
   curl -H "X-API-Key: $ADMIN_API_KEY" \
     https://api.visanet.app/api/v1/logs?limit=10&level=error
   ```

### Queue System Verification

1. **Redis Connectivity**

   ```bash
   # Check Redis health
   curl -f https://api.visanet.app/api/v1/healthz/redis

   # Check queue metrics
   curl -f https://api.visanet.app/api/v1/queue/metrics
   ```

2. **Job Processing**

   ```bash
   # Submit test job
   curl -X POST https://api.visanet.app/api/v1/test/queue \
     -H "X-API-Key: $ADMIN_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"type": "test", "data": {"message": "post-rotation test"}}'

   # Check job completion
   sleep 10
   curl -f https://api.visanet.app/api/v1/queue/metrics
   ```

### Integration Verification

1. **WhatsApp Integration**

   ```bash
   # Test message sending
   curl -X POST https://api.visanet.app/api/v1/test/whatsapp \
     -H "X-API-Key: $ADMIN_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "phone": "+1234567890",
       "message": "Test after secret rotation"
     }'
   ```

2. **Email Integration**

   ```bash
   # Test email sending
   curl -X POST https://api.visanet.app/api/v1/test/email \
     -H "X-API-Key: $ADMIN_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "to": "admin@visanet.com",
       "subject": "Test after secret rotation",
       "html": "This is a test email sent after secret rotation."
     }'
   ```

3. **Slack Integration**
   ```bash
   # Test Slack notification
   curl -X POST https://api.visanet.app/api/v1/test/slack \
     -H "X-API-Key: $ADMIN_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "channel": "#alerts",
       "message": "Test after secret rotation"
     }'
   ```

## Rollback Procedures

### Immediate Rollback (Emergency)

If critical issues are detected during rotation:

1. **Stop All Deployments**

   ```bash
   # Cancel any in-progress deployments
   curl -X POST "https://api.render.com/v1/services/srv-*/deploys/$DEPLOY_ID/cancel" \
     -H "Authorization: Bearer $RENDER_API_KEY"
   ```

2. **Restore Previous Environment**

   ```bash
   # Restore from backup (manual process)
   echo "Restore environment variables from backup:"
   echo "- Navigate to Render dashboard"
   echo "- Restore previous JWT_SECRET"
   echo "- Restore previous DATABASE_URL"
   echo "- Restore previous REDIS_URL"
   echo "- Restore previous service keys"
   ```

3. **Trigger Rollback Deployment**
   ```bash
   # Deploy previous version
   curl -X POST "https://api.render.com/v1/services/srv-*/deploys" \
     -H "Authorization: Bearer $RENDER_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"clearCache": "clear"}'
   ```

### Partial Rollback (Specific Secret)

If only one secret type is causing issues:

1. **Identify Problematic Secret**

   ```bash
   # Check service logs
   curl -H "Authorization: Bearer $RENDER_API_KEY" \
     "https://api.render.com/v1/services/srv-*/logs"

   # Check application health
   curl -f https://api.visanet.app/api/v1/healthz/detailed
   ```

2. **Restore Single Secret**

   ```bash
   # Example: Restore JWT secret only
   echo "Navigate to Render dashboard"
   echo "Restore JWT_SECRET to previous value"
   echo "Keep all other new secrets"
   ```

3. **Partial Restart**
   ```bash
   # Restart only affected services
   curl -X POST "https://api.render.com/v1/services/srv-*/restart" \
     -H "Authorization: Bearer $RENDER_API_KEY"
   ```

### Rollback Verification

1. **Service Health Check**

   ```bash
   # Verify all services are healthy
   curl -f https://api.visanet.app/api/v1/healthz
   curl -f https://app.visanet.app/health
   ```

2. **Integration Testing**

   ```bash
   # Test critical integrations
   curl -X POST https://api.visanet.app/api/v1/test/all \
     -H "X-API-Key: $ADMIN_API_KEY"
   ```

3. **Monitor for 30 minutes**
   ```bash
   # Watch for errors
   while true; do
     curl -s https://api.visanet.app/api/v1/healthz | jq '.status'
     sleep 60
   done
   ```

## Automated Rotation Possibilities

### Terraform Integration

**Future Implementation:**

```hcl
# terraform/modules/secret-rotation/main.tf
resource "time_rotating" "jwt_secret" {
  rotation_days = 30
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true

  keepers = {
    rotation_time = time_rotating.jwt_secret.id
  }
}

resource "render_environment_variable" "jwt_secret" {
  service_id = var.service_id
  key        = "JWT_SECRET"
  value      = random_password.jwt_secret.result
}
```

### GitHub Actions Workflow

**Automated Rotation Workflow:**

```yaml
name: Secret Rotation
on:
  schedule:
    - cron: '0 2 1 * *' # First day of each month at 2 AM
  workflow_dispatch: # Manual trigger

jobs:
  rotate-secrets:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Generate new secrets
        run: |
          echo "NEW_JWT_SECRET=$(openssl rand -hex 32)" >> $GITHUB_ENV
          echo "NEW_SESSION_SECRET=$(openssl rand -hex 32)" >> $GITHUB_ENV
      - name: Update Render environment
        run: |
          # Update environment variables via API
          # Restart services
          # Verify health
```

### Monitoring Integration

**Automated Verification:**

```bash
# Monitor script for post-rotation verification
#!/bin/bash
set -e

# Health check loop
for i in {1..10}; do
  if curl -f https://api.visanet.app/api/v1/healthz; then
    echo "Health check passed (attempt $i)"
    break
  fi

  if [ $i -eq 10 ]; then
    echo "Health check failed after 10 attempts"
    exit 1
  fi

  sleep 30
done

# Integration tests
curl -X POST https://api.visanet.app/api/v1/test/all \
  -H "X-API-Key: $ADMIN_API_KEY"

echo "Automated verification completed successfully"
```

## Emergency Rotation Procedures

### Compromised Secret Detection

**Immediate Actions:**

1. **Identify Scope of Compromise**

   ```bash
   # Check access logs
   curl -H "X-API-Key: $ADMIN_API_KEY" \
     "https://api.visanet.app/api/v1/logs?level=error&limit=100"

   # Check API key usage
   curl -H "X-API-Key: $ADMIN_API_KEY" \
     "https://api.visanet.app/api/v1/api-keys"
   ```

2. **Immediate Revocation**

   ```bash
   # Revoke compromised API key immediately
   curl -X DELETE https://api.visanet.app/api/v1/api-keys/$COMPROMISED_KEY_ID \
     -H "X-API-Key: $ADMIN_API_KEY"

   # Rotate JWT secret immediately
   NEW_JWT_SECRET=$(openssl rand -hex 32)
   # Update in Render dashboard immediately
   ```

3. **Security Incident Response**

   ```bash
   # Notify security team
   curl -X POST $SECURITY_SLACK_WEBHOOK \
     -H "Content-Type: application/json" \
     -d '{
       "text": "🚨 SECURITY INCIDENT: Compromised secret detected",
       "channel": "#security-alerts"
     }'

   # Document incident
   echo "Create incident report with:"
   echo "- Time of detection"
   echo "- Affected secrets"
   echo "- Actions taken"
   echo "- Impact assessment"
   ```

### Mass Rotation (Security Event)

**When to Trigger:**

- External service breach affecting API keys
- Suspected insider threat
- Compliance requirement
- Security audit finding

**Process:**

1. **Emergency Coordination**

   ```bash
   # Activate incident response team
   curl -X POST $INCIDENT_WEBHOOK \
     -H "Content-Type: application/json" \
     -d '{
       "text": "🚨 MASS SECRET ROTATION INITIATED",
       "priority": "high"
     }'
   ```

2. **Simultaneous Rotation**

   ```bash
   # Generate all new secrets
   NEW_JWT_SECRET=$(openssl rand -hex 32)
   NEW_SESSION_SECRET=$(openssl rand -hex 32)
   NEW_CRON_SECRET=$(openssl rand -hex 16)

   # Update all external services simultaneously
   # Coordinate with service providers
   ```

3. **Accelerated Deployment**
   ```bash
   # Skip normal approval process
   # Deploy immediately
   # Monitor continuously
   ```

### Recovery Procedures

**Post-Emergency Actions:**

1. **System Verification**

   ```bash
   # Comprehensive health check
   curl -f https://api.visanet.app/api/v1/healthz/detailed

   # Test all integrations
   curl -X POST https://api.visanet.app/api/v1/test/all \
     -H "X-API-Key: $ADMIN_API_KEY"
   ```

2. **Audit and Documentation**

   ```bash
   # Generate audit report
   echo "Document:"
   echo "- Timeline of events"
   echo "- Secrets rotated"
   echo "- Impact assessment"
   echo "- Lessons learned"
   echo "- Process improvements"
   ```

3. **Process Review**
   ```bash
   # Schedule post-incident review
   echo "Schedule post-incident review within 48 hours"
   echo "Review and update this runbook based on lessons learned"
   ```

## Post-Rotation Checklist

### Immediate Verification (0-15 minutes)

- [ ] All services are healthy (`/healthz` endpoints)
- [ ] Database connectivity restored
- [ ] Redis connectivity restored
- [ ] API key authentication working
- [ ] Admin dashboard accessible

### Short-term Verification (15-60 minutes)

- [ ] Queue processing functioning
- [ ] WhatsApp integration working
- [ ] Email integration working
- [ ] Slack integration working
- [ ] Webhook processing working
- [ ] No error spikes in logs

### Long-term Monitoring (1-24 hours)

- [ ] Performance metrics stable
- [ ] No authentication errors
- [ ] No integration failures
- [ ] Queue metrics normal
- [ ] User complaints minimal

### Documentation Updates

- [ ] Update secret inventory with new rotation dates
- [ ] Document any issues encountered
- [ ] Update runbook with improvements
- [ ] Schedule next rotation
- [ ] Update monitoring dashboards

## Troubleshooting Guide

### Common Issues and Solutions

**Issue: Service won't start after rotation**

```bash
# Check service logs
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/srv-*/logs"

# Common causes:
# - Malformed secret (check for special characters)
# - Missing environment variable
# - Incorrect secret format
```

**Issue: Database connection fails**

```bash
# Verify connection string format
echo "Check DATABASE_URL format:"
echo "postgresql://postgres.PROJECT_ID:PASSWORD@HOST:PORT/postgres"

# Test connection
curl -f https://api.visanet.app/api/v1/healthz/database
```

**Issue: Redis connection fails**

```bash
# Verify Redis URL format
echo "Check REDIS_URL format:"
echo "rediss://default:PASSWORD@HOST:PORT"

# Test connection
curl -f https://api.visanet.app/api/v1/healthz/redis
```

**Issue: API keys not working**

```bash
# Check API key format
echo "Verify format: vapi_<64-character-hex>"

# Test with curl
curl -H "X-API-Key: $API_KEY" \
  https://api.visanet.app/api/v1/api-keys
```

**Issue: External integrations failing**

```bash
# Test each integration individually
curl -X POST https://api.visanet.app/api/v1/test/whatsapp \
  -H "X-API-Key: $ADMIN_API_KEY"

curl -X POST https://api.visanet.app/api/v1/test/email \
  -H "X-API-Key: $ADMIN_API_KEY"

curl -X POST https://api.visanet.app/api/v1/test/slack \
  -H "X-API-Key: $ADMIN_API_KEY"
```

### Emergency Contacts

**During Business Hours (9 AM - 5 PM UTC):**

- Primary: Operations Team Lead
- Secondary: DevOps Engineer
- Escalation: CTO

**After Hours:**

- On-call Engineer (via PagerDuty)
- Security Team Lead
- Emergency escalation: +1-XXX-XXX-XXXX

### Support Resources

- **Runbook Repository**: https://github.com/visanet/visapi/docs/runbooks
- **Monitoring Dashboard**: https://grafana.visanet.app
- **Service Status**: https://status.visanet.app
- **Documentation**: https://docs.visanet.app

---

**Document Control:**

- **Next Review Date**: October 16, 2025
- **Approved By**: Operations Team Lead
- **Version Control**: This document is maintained in the project repository
- **Testing**: This runbook should be tested in staging environment monthly
