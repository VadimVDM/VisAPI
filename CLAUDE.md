# CLAUDE.md - VisAPI Project Guide

Essential information for working with the VisAPI project. Updated: July 2025

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

## Project Structure

```
VisAPI/
├── apps/
│   ├── frontend/          # Next.js 14 admin dashboard (Vercel)
│   └── backend/           # NestJS API gateway (Render)
├── packages/
│   ├── shared/            # Shared utilities and types
│   └── config/            # Shared configuration
├── tools/
│   └── scripts/           # Build and deployment scripts
├── docs/                  # Project documentation
├── tasks/                 # Sprint planning and completed tasks
│   └── completed/         # Completed sprint plans
├── infrastructure/        # Terraform and deployment configs
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
pnpm lint                  # Lint all code
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

### Production Configuration

**Frontend (Vercel)**

```env
NEXT_PUBLIC_API_URL=https://api.visanet.app
NEXT_PUBLIC_SUPABASE_URL=https://pangdzwamawwgmvxnwkk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your_anon_key]
NEXT_PUBLIC_ENV=production
```

**Backend (Render)**

```env
NODE_ENV=production
DATABASE_URL=[supabase_connection_string]
REDIS_URL=[upstash_redis_url]
JWT_SECRET=[generated_secret]
CORS_ORIGIN=https://app.visanet.app
```

## Coding Standards

### General Rules

- **TypeScript:** Strict mode enabled across all projects
- **Code Style:** ESLint + Prettier configuration enforced
- **Testing:** >80% backend coverage, >70% frontend coverage
- **Comments:** Minimal comments, prefer descriptive names
- **Security:** Never commit secrets, API keys, or sensitive data

### NestJS Backend Standards

```typescript
// Use dependency injection
@Injectable()
export class MyService {
  constructor(private readonly logger: PinoLogger) {}
}

// Use DTOs for validation
export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

// Use guards for authentication
@UseGuards(ApiKeyGuard)
@Scopes('workflows:create')
@Post('workflows')
async createWorkflow(@Body() dto: CreateWorkflowDto) {}
```

### Next.js Frontend Standards

```typescript
// Use App Router file conventions
// app/page.tsx, app/layout.tsx, app/loading.tsx

// Use server/client components appropriately
'use client'; // Only when needed for interactivity

// Use TypeScript interfaces
interface User {
  id: string;
  email: string;
  role: 'viewer' | 'operator' | 'admin';
}

// Use React Query for data fetching
const { data, error, isLoading } = useQuery({
  queryKey: ['workflows'],
  queryFn: fetchWorkflows,
});
```

## Database Schema

### Core Tables (Supabase PostgreSQL)

**users**

```sql
- id: uuid (primary key)
- email: text (unique) -- DEPRECATED: Will be removed after auth.users integration
- role: enum ('viewer', 'operator', 'admin')
- auth_user_id: uuid (nullable, for future auth.users integration)
- created_at: timestamptz (NOT NULL, default now())
- updated_at: timestamptz (NOT NULL, default now(), auto-updated)
```

**api_keys** (SECURE PREFIX/SECRET PATTERN)

```sql
- id: uuid (primary key)
- name: text (NOT NULL)
- hashed_key: text (LEGACY - will be removed)
- prefix: text (for fast lookups, indexed)
- hashed_secret: text (bcrypt hashed, secure storage)
- scopes: text[] (default empty array)
- expires_at: timestamptz (nullable, indexed)
- created_by: uuid (foreign key to users, nullable)
- created_at: timestamptz (NOT NULL, default now())
- last_used_at: timestamptz (nullable, tracks API key usage)
- updated_at: timestamptz (NOT NULL, default now(), auto-updated)
```

**workflows**

```sql
- id: uuid (primary key)
- name: text (NOT NULL)
- description: text (nullable)
- schema: jsonb (workflow definition, NOT NULL)
- enabled: boolean (NOT NULL, default true)
- created_at: timestamptz (NOT NULL, default now())
- updated_at: timestamptz (NOT NULL, default now(), auto-updated)
```

**logs**

```sql
- id: uuid (primary key)
- level: text
- message: text
- metadata: jsonb
- workflow_id: uuid (nullable)
- job_id: text (nullable)
- pii_redacted: boolean
- created_at: timestamptz (90-day retention)
```

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
- **upstash**: for Redis, a versatile Vector Database
- **resend**: Emails
- **playwright**: Web testing and accessibility testing
- **fetch** & **puppeteer**: Simple web browsing tasks
- **browserbase**: Headless browser automation and interaction (only live, it can't access localhost)
- **filesystem, sequential-thinking, memory**: Core development tools

### Connector Types

1. **Slack:** SDK wrapper for notifications
2. **WhatsApp:** Twilio SDK with template registry
3. **PDF Generator:** Puppeteer-core with S3 storage
4. **Image Processing:** Sharp for transformations

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
# Unit tests (Jest) - All 9 test suites, 70 tests passing
pnpm test:backend

# E2E tests (Supertest)
pnpm test:backend:e2e

# Coverage target: >80%
pnpm test:backend --coverage
```

