# CLAUDE.md - VisAPI Project Guide

Essential information for working with the VisAPI project. Updated: July 18, 2025

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
- ✅ Dependencies updated to latest stable versions (NX 21.2, NestJS 11.1, PostgreSQL 16, Redis 8)
- ✅ Complete frontend dashboard with real-time API integration and auto-refresh (Sprint 5)
- ✅ Enterprise email system with branded templates and Resend integration (Sprint 5)
- ✅ Magic link authentication with custom domain routing through api.visanet.app (Sprint 5)

## Project Structure

```
VisAPI/
├── apps/
│   ├── frontend/          # Next.js 14 admin dashboard (Vercel)
│   └── backend/           # NestJS API gateway (Render)
├── libs/                  # NX shared libraries (9 specialized libraries)
│   ├── frontend/          # Frontend-specific libraries
│   │   ├── data-access/   # API clients and React hooks
│   │   └── ui-components/ # Reusable UI components
│   ├── backend/           # Backend-specific libraries
│   │   ├── core-cgb/      # WhatsApp CGB API integration
│   │   ├── core-config/   # Configuration management
│   │   ├── core-supabase/ # Database and storage services
│   │   ├── email-service/ # Email templates and Resend integration
│   │   ├── logging/       # Structured logging with PII redaction
│   │   └── util-redis/    # Redis utilities and idempotency
│   └── shared/            # Cross-platform shared libraries
│       ├── types/         # TypeScript type definitions
│       └── utils/         # Common utility functions
├── packages/
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

- Next.js 15 with App Router
- TypeScript 5.8, Tailwind CSS 4.1, shadcn/ui components
- Supabase Auth (Magic Link) with role-based access control
- Real-time dashboard with Recharts data visualization
- Dark/light mode with system preference detection
- Deployed on Vercel

**Backend** (api.visanet.app)

- NestJS 11.1 with TypeScript
- BullMQ + Redis 8 (Upstash)
- PostgreSQL 16 (Supabase)
- Deployed on Render

**Infrastructure**

- NX 21.2 Monorepo + pnpm 10.13
- Docker for local dev (PostgreSQL 16, Redis 8)
- GitHub Actions CI/CD with security scanning
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
- **PostgreSQL 16:** localhost:5432
- **Redis 8:** localhost:6379

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
POST /api/v1/email/auth-hook    # Supabase auth email webhook
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

## Email System

### Enterprise Email Infrastructure

VisAPI features a complete enterprise email system with branded templates and Resend integration for all authentication and transactional emails.

**Email Service (`@visapi/email-service`):**
- **Branded Templates**: Magic link, welcome, password reset, and email verification templates
- **Resend SDK**: Direct integration with `resend` Node.js package for reliable delivery
- **Template Engine**: Dynamic email generation with user data and secure URLs
- **Error Handling**: Comprehensive error handling with typed responses and logging
- **Webhook Processing**: Supabase auth hook handler for intercepting default emails
- **Custom Domain Routing**: All auth links use api.visanet.app for better control
- **Token Exchange**: Server-side token verification with `/api/v1/auth/confirm` endpoint

**Email Templates:**
```typescript
// Available templates with VisAPI branding
generateMagicLinkEmail()       // Passwordless authentication
generateWelcomeEmail()         // New user onboarding
generatePasswordResetEmail()   // Secure password recovery
generateEmailVerificationEmail() // Account confirmation
```

**Configuration:**
```bash
# Required environment variables
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=VisAPI <noreply@visanet.app>
```

**Authentication Email Flow:**
1. User triggers auth action (signup, login, password reset)
2. Supabase sends webhook to `/api/v1/email/auth-hook`
3. Email service processes webhook and selects appropriate template
4. Branded email sent via Resend with magic link URL pointing to api.visanet.app
5. User clicks magic link which hits `/api/v1/auth/confirm` endpoint
6. Backend exchanges token_hash with Supabase using `auth.verifyOtp()`
7. User redirected to frontend with session tokens in URL params
8. Frontend establishes authenticated session

**Production Ready:**
- Email templates tested across major email clients
- Error recovery with detailed logging
- Rate limiting and delivery monitoring
- Production environment configured with API keys

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
4. **Email System:** Enterprise email service with Resend SDK and branded templates
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

**Library Import Issues**

```bash
# Check NX library paths are configured correctly
cat apps/frontend/tsconfig.json | grep -A 10 "paths"

