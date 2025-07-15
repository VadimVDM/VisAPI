# Sprint 1: Core Engine & Gateway Implementation Plan

**Completed:** July 15, 2025, 01:50 AM

## Objective

Build the core API gateway infrastructure with authentication, queue system, health monitoring, and OpenAPI documentation to establish a production-ready foundation for the VisAPI workflow automation platform.

## Tasks

### High Priority - Database & Authentication

- [x] S1-BE-01: Set up Supabase database connection and create core tables (users, api_keys, logs)
- [x] S1-BE-02: Implement API key hashing and storage system
- [x] S1-BE-03: Create NestJS ApiKeyGuard and @Scopes() decorator for authorization

### High Priority - Queue System

- [x] S1-BE-04: Integrate BullMQ with Upstash Redis (TLS connection)
- [x] S1-BE-05: Create queue definitions (critical, default, bulk)
- [ ] S1-BE-06: Implement standalone worker process with graceful shutdown
- [x] S1-BE-07: Set up Dead Letter Queue (DLQ) with replay functionality

### Medium Priority - API Gateway

- [x] S1-BE-08: Create webhook endpoint with idempotency and size limits
- [x] S1-BE-09: Implement health check endpoints (/livez, /healthz)
- [x] S1-BE-10: Generate OpenAPI documentation with Swagger UI

### Medium Priority - Testing & Quality

- [ ] S1-QA-01: Write unit tests for auth system
- [ ] S1-QA-02: Write unit tests for queue service
- [ ] S1-QA-03: Write unit tests for webhook controller
- [ ] S1-QA-04: Achieve 80% backend code coverage

## Technical Details

### 1. Database Setup (S1-BE-01)

- Connect to Supabase project: pangdzwamawwgmvxnwkk
- Use @supabase/supabase-js client
- Create migration files for core tables:
  - users: id, email, role, created_at, updated_at
  - api_keys: id, hashed_key, name, scopes, expires_at, created_by
  - logs: id, level, message, metadata, workflow_id, job_id, pii_redacted, created_at
- Enable Row Level Security (RLS) on all tables

### 2. API Key Authentication (S1-BE-02, S1-BE-03)

- Use bcrypt for hashing API keys
- Store only hashed versions in database
- Implement key generation endpoint that returns the key once
- Create NestJS guard that validates keys and checks scopes
- Scopes: 'workflows:read', 'workflows:create', 'logs:read', 'keys:manage'

### 3. Queue System (S1-BE-04 to S1-BE-07)

- Configure BullMQ with Upstash Redis URL (rediss://)
- Create queue factory service for managing connections
- Implement queue priorities: critical (10), default (5), bulk (1)
- Worker process in separate apps/worker directory
- DLQ configuration with max retries: 3
- Graceful shutdown with 30s drain timeout

### 4. API Endpoints (S1-BE-08, S1-BE-09)

- POST /api/v1/triggers/{key}
  - Validate webhook key
  - Check Idempotency-Key header
  - Enforce 512KB payload limit
  - Accept application/json and application/x-www-form-urlencoded
- GET /api/v1/livez - Simple liveness check
- GET /api/v1/healthz - Check DB and Redis connections
- GET /api/v1/queue/metrics - Return queue depths and stats

### 5. OpenAPI Documentation (S1-BE-10)

- Use @nestjs/swagger decorators
- Document all endpoints with examples
- Include authentication requirements
- Generate at /api/docs (protected by API key)

## Dependencies

### External Services

- Supabase project (pangdzwamawwgmvxnwkk) - Need connection string
- Upstash Redis - Need connection URL with TLS
- Environment variables to configure

### NPM Packages

- @supabase/supabase-js
- @nestjs/bull or bullmq
- @nestjs/swagger
- bcrypt
- ioredis (for Redis connection)

## Success Criteria

1. **Database Connected**: Can create and query all core tables
2. **Authentication Working**: API keys can be created, validated, and scoped
3. **Queue System Operational**: Jobs can be created, processed, and monitored
4. **Health Monitoring**: All health endpoints return proper status
5. **API Documentation**: Swagger UI renders without errors
6. **Test Coverage**: Backend code coverage ≥ 80%
7. **Production Ready**: Can handle webhook triggers and process jobs reliably

## Architecture Notes

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Client    │────▶│  API Gateway     │────▶│   Worker    │
│             │     │  (NestJS)        │     │  (BullMQ)   │
└─────────────┘     └────────┬─────────┘     └──────┬──────┘
                             │                        │
                             ▼                        ▼
                    ┌─────────────────┐      ┌──────────────┐
                    │    Supabase     │      │ Upstash Redis│
                    │   PostgreSQL    │      │    (TLS)     │
                    └─────────────────┘      └──────────────┘
```

## Risk Mitigation

- **Redis Connection**: Test TLS connection early, have fallback to local Redis for dev
- **Database Migrations**: Use versioned migrations, test rollback procedures
- **API Key Security**: Never log raw keys, implement key rotation from day 1
- **Queue Reliability**: Implement DLQ immediately to prevent job loss