**Important:** Use `pnpm test:backend` instead of `nx test` to avoid infinite loop issues.

### Test Status (Updated July 15, 2025)

- ✅ **All Tests Passing**: 10/10 test suites, 82/82 tests (including new cron tests)
- ✅ **Sprint 7.5 Fixes**: Updated ApiKeyRecord schema in test mocks, fixed bcrypt mock typing, corrected DTO expectations
- ✅ **Test Stability**: No more infinite loops or system lag during test runs
- ✅ **Resource-Friendly Testing**: New optimized test commands prevent system lag

### Resource-Friendly Test Commands

Tests have been optimized to use minimal system resources. See `docs/testing-guide.md` for full details.

```bash
# Recommended: Serial mode (fastest, least resources)
pnpm test:backend:serial      # 4.5s, runs tests one at a time

# Alternative modes
pnpm test:backend:light       # Limited to 2 workers with memory caps
pnpm test:backend:watch       # Watch mode with 1 worker
pnpm test:backend:file <name> # Test specific files only

# Examples
pnpm test:backend:file cron   # Test only cron-related files
pnpm test:backend:file "api-keys|queue"  # Test multiple patterns
```

**Why use serial mode?** 
- Runs in ~4.5 seconds (faster than parallel due to less overhead)
- Uses minimal RAM and CPU
- Prevents system lag during development
- More reliable test results (no race conditions)

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

# k6 load testing
k6 run load-tests/smoke-test.js
```

## Monitoring & Observability

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

- **Request Duration:** `http_request_duration_seconds`
- **Job Latency:** `job_latency_seconds`
- **Job Failures:** `job_fail_total`
- **Queue Depth:** `queue_depth_total`

### Alerts (Grafana Cloud → Slack)

- API latency > 200ms (p95)
- Error rate > 5%
- Queue depth > 1000 jobs
- Redis connection failures

## Deployment

### Production Setup

**Frontend (Vercel)**

- URL: https://app.visanet.app
- Auto-deploy from `main` branch
- Environment variables in dashboard

**Backend (Render)**

- URL: https://api.visanet.app
- Auto-deploy from `main` branch
- Build: `pnpm install && pnpm nx build backend`
- Start: `node dist/apps/backend/main.js`

### Deployment Commands

```bash
# Deploy via git push
git push origin main

# Check deployment status
curl https://api.visanet.app/api/v1/healthz
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
- **Twilio:** WhatsApp messaging
- **Slack:** Internal notifications

### Documentation Links

- **NX Workspace:** https://nx.dev/getting-started/intro
- **Next.js 14:** https://nextjs.org/docs
- **NestJS:** https://docs.nestjs.com/
- **Supabase:** https://supabase.com/docs
- **BullMQ:** https://docs.bullmq.io/

