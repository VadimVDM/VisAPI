# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within VisAPI, please send an email to security@visanet.app. All security vulnerabilities will be promptly addressed.

Please include the following information:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

## Security Measures

### 1. Dependency Scanning

- **Dependabot**: Automatic dependency updates for npm, Docker, GitHub Actions, and Terraform
- **Snyk**: Daily vulnerability scanning with high-severity threshold
- **License Compliance**: Automated checks for approved licenses (MIT, Apache-2.0, BSD, ISC)

### 2. Container Security

- **Trivy**: Container vulnerability scanning in CI/CD pipeline
- **Distroless Images**: Production containers use minimal attack surface
- **Non-root User**: All containers run as non-privileged users

### 3. Code Security

- **CodeQL**: Static analysis for JavaScript and TypeScript
- **TruffleHog**: Secret scanning to prevent credential leaks
- **SBOM Generation**: Software Bill of Materials for supply chain security

### 4. Infrastructure Security

- **Terraform**: Infrastructure as Code with state encryption
- **TLS/HTTPS**: All external communications encrypted
- **API Key Rotation**: 90-day rotation policy with bcrypt hashing
- **Row-Level Security**: Database access controls

### 5. Runtime Security

- **Rate Limiting**: 200 requests/minute burst protection
- **Helmet.js**: Security headers for API responses
- **Input Validation**: AJV schema validation on all inputs
- **PII Redaction**: Automatic removal of sensitive data from logs

## Security Checklist

Before each release, ensure:

- [ ] All dependencies are up to date
- [ ] No critical or high vulnerabilities in scan results
- [ ] Secrets are properly managed (environment variables only)
- [ ] Database queries use parameterized statements
- [ ] Input validation is applied to all endpoints
- [ ] CORS is properly configured
- [ ] Error messages don't leak sensitive information
- [ ] API keys follow rotation schedule

## Incident Response

1. **Identify**: Detect and determine the scope of the incident
2. **Contain**: Isolate affected systems to prevent spread
3. **Investigate**: Determine root cause and impact
4. **Remediate**: Fix vulnerabilities and patch systems
5. **Recover**: Restore normal operations
6. **Review**: Post-incident analysis and improvements

## Contact

- Security Team: security@visanet.app
- Emergency: Use Slack channel #security-incidents
- Bug Bounty: See https://visanet.app/security/bug-bounty
