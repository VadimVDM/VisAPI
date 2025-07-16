# Container Hardening Documentation

## Overview

This document describes the container hardening measures implemented and verified in the VisAPI production environment as part of Sprint 4 security improvements.

## Container Security Enhancements

### 1. Distroless Base Image Migration

**Previous Configuration:**
```dockerfile
FROM node:20-alpine AS runner
```

**New Configuration:**
```dockerfile
FROM gcr.io/distroless/nodejs20-debian11 AS runner
```

**Benefits:**
- Reduced attack surface by eliminating shell, package managers, and unnecessary binaries
- Smaller image size and faster startup times
- Compliance with security best practices
- Reduced vulnerability exposure

### 2. Multi-Stage Build Optimization

**Build Stages:**
1. **base**: Node.js Alpine with build tools and Puppeteer dependencies
2. **deps**: Dependency installation stage
3. **builder**: Application build stage
4. **runner**: Distroless runtime stage

**Security Features:**
- Non-root user execution (UID 1001)
- Minimal runtime dependencies
- Proper file permissions and ownership
- Environment variable hardening

### 3. Enhanced CI/CD Security Scanning

**Trivy Security Scanning:**
- Fails CI on CRITICAL and HIGH severity vulnerabilities
- Generates SARIF reports for security analysis
- Validates distroless base image usage
- Checks container security best practices

**Container SBOM Generation:**
- Generates Software Bill of Materials for containers
- Tracks container dependencies and versions
- Supports vulnerability tracking and compliance

**Security Validation Checks:**
- Verifies non-root user configuration
- Validates minimal layer count
- Confirms distroless base image usage
- Checks security configuration compliance

## Implementation Details

### Dockerfile Changes

The worker Dockerfile has been updated with the following key changes:

1. **Distroless Runtime**: Final stage uses `gcr.io/distroless/nodejs20-debian11`
2. **Chromium Dependencies**: Copied from Alpine build stage for Puppeteer support
3. **Security Headers**: Proper USER directive and file permissions
4. **Environment Variables**: Hardened configuration with minimal exposure

### CI/CD Pipeline Updates

The security workflow (`.github/workflows/security.yml`) now includes:

1. **Enhanced Container Scanning**: Additional validation steps
2. **SBOM Generation**: Container-specific Software Bill of Materials
3. **Security Best Practices**: Automated verification of hardening measures
4. **Distroless Validation**: Confirms distroless base image usage

## Testing and Validation

### Local Testing

```bash
# Build the hardened container
docker build -t visapi-worker:hardened -f worker/Dockerfile .

# Verify distroless base image
docker history visapi-worker:hardened | grep distroless

# Check user configuration
docker inspect visapi-worker:hardened | jq '.[]|.Config.User'

# Run security scan
trivy image visapi-worker:hardened --severity CRITICAL,HIGH
```

### CI/CD Testing

The security workflow automatically validates:
- Container vulnerability scanning with Trivy
- Distroless base image verification
- Non-root user configuration
- Security best practices compliance
- SBOM generation and upload

## Security Benefits

### Attack Surface Reduction
- **Before**: Full Alpine Linux with shell, package managers, and utilities
- **After**: Minimal distroless image with only Node.js runtime and application code

### Vulnerability Exposure
- **Before**: Potential vulnerabilities in Alpine packages and utilities
- **After**: Reduced vulnerability surface with minimal runtime dependencies

### Compliance
- **Security Standards**: Meets container security best practices
- **Audit Trail**: Complete SBOM and vulnerability tracking
- **Governance**: Automated security validation in CI/CD

## Monitoring and Alerting

### Security Metrics
- Container vulnerability counts
- Base image update frequency
- Security scan results trending
- Container runtime anomalies

### Alerts
- Critical/High vulnerabilities detected
- Security scan failures
- Container hardening validation failures
- SBOM generation issues

## Maintenance

### Base Image Updates
- Monitor Google's distroless image releases
- Update base image versions in Dockerfile
- Test compatibility with application dependencies
- Validate security improvements

### Security Scanning
- Daily automated vulnerability scans
- Weekly security report generation
- Monthly security review and updates
- Quarterly security audit

## Troubleshooting

### Common Issues

1. **Chromium Dependencies Missing**
   - Ensure all Chromium libraries are copied from Alpine build stage
   - Verify font and library paths are correct
   - Check environment variables for Puppeteer

2. **Permission Issues**
   - Verify USER directive uses UID 1001
   - Check file ownership in COPY commands
   - Ensure proper permissions on copied files

3. **Security Scan Failures**
   - Review Trivy scan results for specific vulnerabilities
   - Update base images if vulnerabilities are in base layers
   - Check if vulnerabilities are in application dependencies

### Debugging

```bash
# Check container layers
docker history visapi-worker:hardened

# Inspect container configuration
docker inspect visapi-worker:hardened

# Note: Interactive debugging with a shell is not possible with distroless images by design.
```

## Post-Implementation Status

- **Production Deployment**: Hardened containers have been successfully deployed and are running in the production environment.
- **Monitoring**: Security monitoring and alerting for container security are active.
- **Documentation**: Operational runbooks have been updated with relevant security procedures.
- **Team Training**: The development team has been briefed on container security best practices.

## References

- [Google Distroless Images](https://github.com/GoogleContainerTools/distroless)
- [Container Security Best Practices](https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/)
- [Trivy Security Scanner](https://aquasecurity.github.io/trivy/)
- [Container SBOM Generation](https://anchore.com/sbom/)

---

**Last Updated**: July 17, 2025
**Version**: Sprint 4 Container Hardening
**Status**: Completed and Verified in Production