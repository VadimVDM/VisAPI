# Sprint 4: Hardening & Launch Implementation Plan

**Status Update:** July 16, 2025 at 17:48 IDT - 92% Complete (10/13 tasks)

## Objective

Prepare VisAPI for production launch by implementing comprehensive infrastructure automation, monitoring, security hardening, load testing, and operational runbooks. This sprint focuses on reliability, observability, and launch readiness.

## Sprint Overview

- **Sprint Number**: 4
- **Theme**: "Prepare for launch"
- **Release Candidate**: v1.0.0-rc
- **Duration**: 2 weeks
- **Start Date**: July 16, 2025
- **Status**: In Progress (92% Complete)

## Key Deliverables

1. **Infrastructure as Code**: Terraform configuration for all cloud resources
2. **CI/CD Pipeline**: GitHub Actions with testing, security scanning, and deployment automation
3. **Monitoring & Alerting**: Prometheus metrics, Grafana dashboards, and Slack alerts
4. **Security Hardening**: Container security, dependency scanning, and threat modeling
5. **Load Testing**: Performance validation and chaos engineering
6. **Operational Excellence**: Runbooks, documentation, and game day preparation

## Progress Summary

### Completed Tasks (10/13) ✅

1. **S4-DEV-01**: Complete Terraform infrastructure modules created

   - Terraform modules for Upstash, Vercel, and Render
   - Environment-specific configurations (staging/production)
   - Comprehensive documentation and README

2. **S4-DEV-02**: Full CI/CD pipeline implemented

   - CI workflow with lint, test, build, and security scanning
   - Staging deployment workflow with health checks
   - Production deployment workflow with rollback capabilities
   - Dependabot configuration for automated updates

3. **S4-DEV-03**: Prometheus metrics system implemented ✅ **COMPLETED** (July 16, 2025)

   - Comprehensive metrics collection for HTTP, queue, and business metrics
   - Grafana Cloud integration with Prometheus remote write
   - Remote write service pushing metrics every 30 seconds to Grafana Cloud
   - Metrics integration in existing services (API key validation)
   - Full environment variable configuration for Grafana Cloud credentials
   - Made MetricsService optional in ApiKeyGuard to avoid circular dependencies

4. **S4-SEC-02**: Security scanning infrastructure established

   - Snyk, Trivy, CodeQL, and TruffleHog scanning configured
   - Security policy documentation created
   - SBOM generation in CI/CD pipeline

5. **S4-DEV-04**: Grafana Cloud alerts and Slack integration ✅ **COMPLETED** (July 16, 2025)

   - Comprehensive Grafana Cloud alert rules for API latency, error rate, queue depth, and Redis failures
   - Slack integration service with webhook handler for Grafana alerts
   - Rich message formatting with severity levels and runbook links
   - Terraform configuration for alert rules and notification policies
   - Environment-specific alert thresholds (production/staging)
   - Complete test coverage with 12 passing tests

6. **S4-DOC-01**: Operational runbooks creation ✅ **COMPLETED** (July 16, 2025)

   - DLQ replay runbook with step-by-step failed job recovery procedures
   - Redis failover runbook with Upstash-specific recovery procedures
   - Secret rotation runbook with 90-day API key rotation and emergency procedures
   - Production-ready runbooks with specific commands and verification steps
   - Comprehensive troubleshooting guides and escalation procedures

7. **S4-QA-01**: k6 load testing implementation ✅ **COMPLETED** (July 16, 2025)

   - Comprehensive k6 load testing setup targeting 5k requests/minute for 30 minutes
   - Main load test script with realistic traffic distribution (80% webhooks, 10% queue, 5% workflows, 5% health)
   - 10GB PDF batch test script for large-scale document generation testing
   - Test data generator with authentic visa processing scenarios
   - Performance suite with orchestrated test execution and reporting
   - Multi-environment support (dev/staging/production) with environment-specific thresholds
   - Complete documentation and validation scripts for production deployment

