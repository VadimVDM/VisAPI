# CLAUDE.md - VisAPI Project Guide

This file contains all the essential information for Claude Code to work effectively with the VisAPI project. Keep this file updated as the project evolves.

## Project Overview

**VisAPI** is an internal workflow automation engine for Visanet that serves as the central nervous system for operational tasks. The system automates critical, repetitive, and time-sensitive processes.

### Key Goals
- Reduce manual workload by 30%
- Improve customer update speed from hours to under 5 minutes
- Automate visa status updates, application processing, and notifications

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

**Frontend (apps/frontend/)**
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + Shadcn/ui components
- **Auth:** Supabase Email Magic-Link with domain allowlist (@visanet.com)
- **Data Fetching:** React Query
- **Deployment:** Vercel
- **Development:** Hot reloading on localhost:3001

**Backend (apps/backend/)**
- **Framework:** NestJS with TypeScript
- **Database:** Supabase PostgreSQL with Row-Level Security
- **Queue:** BullMQ with Upstash Redis (3 priority levels: critical, default, bulk)
- **Auth:** API key authentication with 90-day rotation
- **Logging:** Pino structured logging with PII redaction
- **API Docs:** Swagger/OpenAPI
- **Deployment:** Render (Gateway + Background Workers)
- **Development:** Hot reloading on localhost:3000/api

**Infrastructure**
- **Monorepo:** NX workspace with pnpm
- **Development:** Docker Compose (PostgreSQL, Redis, Adminer, Redis Commander)
- **CI/CD:** GitHub Actions (pending implementation)
- **Monitoring:** Prometheus + Grafana Cloud (planned)
- **Security:** Helmet, rate limiting (200 req/min burst, 2 req/sec sustained)

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
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3000/api
- **PostgreSQL:** localhost:5432 (postgres/postgres/visapi_dev)
- **Redis:** localhost:6379
- **Adminer (DB UI):** http://localhost:8080
- **Redis Commander:** http://localhost:8081

### MCP Tools Usage

Use these tools:

- **supabase**: Direct database access and SQL operations (Project ID = pangdzwamawwgmvxnwkk)
- **redis**: Versatile Vector Database
- **resend**: Emails
- **playwright**: Web testing and accessibility testing
- **fetch** & **puppeteer**: Simple web browsing tasks
- **browserbase**: Headless browser automation and interaction (only live, it can't access localhost)
- **filesystem, sequential-thinking, memory**: Core development tools

## Environment Variables

### Required Environment Variables (.env.local)

**Frontend**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/visapi_dev
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=3000
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
'use client' // Only when needed for interactivity

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
- email: text (unique)
- role: enum ('viewer', 'operator', 'admin')
- created_at: timestamptz
- updated_at: timestamptz
```

**api_keys**
```sql
- id: uuid (primary key)
- name: text
- hashed_key: text (unique)
- scopes: text[]
- expires_at: timestamptz (indexed)
- created_by: uuid (foreign key to users)
- created_at: timestamptz
```

**workflows**
```sql
- id: uuid (primary key)
- name: text
- description: text
- schema: jsonb (workflow definition)
- enabled: boolean
- created_at: timestamptz
- updated_at: timestamptz
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
- **Backend:** API key authentication with scoped permissions
- **API Keys:** 90-day rotation, hashed storage, unique per service

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
# Unit tests (Jest)
pnpm test:backend

# E2E tests (Supertest)
pnpm test:backend:e2e

# Coverage target: >80%
pnpm test:backend --coverage
```

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
logger.info({
  correlationId: req.headers['x-correlation-id'],
  userId: req.user?.id,
  action: 'workflow.triggered',
  workflowId: workflow.id,
}, 'Workflow triggered successfully');
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

### Environments
- **Development:** Local Docker Compose
- **Staging:** Render + Vercel (preview deployments)
- **Production:** Render + Vercel + Upstash + Supabase

### CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  lint-test-build:
    - Lint (ESLint + Prettier)
    - Test (Jest + Playwright)
    - Build (NX build)
    - Security (Trivy + Snyk)
```

### Infrastructure as Code
```bash
# Terraform for cloud resources
cd infrastructure/
terraform plan
terraform apply
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

**Next Sprint 1: Core Engine & Gateway**
- Supabase database setup
- API key authentication
- BullMQ job queue system
- Health check endpoints
- OpenAPI documentation

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

**Last Updated:** July 14, 2025
**Version:** Sprint 0 Foundation Complete