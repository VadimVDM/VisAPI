# GitHub Actions Workflows

This directory contains the CI/CD pipeline configurations for VisAPI.

## Workflows

### 1. CI Pipeline (`ci.yml`)

**Trigger**: On push to main/develop branches and all pull requests

**Jobs**:

- **Setup**: Determines affected projects using NX
- **Lint**: Runs ESLint across the codebase with continue-on-error
- **Test**: Runs unit tests with coverage reporting (frontend, backend, worker)
- **Build**: Builds affected applications with proper artifact paths
- **Security**: Runs Trivy vulnerability scanner
- **Lighthouse**: Performance and accessibility testing for frontend

**Features**:

- NX affected commands for efficient builds
- Parallel execution for faster feedback
- Coverage reporting to Codecov
- Build artifact uploads with correct paths
- Stable test execution using `pnpm test:backend:serial`
- Frontend tests with `--passWithNoTests` flag

### 2. Deploy to Production (`deploy-production.yml`)

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

**Note**: Production deployments also happen automatically on every push to `main` via platform-native auto-deploy (Vercel and Render). This workflow provides additional safety checks and rollback capabilities for manual deployments.

### 3. Security Scanning (`security.yml`)

**Trigger**: Daily at 2 AM UTC, and on all pushes/PRs to main

**Jobs**:

- **Dependency Scan**: Snyk vulnerability scanning with SARIF output
- **Container Scan**: Trivy for Docker images (worker Dockerfile)
- **Secrets Scan**: TruffleHog for leaked credentials
- **License Check**: Validates approved licenses
- **CodeQL**: Static code analysis for JavaScript
- **SBOM**: Generates Software Bill of Materials

**Security Features**:

- SARIF file generation for proper security reporting
- Container security scanning with Alpine base image verification
- Non-root user validation (user ID 1001)
- Minimal attack surface verification
- Conditional uploads to prevent missing file errors

**Security Reports**: Uploaded to GitHub Security tab

## Required Secrets

Configure these in GitHub repository settings:

### Deployment

- `VERCEL_TOKEN`: Vercel API token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID_FRONTEND`: Vercel project ID
- `RENDER_API_KEY`: Render API key
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

4. **Container Build Failures**
   - Verify Dockerfile paths are correct for NX monorepo structure
   - Check that Docker build context includes all necessary files
   - Ensure worker project doesn't reference non-existent package.json files

5. **Test Failures in CI**
   - Use `pnpm test:backend:serial` for stable backend tests
   - Frontend tests should use `--passWithNoTests` flag
   - Check that test setup files are properly configured

### Useful Commands

```bash
# Test workflow locally with act
act -j build

# Validate workflow syntax
actionlint .github/workflows/*.yml

# Check secret usage
grep -r "secrets\." .github/workflows/

# Test Docker build locally
docker build -t visapi-worker:test -f worker/Dockerfile .

# Run tests locally matching CI configuration
pnpm test:backend:serial
pnpm nx test frontend --passWithNoTests

# Check workflow run status
gh run list --limit 5
gh run view <run-id>
```

## Recent Fixes (July 2025)

### CI/CD Pipeline Improvements

1. **Container Security Scanning**: Fixed worker Dockerfile to work with NX monorepo structure
2. **SARIF Generation**: Fixed Snyk scan to properly generate SARIF files for security reporting
3. **Test Stability**: Improved test execution with proper flags and serial mode for backend tests
4. **Build Artifacts**: Fixed artifact paths to match NX build output structure
5. **Error Handling**: Added proper error handling and conditional uploads

### Security Enhancements

- Alpine base image verification for container security
- Non-root user validation (UID 1001)
- Proper SARIF file generation for vulnerability reporting
- Conditional uploads to prevent missing file errors
- Container security best practices validation