## Current Sprint Status

**Sprint 0: Foundation** ✅ **COMPLETED** (July 14, 2025)

- NX monorepo structure established
- Next.js frontend with App Router
- NestJS backend with basic API
- Docker development environment
- ESLint, Prettier, TypeScript configs
- Development documentation

**Sprint 1: Core Engine & Gateway** ✅ **COMPLETED** (January 13, 2025)

- Supabase database setup and schema
- API key authentication system
- BullMQ job queue with Redis
- Health check endpoints
- OpenAPI documentation
- Worker process architecture

**Sprint 2: Frontend Integration & Testing** ✅ **COMPLETED** (January 14, 2025)

- Admin dashboard with Supabase auth
- Bull-Board queue monitoring
- Complete workflow automation
- Unit testing infrastructure
- Production deployment ready

**Sprint 2.5: Architecture & Security Overhaul** ✅ **COMPLETED** (July 15, 2025)

- Shared libraries architecture with 7 specialized libraries
- Zero app-to-app imports enforced by NX boundaries
- Critical API key security vulnerability patched
- Distributed Redis-based idempotency service
- Frontend integration with live data
- Complete removal of hardcoded credentials

**Database Security & Schema Enhancement** ✅ **COMPLETED** (July 15, 2025)

- ✅ **Secure API Key Pattern**: Implemented industry-standard prefix/secret pattern with bcrypt hashing
- ✅ **Row-Level Security**: Enabled RLS on all tables with comprehensive access policies
- ✅ **Schema Hardening**: Standardized triggers, timestamps, and constraints across all tables
- ✅ **Auth.users Integration**: Prepared users table for Supabase Auth integration with backward compatibility
- ✅ **Database Migration**: Applied 4 migrations safely with data preservation and backups
- ✅ **Test Coverage**: Updated all test suites to maintain 100% pass rate (9/9 suites, 68/68 tests)
- ✅ **Type Safety**: Updated TypeScript types to match new secure database schema

**Sprint 7.5: Polish & Improvements** ✅ **COMPLETED** (July 15, 2025)

- ✅ **Architectural Cleanup**: Eliminated Supabase client duplication, consolidated types
- ✅ **Critical Bug Fix**: Fixed API endpoint mismatch (/apikeys vs /api-keys)
- ✅ **Backend Optimizations**: Streamlined health checks, simplified service APIs
- ✅ **Frontend Enhancements**: Implemented useApiData hook, live data integration
- ✅ **Test Suite Completion**: All 9/9 test suites, 68/68 tests passing

**Current Status: Production-Ready with Enhanced Architecture**

- All core systems operational and secure
- Production deployments stable  
- Clean, maintainable monorepo architecture with zero duplication
- Complete test suite with 100% pass rate (9/9 suites, 68/68 tests)
- Ready for Sprint 3 advanced workflow features

## Notes for Claude Code

### When Working on This Project:

1. **Always check the current sprint status** in `tasks/roadmap.md`
2. **Follow the established patterns** in existing code
3. **Update documentation** when making architectural changes
4. **Test locally** using `pnpm dev` before pushing changes
5. **Use the TodoWrite tool** for complex multi-step tasks
6. **Check environment variables** in `.env.example` for requirements
7. **Follow security guidelines** - never commit secrets
8. **Use NX commands** for generating new components/services
9. **Keep CLAUDE.md updated** with important project changes

### Code Quality Reminders:

- Run `pnpm lint` before committing
- Ensure tests pass with `pnpm test`
- Check TypeScript compilation with `pnpm build`
- Use descriptive variable and function names
- Follow the established project structure
- Document complex business logic
- Prefer composition over inheritance
- Use dependency injection in NestJS
- Follow React best practices in Next.js

---

**Last Updated:** July 15, 2025
**Version:** Sprint 7.5 Complete - Polish & Architectural Excellence
