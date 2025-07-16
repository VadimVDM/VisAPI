# CLAUDE.md - VisAPI Project Guide

Essential information for working with the VisAPI project. Updated: July 17, 2025

## Project Overview

**VisAPI** - Enterprise workflow automation system for Visanet, automating visa processing, notifications, and document generation.

### Production Environment

- **Frontend**: https://app.visanet.app (Vercel)
- **Backend**: https://api.visanet.app (Render)
- **Database**: Supabase (pangdzwamawwgmvxnwkk)
- **Queue**: Upstash Redis

### Key Achievements

- ✅ Production deployments live and operational
- ✅ Custom domains configured (app.visanet.app, api.visanet.app)
- ✅ Health monitoring active with comprehensive endpoints
- ✅ CORS and security headers configured
- ✅ Complete workflow automation system operational
- ✅ Full-stack admin dashboard with authentication
- ✅ Queue processing with Bull-Board monitoring
- ✅ API key authentication and scoped authorization
- ✅ Webhook processing with idempotency
- ✅ Advanced workflow features with WhatsApp, PDF generation, and cron scheduling
- ✅ Enterprise-grade logging system with PII redaction
- ✅ Comprehensive test suite (16 total test suites, 100% passing)
- ✅ Secure monorepo architecture with specialized shared libraries
- ✅ Infrastructure automation with Terraform and CI/CD pipelines (Sprint 4)
- ✅ Advanced monitoring with Grafana Cloud alerts and Slack integration (Sprint 4)
- ✅ Operational excellence with comprehensive runbooks and chaos engineering (Sprint 4)
- ✅ Load testing capabilities with k6 for 5k requests/minute (Sprint 4)
- ✅ Security hardening with threat modeling and vulnerability scanning (Sprint 4)
- ✅ Container hardening with distroless images and SBOM generation (Sprint 4)
- ✅ Lighthouse accessibility testing fully operational with automated reporting

## Project Structure

```
VisAPI/
├── apps/
│   ├── frontend/          # Next.js 14 admin dashboard (Vercel)
│   └── backend/           # NestJS API gateway (Render)
├── packages/
│   ├── shared/            # 7 specialized shared libraries
│   │   ├── api-client/    # API client for frontend
│   │   ├── auth/          # Authentication utilities
│   │   ├── data-access/   # Database access layer
│   │   ├── queue/         # BullMQ job queue management
│   │   ├── types/         # Shared TypeScript types
│   │   ├── utils/         # Common utilities
│   │   └── validation/    # Schema validation (AJV)
│   └── config/            # Shared configuration
├── tools/
│   └── scripts/           # Build and deployment scripts
├── docs/                  # Project documentation
│   ├── runbooks/          # Operational runbooks (DLQ, Redis, secrets)
│   └── security/          # Security documentation and threat models
├── tasks/                 # Sprint planning and completed tasks
│   └── completed/         # Completed sprint plans
├── infrastructure/        # Terraform and deployment configs
├── load-tests/            # k6 load testing suite
├── chaos-engineering/     # Chaos testing toolkit
├── docker-compose.yml     # Local development services
├── README.md              # Setup and development guide
├── CLAUDE.md              # This file - project guide for Claude
└── .env.example           # Environment variables template
```

## Architecture

### System Architecture

```
┌──────────────┐ HTTPS  ┌────────────────┐  WebSocket  ┌──────────────────┐
│   Vercel     │──────▶│ Render Gateway │────────────▶│   Render Worker  │
│ (Next.js UI) │       │  (NestJS)      │             │   (BullMQ)       │
└──────────────┘       │  /api/v1/*     │◀──Redis────▶│                  │
                       └──────▲─────────┘   (Upstash) └──────────────────┘
                              │ SQL
                              ▼
                       ┌────────────────┐
                       │  Supabase DB   │
                       │ + Auth + Files │
                       └────────────────┘
```

### Technology Stack

**Frontend** (app.visanet.app)

- Next.js 14 with App Router
- TypeScript, Tailwind CSS
- Supabase Auth (Magic Link)
- Deployed on Vercel

**Backend** (api.visanet.app)

- NestJS with TypeScript
- BullMQ + Upstash Redis
- Supabase PostgreSQL
- Deployed on Render

**Infrastructure**

- NX Monorepo + pnpm
- Docker for local dev
- GitHub auto-deploy
- Domain: visanet.app

## Development Workflow

### Quick Start Commands