# Verify library builds
pnpm nx build types
pnpm nx build frontend-data
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

**Current Status: Production Live & Stable, Sprint 5 Week 1-3 Complete, Magic Link Authentication Operational**

VisAPI is a complete, enterprise-grade workflow automation system. All planned features from Sprints 0 through 4 are fully implemented, tested, and deployed to production. Sprint 5 (Frontend Excellence) has achieved all major milestones:
- Week 1: Authentication system with magic links ✅
- Week 2: Premium dashboard UI with real-time data ✅  
- Week 3: Email integration with branded templates ✅ (100% - magic links fully implemented)
- Week 4: Comprehensive testing coverage (upcoming)

The system is production-ready with all infrastructure deployed and operational, including custom domain magic link authentication.

**Key Milestones Achieved:**

- **Core Platform**: Robust foundation with an NX monorepo, NestJS backend, Next.js frontend, and comprehensive CI/CD pipeline with GitHub Actions.
- **Infrastructure as Code**: Complete Terraform automation for all cloud resources (Render, Vercel, Upstash, Supabase).
- **Secure Architecture**: Secure-by-design, featuring shared libraries, prefix/secret API key authentication, Row-Level Security, and multi-layer security scanning.
- **Monitoring & Observability**: Enterprise-grade monitoring with Grafana Cloud dashboards, Prometheus metrics, and real-time alerting system.
- **Enterprise Dashboard**: World-class admin dashboard with real-time API integration, Recharts data visualization, dark mode support, and role-based access control.
- **Email System**: Complete enterprise email infrastructure with branded templates, Resend SDK integration, and Supabase auth webhook processing.
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

1.  **Always check the current sprint status** in `tasks/sprint-5-frontend-auth-dashboard.md`
2.  **Follow the established patterns** in existing code
3.  **Update documentation** when making architectural changes
4.  **Test locally** using `pnpm dev` before pushing changes
5.  **Use the TodoWrite tool** for complex multi-step tasks
6.  **Check environment variables** in `.env.example` for requirements
7.  **Follow security guidelines** - never commit secrets
8.  **Use NX commands** for generating new components/services
9.  **Keep CLAUDE.md updated** with important project changes

### Email System Development Notes:

- **Email Service**: Use `@visapi/email-service` library for all email operations
- **Templates**: All email templates are in `libs/backend/email-service/src/lib/`
- **Testing**: Use `POST /api/v1/email/test` endpoint to test email delivery
- **Configuration**: Email settings configured in `libs/backend/core-config/src/lib/configuration.ts`
- **Webhook**: Supabase auth emails processed via `/api/v1/email/auth-hook`

### Code Quality Reminders:

- Run `pnpm test:backend:serial` to verify all tests pass
- Use `pnpm lint:backend` and `pnpm lint:frontend` for project-specific linting
- Check TypeScript compilation with `pnpm build:backend`
- Use descriptive variable and function names
- Follow the established project structure
- Document complex business logic
- Prefer composition over inheritance
- Use dependency injection in NestJS
- Follow React best practices in Next.js

### Common Fixes:

1. **NestJS API Path Versioning**: Controllers must use `@Controller('v1/resource')` not `@Controller('api/v1/resource')` (app has global 'api' prefix)
2. **Next.js 15 useSearchParams**: Must wrap components using `useSearchParams()` in `<Suspense>` boundaries
3. **Test Mocks**: Ensure test mocks match actual controller implementation (e.g., `req.userRecord.id`)
4. **Health Endpoints**: Ensure app.module.ts imports correct controller (`./app.controller` not `../app.controller`)
5. **Email Domains**: Resend requires verified domains - use @visanet.app not @visapi.app
6. **Supabase Auth Methods**: Use `auth.verifyOtp()` directly, not `auth.admin.verifyOtp()` (admin namespace doesn't have verifyOtp)

### Known Issues (Non-Critical):

1. **TypeScript Linting**: ~315 backend and ~42 frontend strict mode violations remaining
2. **Lighthouse CI in GitHub Actions**: Temporarily disabled due to Next.js 15 compatibility  
3. **NX Peer Dependencies**: Minor @nx/linter version mismatch - non-blocking

---

**Last Updated:** July 18, 2025
**Version:** v1.0.0 - Production Ready
**Status:** Sprints 0-4 completed, Sprint 5 Week 1-3 completed (100% - magic link authentication operational) - Production stable
