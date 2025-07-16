# GitHub Actions Workflows

This directory contains the CI/CD pipeline configurations for VisAPI.

## Workflows

### 1. CI Pipeline (`ci.yml`)

**Trigger**: On push to main/develop branches and all pull requests

**Jobs**:

- **Setup**: Determines affected projects using NX
- **Lint**: Runs ESLint across the codebase
- **Test**: Runs unit tests with coverage reporting
- **Build**: Builds affected applications
- **Security**: Runs Trivy vulnerability scanner
- **Lighthouse**: Performance and accessibility testing for frontend

**Features**:

- NX affected commands for efficient builds
- Parallel execution for faster feedback
- Coverage reporting to Codecov
- Build artifact uploads

### 2. Deploy to Staging (`deploy-staging.yml`)

**Trigger**: Automatic on push to main branch

**Jobs**:

- **Deploy Frontend**: Deploys to Vercel staging
- **Deploy Backend**: Deploys to Render staging (Gateway + Worker)
- **Health Check**: Validates deployment success
- **Notify**: Slack notification with deployment status

**URLs**:

- Frontend: https://app-staging.visanet.app
- Backend: https://api-staging.visanet.app

### 3. Deploy to Production (`deploy-production.yml`)

**Trigger**: Manual workflow dispatch or GitHub release

**Jobs**:

- **Pre-deploy Checks**: Validates staging health
- **Deploy Frontend**: Deploys to Vercel production
- **Deploy Backend**: Deploys to Render production
- **Health Check**: Multiple retry attempts
- **Rollback**: Automatic rollback on failure
- **Post-deploy**: Updates monitoring and status

**URLs**:

- Frontend: https://app.visanet.app
- Backend: https://api.visanet.app

### 4. Security Scanning (`security.yml`)

**Trigger**: Daily at 2 AM UTC, and on all pushes/PRs to main

**Jobs**:

- **Dependency Scan**: Snyk vulnerability scanning
- **Container Scan**: Trivy for Docker images
- **Secrets Scan**: TruffleHog for leaked credentials
- **License Check**: Validates approved licenses
- **CodeQL**: Static code analysis
- **SBOM**: Generates Software Bill of Materials

**Security Reports**: Uploaded to GitHub Security tab

## Required Secrets

Configure these in GitHub repository settings:

### Deployment

- `VERCEL_TOKEN`: Vercel API token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID_FRONTEND`: Vercel project ID
- `RENDER_API_KEY`: Render API key
- `RENDER_GATEWAY_SERVICE_ID_STAGING`: Render service ID (staging gateway)
- `RENDER_WORKER_SERVICE_ID_STAGING`: Render service ID (staging worker)
- `RENDER_GATEWAY_SERVICE_ID_PROD`: Render service ID (production gateway)
- `RENDER_WORKER_SERVICE_ID_PROD`: Render service ID (production worker)

### Monitoring & Security

- `SLACK_WEBHOOK_URL`: Slack webhook for notifications
- `SNYK_TOKEN`: Snyk authentication token
- `CODECOV_TOKEN`: Codecov upload token

## Best Practices

1. **Branch Protection**: Enable required status checks for main branch
2. **Review Requirements**: Require PR reviews before merging
3. **Secret Rotation**: Rotate tokens every 90 days
4. **Monitoring**: Check workflow run history regularly
5. **Optimization**: Use workflow_dispatch for manual testing

## Troubleshooting

### Common Issues

1. **NX Cache Issues**

   ```yaml
   - name: Clear NX Cache
     run: pnpm nx reset
   ```

2. **Deployment Failures**

   - Check service logs in Vercel/Render dashboards
   - Verify environment variables are set correctly
   - Ensure build commands match local development

3. **Security Scan Failures**
   - Review SARIF reports in Security tab
   - Update dependencies with `pnpm update`
   - Add exceptions to `.snyk` file if needed

### Useful Commands

```bash
# Test workflow locally with act
act -j build

# Validate workflow syntax
actionlint .github/workflows/*.yml

# Check secret usage
grep -r "secrets\." .github/workflows/
```