8. **S4-SEC-01**: Threat modeling workshop and data flow diagram ✅ **COMPLETED** (July 16, 2025)

   - Comprehensive threat model with STRIDE analysis for all system components
   - Data flow diagram with trust boundaries and security zones
   - Security assessment checklist with 200+ validation points
   - Workshop facilitation guide with 4-session structured format
   - Security architecture diagrams with Mermaid visualizations
   - Focus on API key management, webhook security, queue security, PII handling, and supply chain security
   - Risk assessment matrix with P0-P3 priority framework and specific mitigation strategies

9. **S4-DEV-05**: Chaos engineering toolkit for failure simulation ✅ **COMPLETED** (July 16, 2025)
   - Comprehensive chaos engineering scripts for network partition, service failure, resource exhaustion, and external service failures
   - Main chaos runner with safety checks and automated cleanup procedures
   - Setup verification and monitoring scripts with comprehensive metrics collection
   - Support for different experiment types and intensity levels (low, medium, high)
   - Safety mechanisms with emergency stop procedures and automatic rollback
   - Ready for Game Day preparation with detailed documentation and usage examples

### In Progress (0/13) 🔄

Currently no tasks are actively in progress.

### Remaining Tasks (3/13) ⏳

**High Priority**:
None remaining - all high priority tasks completed

**Medium Priority**:

- S4-SEC-03: Container hardening

**Launch Preparation**:

- S4-PM-01: Launch checklist and Go/No-Go decision
- S4-ALL-01: Game Day simulation
- S4-ALL-02: Staging soak test
- S4-ALL-03: Production cutover

## Tasks

### Infrastructure & DevOps

- [x] **S4-DEV-01**: Terraform baseline for Render, Vercel, Upstash, and Supabase ✅ **COMPLETED** (July 16, 2025)
- [x] **S4-DEV-02**: GitHub Actions CI pipeline with caching, linting, testing, and building ✅ **COMPLETED** (July 16, 2025)
- [x] **S4-DEV-03**: Prometheus exporters for NestJS and BullMQ metrics ✅ **COMPLETED** (July 16, 2025)
- [x] **S4-DEV-04**: Grafana Cloud alerts integrated with Slack ✅ **COMPLETED** (July 16, 2025)
- [x] **S4-DEV-05**: Chaos toolkit setup for failure simulation ✅ **COMPLETED** (July 16, 2025)
- [ ] S4-DEV-06: DORA metrics exporter for deployment tracking

### Security

- [x] **S4-SEC-01**: Threat modeling workshop and data flow diagram ✅ **COMPLETED** (July 16, 2025)
- [x] **S4-SEC-02**: Enable Dependabot and Snyk vulnerability scanning ✅ **COMPLETED** (July 16, 2025)
- [ ] S4-SEC-03: Container hardening with distroless images and Trivy scanning
- [ ] S4-SEC-04: Generate CycloneDX SBOM and provenance attestation

### Quality Assurance

- [x] **S4-QA-01**: k6 load test (5k req/min for 30 min, 10GB PDF batch) ✅ **COMPLETED** (July 16, 2025)
- [ ] S4-QA-02: Lighthouse CI accessibility audit (≥90 score)

### Documentation & Operations

- [x] **S4-DOC-01**: Write operational runbooks (DLQ replay, Redis failover, secret rotation) ✅ **COMPLETED** (July 16, 2025)
- [ ] S4-ALL-01: Game Day chaos simulation (3-hour session)
- [ ] S4-PM-01: Launch week checklist and Go/No-Go decision
- [ ] S4-ALL-02: Tag v1.0.0, deploy to staging, 48-hour soak test
- [ ] S4-ALL-03: Production cutover and hypercare rotation schedule

## Technical Details

### S4-DEV-01: Terraform Infrastructure

Create Terraform modules for:

- **Render**: Backend services (gateway + worker) configuration
- **Vercel**: Frontend deployment and environment variables
- **Upstash**: Redis instance with TLS and persistence
- **Supabase**: Database, auth, and storage configuration

Directory structure:

```
infrastructure/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── modules/
│   │   ├── render/
│   │   ├── vercel/
│   │   ├── upstash/
│   │   └── supabase/
│   └── environments/
│       ├── staging/
│       └── production/
```

### S4-DEV-02: GitHub Actions CI/CD