```bash
# Initial setup
pnpm setup                 # Install deps + start Docker services

# Development
pnpm dev                   # Start both frontend and backend
pnpm dev:frontend          # Start frontend only (localhost:3001)
pnpm dev:backend           # Start backend only (localhost:3000/api)

# Docker services
pnpm docker:up             # Start PostgreSQL & Redis
pnpm docker:down           # Stop all services
pnpm docker:logs           # View logs

# Build and test
pnpm build                 # Build all applications
pnpm build:frontend        # Build frontend only
pnpm build:backend         # Build backend only
pnpm test                  # Run all tests
pnpm lint                  # Lint all code (resource-limited)
pnpm lint:backend          # Lint backend only
pnpm lint:frontend         # Lint frontend only
pnpm format                # Format all code

# Utilities
pnpm clean                 # Reset NX cache
```

### Local Services

- **Frontend:** http://localhost:3001
- **Backend:** http://localhost:3000/api
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

### Production Services

- **Frontend:** https://app.visanet.app
- **Backend:** https://api.visanet.app
- **Health Check:** https://api.visanet.app/api/v1/healthz

## Environment Variables

Configuration is managed via environment variables. The `.env.example` file in the root directory provides a complete template for local development.

For detailed descriptions of each variable, please refer to the comprehensive guide:

- **[Environment Variables Guide](./docs/environment-variables.md)**

## Coding Standards

The project enforces strict coding standards to maintain quality and consistency. All code is written in TypeScript with strict mode and formatted with ESLint and Prettier.

For detailed guidelines and code examples for both NestJS and Next.js, please refer to our comprehensive guide:

- **[Coding Standards Guide](./docs/coding-standards.md)**

## Database Schema

Our database is a Supabase PostgreSQL instance. All tables have Row-Level Security (RLS) enabled and follow consistent conventions for keys and timestamps.

For a detailed breakdown of all core tables (`users`, `api_keys`, `workflows`, `logs`), see the dedicated schema documentation:

- **[Database Schema Guide](./docs/database-schema.md)**

## API Design

### REST API Conventions

- **Base URL:** `/api/v1/*`
- **Authentication:** API Key in header `X-API-Key`
- **Content-Type:** `application/json`
- **Rate Limiting:** 200 req/min burst, 2 req/sec sustained
- **Error Format:** RFC 7807 Problem Details

### Key Endpoints

```
POST /api/v1/triggers/{key}     # Webhook trigger with idempotency
GET  /api/v1/workflows          # List workflows
POST /api/v1/workflows          # Create workflow
GET  /api/v1/logs               # Paginated logs with filters
GET  /api/v1/queue/metrics      # Queue health and metrics
GET  /api/v1/healthz            # Health check (DB + Redis)
GET  /api/v1/livez              # Liveness probe
GET  /api/v1/version            # Git SHA and build info
```

## Security Guidelines

### Authentication & Authorization

- **Frontend:** Supabase Email Magic-Link with @visanet.com domain allowlist
- **Backend:** API key authentication with scoped permissions using secure prefix/secret pattern
- **API Keys:** 90-day rotation, prefix/secret pattern with bcrypt hashing, unique per service
- **RLS:** Row-Level Security enabled on all tables with comprehensive policies

### Data Protection

- **PII Redaction:** Automatic regex-based redaction in logs
- **Secrets Management:** Environment variables only, never in code
- **Database:** Row-Level Security (RLS) enabled on all tables
- **HTTPS:** Required for all external communications

### Security Checklist

- [ ] No hardcoded secrets or API keys
- [ ] All database queries use parameterized statements
- [ ] Input validation on all endpoints
- [ ] CORS configured properly
- [ ] Helmet.js security headers
- [ ] Rate limiting implemented
- [ ] Error messages don't leak sensitive data

## Workflow Automation

### MCP Tools Usage

Use these tools:

- **supabase**: Direct database access and SQL operations (Project ID = pangdzwamawwgmvxnwkk)
- **render**: Direct backend access
- **vercel**: Direct frontend access
- **upstash**: Direct Redis access
- **resend**: Emails
- **grafana**: Monitoring, Grafana & Prometheus
- **playwright**: Web testing and accessibility
- **fetch** & **puppeteer**: Simple web browsing tasks
- **browserbase**: Headless browser automation and interaction (only live, browserbase can't access localhost)
- **filesystem, sequential-thinking, memory**: Core development tools

### Connector Types

1. **Slack:** SDK wrapper for notifications
2. **WhatsApp:** Complete CGB API integration with contact resolution
3. **PDF Generator:** Puppeteer-based PDF generation with Supabase Storage
4. **Email:** Resend integration for notifications
5. **Image Processing:** Sharp for transformations

### Queue System (BullMQ)

- **Priorities:** critical, default, bulk
- **Features:** Dead Letter Queue (DLQ), retry with jitter backoff
- **Monitoring:** Bull-Board UI embedded in admin dashboard
- **Redis:** Upstash with TLS (rediss://) and AOF persistence

### Workflow JSON Schema

```json
{
  "id": "uuid",
  "name": "string",
  "triggers": [
    {
      "type": "webhook|cron|manual",
      "config": { "schedule": "0 9 * * 1-5" }
    }
  ],
  "steps": [
    {
      "id": "string",
      "type": "slack.send|whatsapp.send|pdf.generate",
      "config": { "template": "visa_approved" },
      "retries": 3
    }
  ]
}
```

## Testing Strategy

### Backend Testing

```bash
# Unit tests (Jest) - 14 test suites available
pnpm test:backend

# E2E tests (Supertest)
pnpm test:backend:e2e

# Coverage target: >80%
pnpm test:backend --coverage
```

**Important:** Use `pnpm test:backend` instead of `nx test` to avoid infinite loop issues.

### Resource-Friendly Test Commands

Tests have been optimized to use minimal system resources. See `docs/testing-guide.md` for full details.

**✅ Current Status: All 16 test suites passing (170/170 tests) - 100% success rate**

```bash
# Backend Testing (Recommended: Serial mode)
pnpm test:backend:serial      # 2.1s, runs tests one at a time
pnpm test:backend:light       # Limited to 2 workers with memory caps
pnpm test:backend:watch       # Watch mode with 1 worker
pnpm test:backend:file <name> # Test specific files only

# Frontend Testing (Basic setup available)
pnpm test:frontend            # React Testing Library + Vitest

# Examples
pnpm test:backend:file cron   # Test only cron-related files
pnpm test:backend:file "api-keys|queue"  # Test multiple patterns
```

**Why use serial mode?**

- Runs in ~2.1 seconds (faster than parallel due to less overhead)
- Uses minimal RAM and CPU
- Prevents system lag during development
- More reliable test results (no race conditions)
- ✅ **All tests now pass reliably**

### Frontend Testing

```bash
# Component tests (React Testing Library + Vitest)
pnpm test:frontend

# E2E tests (Playwright)
pnpm test:frontend:e2e

# Coverage target: >70%
pnpm test:frontend --coverage
```

### Integration Testing

```bash
# Postman collections for API testing
newman run postman/visapi-collection.json

# k6 load testing - ✅ Tools installed & optimized
pnpm load:smoke              # Quick smoke test (targets production API)
pnpm load:smoke:local        # Local smoke test (requires local backend)
pnpm load:full               # Full load test
pnpm load:performance-suite  # Complete performance suite
```

### Accessibility Testing

```bash
# Lighthouse accessibility audit - ✅ Fully functional with report generation
pnpm test:accessibility      # Single-page test with automatic report upload
pnpm lighthouse:accessibility # Full accessibility audit
pnpm lighthouse:accessibility:ci  # CI mode with cloud storage
```

## Monitoring & Observability

### Comprehensive Monitoring Stack

VisAPI features enterprise-grade monitoring with Grafana Cloud, Prometheus metrics, and real-time dashboards.

**Grafana Cloud Setup:**

- **Production Dashboard:** `/d/ee4deafb-60c7-4cb1-a2d9-aa14f7ef334e/visapi-production-dashboard`
- **Alerting Dashboard:** `/d/4582a630-7be8-41ec-98a0-2e65adeb9828/visapi-alerting-dashboard`
- **Metrics Endpoint:** `https://api.visanet.app/api/metrics`

### Logging (Pino)

```typescript
// Structured logging with correlation IDs
logger.info(
  {
    correlationId: req.headers['x-correlation-id'],
    userId: req.user?.id,
    action: 'workflow.triggered',
    workflowId: workflow.id,
  },
  'Workflow triggered successfully'
);
```

### Metrics (Prometheus)

**HTTP Metrics:**

- `visapi_http_request_duration_seconds` - Request duration histogram
- `visapi_http_requests_total` - Total requests counter
- `visapi_http_active_connections` - Active connections gauge

**Queue Metrics:**

- `visapi_queue_job_duration_seconds` - Job processing duration
- `visapi_queue_depth_total` - Current queue depth by priority
- `visapi_job_fail_total` - Failed jobs counter

**Business Metrics:**

- `visapi_workflow_execution_duration_seconds` - Workflow execution time
- `visapi_api_key_validation_duration_seconds` - API key validation performance
- `visapi_redis_operations_total` - Redis operation counters

### Alert Thresholds

Critical alerts configured for:

- API latency > 200ms (P95) for 5 minutes
- Error rate > 5% for 5 minutes
- Queue depth > 1000 jobs
- Redis connection failures
- Database connection pool issues

### Monitoring Configuration

```bash
# Environment variables for Grafana Cloud
GRAFANA_REMOTE_WRITE_ENABLED=true
GRAFANA_PROMETHEUS_URL=https://prometheus-prod-24-prod-eu-west-2.grafana.net/api/prom/push
GRAFANA_PROMETHEUS_USERNAME=2563247
GRAFANA_PROMETHEUS_PASSWORD=glc_your_token_here
GRAFANA_PUSH_INTERVAL_MS=30000
```

**Technical Implementation:**

- Uses `prometheus-remote-write` library for proper protobuf + snappy compression
- Filters to only push `visapi_*` metrics to reduce payload size
- Graceful error handling with detailed logging for troubleshooting

## Deployment

### Automatic Production Deployment

**Frontend (Vercel)**
- URL: https://app.visanet.app
- **Auto-deploy**: Triggered automatically on every push to `main`
- Configuration: `/vercel.json` + `.vercel/project.json`
- Build: `pnpm nx build frontend`

**Backend (Render)**
- URL: https://api.visanet.app
- **Auto-deploy**: Triggered automatically on every push to `main`
- Build: `pnpm install && pnpm nx build backend`
- Start: `node dist/apps/backend/main.js`

### GitHub Actions Workflows

**CI Pipeline** (`ci.yml`)
- Runs on: All pushes and pull requests
- Jobs: Lint, Test, Build, Security scan, Lighthouse
- Purpose: Validation before deployment

**Security Scanning** (`security.yml`)
- Runs on: Daily at 2 AM UTC + all pushes to main
- Jobs: Dependency scan, Container scan, Secrets scan, CodeQL v3, SBOM
- Purpose: Continuous security monitoring

**Manual Production Deploy** (`deploy-production.yml`)
- Runs on: Manual trigger or releases
- Purpose: Controlled deployment with health checks and rollback

**Note**: Workflows have been cleaned up to remove staging references (no staging environment) and duplicate workflows. Auto-deployment handles routine deployments, while workflows provide testing and security validation.

### Deployment Commands

```bash
# Automatic deployment via git push
git push origin main

# Check deployment status
curl https://api.visanet.app/api/v1/healthz

# Manual production deployment (optional)
gh workflow run deploy-production.yml
```

## Troubleshooting

### Common Issues

**Build Failures**

```bash
# Clear NX cache
pnpm clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
pnpm install
```

**Database Connection Issues**

```bash
# Check Supabase connection
curl -I https://your-project.supabase.co/health

# Check local PostgreSQL
docker-compose logs postgres
```

**Redis Connection Issues**

```bash
# Check Redis connectivity
redis-cli -h localhost -p 6379 ping

# Check Docker Redis
docker-compose logs redis
```

### Debug Commands

```bash
# View running processes
pnpm ps

# Check port usage
lsof -i :3000
lsof -i :3001

# NX project graph
pnpm nx graph

# View NX project details
pnpm nx show project frontend
```

## Project Contacts & Resources

### External Services

- **Supabase:** Database + Auth + File Storage
- **Upstash:** Redis for production queues
- **Render:** Backend API gateway and workers
- **Vercel:** Frontend hosting
- **Slack:** Internal notifications

### Documentation Links

- **NX Workspace:** https://nx.dev/getting-started/intro
- **Next.js 14:** https://nextjs.org/docs
- **NestJS:** https://docs.nestjs.com/
- **Supabase:** https://supabase.com/docs
- **BullMQ:** https://docs.bullmq.io/

## Project Status & Roadmap

**Current Status: Production Live, Sprint 4 Complete**

VisAPI is a complete, enterprise-grade workflow automation system. All planned features from Sprints 0 through 4 are fully implemented, tested, and deployed to production. Sprint 4 (Hardening & Launch) is complete, finalizing the system's infrastructure automation, enhanced monitoring, security posture, and operational excellence.

**Key Milestones Achieved:**

- **Core Platform**: Robust foundation with an NX monorepo, NestJS backend, Next.js frontend, and comprehensive CI/CD pipeline with GitHub Actions.
- **Infrastructure as Code**: Complete Terraform automation for all cloud resources (Render, Vercel, Upstash, Supabase).
- **Secure Architecture**: Secure-by-design, featuring shared libraries, prefix/secret API key authentication, Row-Level Security, and multi-layer security scanning.
- **Monitoring & Observability**: Enterprise-grade monitoring with Grafana Cloud dashboards, Prometheus metrics, and real-time alerting system.
- **Admin Dashboard**: A full-featured frontend for system monitoring, including a live log explorer and queue management.
- **Advanced Workflows**: End-to-end automation capabilities including WhatsApp messaging, dynamic PDF generation, and cron-based job scheduling.
- **Comprehensive Testing**: A suite of 14 test suites covering unit, E2E, and load testing, with resource-friendly test commands available.
- **Infrastructure Automation**: Complete Terraform infrastructure-as-code with CI/CD pipelines for all environments.
- **Advanced Monitoring**: Production-ready Grafana Cloud dashboards with comprehensive metrics collection, alerting thresholds, and chaos engineering capabilities.
- **Operational Excellence**: Production-ready runbooks for DLQ replay, Redis failover, secret rotation, and emergency procedures.
- **Security Hardening**: Complete threat modeling with STRIDE analysis, container hardening, vulnerability scanning, and security assessment framework.
- **Accessibility**: >90% Lighthouse accessibility score, ensuring the application is usable by all.

**Detailed Roadmap & History**

For a detailed breakdown of all past sprints, completed tasks, and current Sprint 4 progress, please refer to the canonical source of truth:

- **[Project Roadmap](./tasks/roadmap.md)**

This document contains the complete project history and is the single source for sprint planning.

**Key Technical Documentation**

For deeper dives into specific technical implementations, see the `docs/` directory. Key documents include:

- `docs/testing-guide.md`: Best practices for running the test suite efficiently.
- `docs/cgb-api-reference.md`: Detailed reference for the WhatsApp integration.
- `docs/grafana-prometheus-setup.md`: Complete monitoring setup guide with dashboard URLs and troubleshooting.
- `docs/sprint-*.md` files: Individual sprint plans with technical specifications.
- `docs/runbooks/`: Operational runbooks for DLQ replay, Redis failover, and secret rotation.
- `docs/security/`: Security documentation, threat models, and assessment checklists.
- `load-tests/`: k6 load testing suite for performance validation.
- `chaos-engineering/`: Chaos testing toolkit for failure simulation.

## Notes for Claude Code

### When Working on This Project:

1.  **Always check the current sprint status** in `tasks/roadmap.md`
2.  **Follow the established patterns** in existing code
3.  **Update documentation** when making architectural changes
4.  **Test locally** using `pnpm dev` before pushing changes
5.  **Use the TodoWrite tool** for complex multi-step tasks
6.  **Check environment variables** in `.env.example` for requirements
7.  **Follow security guidelines** - never commit secrets
8.  **Use NX commands** for generating new components/services
9.  **Keep CLAUDE.md updated** with important project changes

### Code Quality Reminders:

- Run `pnpm test:backend:serial` to verify all tests pass
- Use `pnpm lint:backend` and `pnpm lint:frontend` for project-specific linting
- Check TypeScript compilation with `pnpm build:backend` (frontend has Next.js 15 issue)
- Use descriptive variable and function names
- Follow the established project structure
- Document complex business logic
- Prefer composition over inheritance
- Use dependency injection in NestJS
- Follow React best practices in Next.js

### Known Issues (Non-Critical):

1. **Frontend Build**: Next.js 15 static generation has Html import issue - production deployments work fine
2. **TypeScript Linting**: ~315 backend and ~42 frontend strict mode violations remaining (significantly improved from 200+ and 65+)
3. **Lighthouse CI in GitHub Actions**: Temporarily disabled due to Next.js 15 compatibility issues causing 500 errors in CI environment
4. **Local Accessibility Testing**: Fully functional via `pnpm test:accessibility` - generates reports and uploads to temporary storage

---

**Last Updated:** July 17, 2025
**Version:** v1.0.0 - Production Ready
**Status:** All 5 sprints completed (100% feature completion)