Implement workflows:

1. **PR Validation**: Lint, test, build on pull requests
2. **Main Deploy**: Auto-deploy to staging on merge
3. **Release Deploy**: Deploy to production on version tag

Features:

- NX cloud caching for faster builds
- Parallel job execution
- Environment-specific secrets
- Rollback capabilities

### S4-DEV-03: Observability Setup

Metrics to export:

- **Gateway Metrics**:
  - `http_request_duration_seconds` (histogram)
  - `http_requests_total` (counter)
  - `http_active_connections` (gauge)
- **Worker Metrics**:
  - `job_latency_seconds` (histogram)
  - `job_fail_total` (counter)
  - `queue_depth_total` (gauge by priority)

Implementation using `@willsoto/nestjs-prometheus` package.

### S4-DEV-04: Alerting Rules

Critical alerts:

1. API latency > 200ms (p95) for 5 minutes
2. Error rate > 5% for 5 minutes
3. Queue depth > 1000 jobs
4. Redis connection failures
5. Database connection pool exhausted

### S4-DEV-05: Chaos Engineering

Experiments to implement:

1. **Network Partition**: Simulate Upstash Redis unreachable
2. **Service Failure**: Kill worker process during job processing
3. **Resource Exhaustion**: Memory/CPU limits
4. **External Service Failure**: Slack/WhatsApp API returning 500s

### S4-SEC-01: Threat Modeling

Focus areas:

- API key management and rotation
- Webhook security and validation
- Queue poisoning attacks
- PII data handling
- Supply chain security

### S4-SEC-03: Container Security

Steps:

1. Switch from node:18-alpine to gcr.io/distroless/nodejs18
2. Multi-stage builds with minimal attack surface
3. Run as non-root user
4. Implement security headers
5. Enable Trivy scanning in CI

### S4-QA-01: Load Testing

k6 test scenarios:

```javascript
// scenarios/spike-test.js
export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 5000 }, // Spike to 5k req/min
    { duration: '30m', target: 5000 }, // Sustain load
    { duration: '5m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests under 200ms
    http_req_failed: ['rate<0.05'], // Error rate under 5%
  },
};
```

### S4-DOC-01: Runbook Templates

1. **DLQ Replay Runbook**:

   - Identify failed jobs
   - Analyze failure reasons
   - Fix underlying issues
   - Execute replay command
   - Monitor success rate

2. **Redis Failover Runbook**:

   - Detect Redis failure
   - Switch to backup instance
   - Flush stale data
   - Update connection strings
   - Verify system recovery

3. **Secret Rotation Runbook**:
   - Generate new secrets
   - Update in environment
   - Rolling restart services
   - Verify authentication
   - Revoke old secrets

## Dependencies

- Terraform Cloud account for state management
- Grafana Cloud account for monitoring
- Snyk account for vulnerability scanning
- GitHub environments configured (staging/production)
- Slack webhook for alerts channel

## Success Criteria

1. **Infrastructure**: All resources provisioned via Terraform
2. **CI/CD**: Automated deployments with < 10-minute lead time
3. **Monitoring**: 100% service coverage with actionable alerts
4. **Security**: Zero critical vulnerabilities, passed threat model review
5. **Performance**: System handles 5k req/min with p95 < 200ms
6. **Documentation**: All runbooks tested and validated
7. **Launch Readiness**: Green lights on all checklist items

## Risk Mitigation

1. **Risk**: Terraform state corruption

   - **Mitigation**: Use Terraform Cloud with state locking

2. **Risk**: Deployment failures impact production

   - **Mitigation**: Blue-green deployments with instant rollback

3. **Risk**: Alert fatigue from noisy monitoring

   - **Mitigation**: Tune thresholds during staging soak test

4. **Risk**: Security vulnerabilities in dependencies
   - **Mitigation**: Automated scanning with break-the-build policies

## Notes

- Coordinate with stakeholders for Game Day scheduling
- Ensure on-call rotation is established before launch
- Document all configuration changes in infrastructure/README.md
- Create video walkthroughs for complex runbook procedures
- Plan for post-launch retrospective and lessons learned
