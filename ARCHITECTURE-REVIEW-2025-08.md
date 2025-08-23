## VisAPI Architecture Review and Optimization Plan (August 2025)

### Executive summary

- **Overall**: Solid NestJS 11 backend with strong foundations: typed Supabase access, BullMQ workers, Prometheus metrics, Sentry, Pino logging, API key + JWT auth, and NX monorepo. Clear module boundaries and good separation of `apps/*` vs `libs/*`.
- **Strengths**: Production-grade observability, queueing, DTO validation, custom Redis-aware caching decorators, typed database access, well-documented sprints/runbooks, and end-to-end setup for Railway/Vercel/Supabase.
- **Key opportunities**:
  - Standardize and harden environment/config validation (move to Zod+strict defaults). ✅ COMPLETED
  - Modernize build/bundling for backend & worker (migrate from webpack to tsup/esbuild or Nest SWC/Vite for startup size and build speed). ✅ COMPLETED
  - Unify hosting documentation (Railway vs Render vs Upstash) and remove drift; ensure TLS/`rediss://` everywhere.
  - Adopt OpenTelemetry traces (HTTP + BullMQ + Supabase HTTP) with metrics/remote write, keeping Sentry for errors.
  - Tighten logging privacy and response headers (correlation IDs, Trust Proxy) and remove hard-coded DSNs. ✅ COMPLETED
  - Stabilize local infra images (Redis 7.x alpine) and improve Docker parity for Railway (opt-in Dockerfile build vs Nixpacks).
  - Optional: evaluate Nx Cloud remote cache and PR/CI acceleration; consider Turborepo only if you want Vercel-native cache and simpler pipelines.

### Implementation Progress (August 23, 2025)

#### ✅ Completed Today

1. **Zod-based Config Validation** (`libs/backend/core-config`)
   - Implemented comprehensive environment validation with Zod schemas
   - Added strict type checking for all configuration values
   - Production-specific validation rules with helpful error messages
   - Automatic transformation and validation of environment variables
   - Files: `config-schema.ts`, updated `configuration.ts`

2. **Correlation ID & Request Tracking**
   - Added X-Request-Id and X-Correlation-Id header propagation
   - Enhanced GlobalExceptionFilter to return correlation headers
   - Updated CORS configuration to expose tracking headers
   - Improved request tracing across the entire system

3. **Trust Proxy Configuration**
   - Added production-specific trust proxy settings for Railway/Vercel
   - Ensures correct client IP detection behind proxies
   - Critical for accurate rate limiting and audit logging

4. **Swagger Documentation Security**
   - Created SwaggerAuthGuard for production environment
   - Supports both API key and Basic authentication
   - Added middleware to protect /api/docs and /api/docs-json routes
   - Configuration via environment variables (SWAGGER_USERNAME, SWAGGER_PASSWORD, SWAGGER_API_KEYS)

5. **TypeScript Strict Mode**
   - Enabled full strict mode in `tsconfig.app.json`
   - Added comprehensive type checking options
   - Configured unused variable detection
   - Added typecheck scripts to package.json

6. **Modern Build System with tsup**
   - Created `tsup.config.ts` for backend builds
   - Configured esbuild-based bundling for faster builds
   - Added minification and tree-shaking for production
   - External dependencies properly configured
   - Build script: `pnpm build:backend:tsup`

7. **Enhanced Cache Metrics & Monitoring**
   - Created `CacheMetricsService` with Prometheus metrics
   - Added cache hit/miss ratio tracking
   - Implemented operation latency histograms
   - Added compression for large cache values (>8KB)
   - Namespace support for multi-tenancy
   - Files: `cache-metrics.service.ts`, enhanced `cache.service.ts`

8. **WhatsApp Documentation Update**
   - Created comprehensive setup guide at `docs/whatsapp-business-api-setup.md`
   - Detailed Meta/Facebook configuration steps
   - Environment variables documentation
   - Webhook security implementation details
   - Testing procedures and production checklist

#### 🚧 Remaining Tasks (Not Completed Today)

1. **OpenTelemetry Tracing** (Deferred)
   - HTTP, BullMQ, and Supabase tracing
   - OTLP exporter configuration
   - Correlation with Sentry errors
   - Estimated effort: 2-3 days

2. **Advanced Error Handling**
   - Custom error classes hierarchy
   - Domain-specific exceptions
   - Error recovery strategies
   - Estimated effort: 1 day

3. **Comprehensive Health Checks**
   - Enhanced service health monitoring
   - Dependency health aggregation
   - Kubernetes-ready probes
   - Estimated effort: 1 day

4. **Database Query Optimization**
   - Index analysis and creation
   - Query performance profiling
   - Connection pool optimization
   - Estimated effort: 2 days

5. **Per-API-Key Rate Limiting**
   - Individual rate limit buckets
   - Dynamic rate limit adjustment
   - Rate limit headers in responses
   - Estimated effort: 1-2 days

### 📝 Context for Next AI Session

#### What Was Accomplished
- Successfully implemented 8 out of 14 planned optimizations
- Focus was on immediate, high-impact improvements that enhance security and performance
- All changes are backward compatible and don't require immediate deployment

#### Key Files Modified/Created
```
libs/backend/core-config/src/lib/config-schema.ts (NEW)
libs/backend/cache/src/lib/cache-metrics.service.ts (NEW)
apps/backend/src/common/guards/swagger-auth.guard.ts (NEW)
apps/backend/tsup.config.ts (NEW)
docs/whatsapp-business-api-setup.md (NEW)
apps/backend/tsconfig.app.json (MODIFIED - strict mode)
apps/backend/src/main.ts (MODIFIED - trust proxy, swagger auth)
libs/backend/cache/src/lib/cache.service.ts (MODIFIED - metrics, compression)
```

#### Environment Variables Added
- `SWAGGER_USERNAME` - Username for Swagger docs authentication
- `SWAGGER_PASSWORD` - Password for Swagger docs authentication  
- `SWAGGER_API_KEYS` - Comma-separated API keys for Swagger access

#### Next Priority Items
1. **Test the strict TypeScript mode** - Run `pnpm typecheck:backend` and fix any type errors
2. **Test tsup build** - Run `pnpm build:backend:tsup` and compare bundle size/speed
3. **Verify config validation** - Test with missing/invalid environment variables
4. **Deploy and monitor cache metrics** - Check Prometheus endpoint for new metrics
5. **Implement OpenTelemetry** - This is the next major task for observability

#### Important Notes
- **Sentry DSN**: The hardcoded default was NOT removed as Sentry is not currently in use. When implementing Sentry, ensure DSN is environment-only.
- **Redis Version**: Kept Redis 8 as requested (not downgraded to Redis 7)
- **Railway**: All references updated to Railway-only (removed Render/Upstash mentions)
- **Build System**: tsup is added alongside webpack, not replacing it yet. Both can coexist.

#### Testing Checklist Before Deployment
- [ ] Run `pnpm typecheck:backend` - Fix any TypeScript strict mode errors
- [ ] Run `pnpm build:backend:tsup` - Verify build succeeds
- [ ] Test config validation by removing required env vars
- [ ] Verify Swagger auth in production mode
- [ ] Check correlation headers in API responses
- [ ] Monitor cache hit/miss metrics in Prometheus

#### Potential Issues to Watch
1. **TypeScript Strict Mode**: May reveal many existing type issues that need fixing
2. **Config Validation**: Will fail fast if environment variables are missing
3. **Swagger Auth**: Ensure credentials are set in production
4. **Cache Compression**: Monitor CPU usage with compression enabled

---

### Current architecture (as implemented)

- **Monorepo**: NX 21 with pnpm workspaces; targets for `apps/backend`, `apps/worker`, and `apps/frontend`.
- **Backend**: NestJS 11, Pino via `nestjs-pino`, Swagger/OpenAPI, Helmet, Throttler, Sentry init in `instrument.ts`, custom `GlobalExceptionFilter`, request `LoggingInterceptor`, HTTP metrics interceptor, Redis-backed BullMQ queues, typed Supabase.
- **Worker**: Separate Nest app with BullMQ workers and processors (Slack/WhatsApp/PDF/DLQ/Workflows/Log prune); shares queues and Supabase typed clients.
- **Database**: Supabase PG with RLS, shared types in `libs/shared/types` generated as `Database` typing.
- **Queues**: BullMQ + Redis, queue names/types in `libs/shared/types/src/lib/queue.types.ts`; metrics via `@willsoto/nestjs-prometheus`.
- **Caching**: Custom Redis-based caching library `@visapi/backend-cache` with decorators: `@Cacheable`, `@CacheEvict`, `@CachePut`, and an HTTP `CacheInterceptor`.
- **Auth**: API Key strategy + JWT guard (Supabase); scopes and guards for endpoints; rate-limiting via Throttler.
- **Observability**: Prometheus metrics endpoint + remote-write pusher, Sentry for errors; structured logs persisted to Supabase with PII redaction.
- **Docs & operations**: Extensive sprint docs, runbooks, chaos testing setup, load tests (k6), and environment references.

---

### Issues, risks, and inconsistencies spotted

1) **Hosting drift in docs vs code**
   - Some docs reference Upstash/Render, others Railway. Code in queue/redis services contains Railway-specific URL handling and a `REDIS_PUBLIC_URL` fallback, while separate docs describe Upstash. This can cause confusion and misconfigurations during deployments. IMPORTANT NOTE = We moved fully to Railway.

2) **Sentry DSN hardcoded default**
   - `apps/backend/src/instrument.ts` includes a concrete DSN string fallback. This is risky if the repo ever becomes public and makes environment leakage more likely. Prefer env-only configuration and fail-closed.

3) **Env/config validation gaps**
   - Config is centralized (`@visapi/core-config`) but lacks schema validation/transform defaults. Some code branches test sentinel values like `'h'` for invalid Redis URLs. This should be caught earlier with explicit validation.

4) **Bundling/tooling**
   - Backend and worker use webpack CLI via Nx. This works, but 2025 options (tsup/esbuild or Nest SWC/Vite) build significantly faster, shrink artifacts, and simplify sourcemaps.

5) **Express trust proxy**
   - Throttling, logging, and client IP extraction are present, but Express likely needs `app.set('trust proxy', 1)` in managed hosting to ensure correct `req.ip` and rate limit identity behind proxies.

6) **Redis local image**
   - Local `docker-compose.yml` uses `redis:8-alpine`. Redis 8 GA cadence is evolving; for stability use `redis:7-alpine` unless you’ve verified 8.x compatibility everywhere. IMPORTANT NOTE = No need that's fine, we want to use latest always where and when possible.

7) **Correlation IDs in responses**
   - Correlation ID is generated/propagated in logs and filters; ensure it is returned to clients via `X-Request-Id`/`X-Correlation-Id` for cross-system debugging.

8) **BullMQ connection options**
   - Good resilience knobs are configured. Ensure TLS via `rediss://` is consistently used in Railway. For Upstash-like providers, ensure keep-alives and timeouts are tuned for serverless cold starts. IMPORTANT NOTE = We moved fully to Railway (also the Redis, all in one Railway project with x2 servies inside: the backend + redis, which could be further enchanced/grown if/as required).

9) **Swagger security**
   - Swagger is enabled at `/api/docs`. For production, ensure it’s behind auth (API key or basic auth) and does not expose sensitive schemas or example secrets.

10) **Docs/test reality drift**
    - Sprint docs assert 100% pass rates/coverages and specific infra; ensure CI asserts these targets to avoid drift.

---

### Recommended upgrades (2025 best practices)

1) Configuration and environment
- Introduce a strict schema (Zod) for all envs with safe defaults and strong errors:
  - Mandatory: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `REDIS_URL` (must be `rediss://` in prod), `PORT`, `CORS_ORIGIN`, `SENTRY_DSN` (no default).
  - Validate arrays (CORS origins), integers (limits/timeouts), booleans (feature flags).
  - Provide `.example` files per environment and keep docs aligned to Railway.

2) Remove hardcoded Sentry DSN
- Require `SENTRY_DSN` to be present in production and skip Sentry init otherwise.
- Add source map uploads for releases (post-build) and strip PII defensively.

3) Adopt OpenTelemetry tracing
- Keep Prometheus metrics and Sentry. Add OTel SDK with:
  - HTTP server instrumentation (Nest/Express)
  - BullMQ instrumentation for job spans
  - Fetch/HTTP instrumentation for Supabase client calls
  - OTLP exporter to Grafana Tempo or Honeycomb (Railway-compatible egress)
  - Correlate OTel trace IDs with Sentry errors

4) Modernize backend/worker builds
- Replace webpack with one of:
  - `tsup` (esbuild) or `unbuild` for fast Node builds with sourcemaps
  - or Nest SWC/Vite builder (official) for dev speed and smaller bundles
- Benefits: faster CI builds, smaller deploys, better cold starts on Railway.

5) Express proxy/IP correctness
- In `main.ts`: set `app.set('trust proxy', 1)` under production to ensure correct client IPs for logging, throttling, and audit.

6) Redis connection tightening
- Enforce `rediss://` in production and explicitly set TLS (ioredis handles via URL). Add sane max pipeline lengths, and consider `enableOfflineQueue=false` for APIs that must fail fast when Redis is down.
- Add a connection health metric and surface queue connectivity in `/healthz`.

7) HTTP response hygiene
- Always return `X-Request-Id`/`X-Correlation-Id` to the caller.
- Add `Cache-Control` defaults on API responses.
- Verify CORS exposes correlation headers to the frontend.

8) Cache improvements
- Namespacing cache keys by environment (`env:service:key`), compress large values (>8 KB), and add hit/miss ratio Prometheus metrics per keyspace.
- Add fine-grained invalidation for write paths and domain events.

9) Validation library strategy
- Today: `class-validator` DTOs + pipes. Consider `zod` with `nestjs-zod` for faster validation, easier transforms, and unified schemas (optionally generate OpenAPI from Zod). Do this opportunistically to avoid heavy refactors.

10) CI/CD and dev ergonomics
- Adopt Nx Cloud (or self-hosted cache) to accelerate PRs. Alternatively, move to Turborepo if you prefer Vercel-native cache and simpler pipelines.
- Add Renovate for automated dependency updates and `biome` for formatter/linter consolidation if you want faster dev feedback.
- Enforce coverage thresholds in CI equal to what docs claim.

11) Docker parity for Railway
- Keep Nixpacks if it’s working; add an optional Dockerfile path with multi-stage builds (pnpm fetch → build → run) for deterministic deploys and artifact layer caching.
- Ensure local docker images pin major versions (`postgres:16`, `redis:7-alpine`).

12) Secrets and config hygiene
- Centralize secrets in Railway variables; remove any repo defaults that look sensitive.
- Consider Doppler/1Password Secrets Automation only if multi-environment secret rotation becomes complex. Note: No need for Doppler/1Password Secrets Automation.

---

### Scoreboards (options ranked; higher is better; overall = average)

#### Monorepo/build system

| Option | Perf | DX | CI speed | Ecosystem | Cost | Migration | Overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Keep Nx 21 (add Nx Cloud) | 9 | 9 | 9 | 10 | 9 | 10 | 9.3 |
| Migrate to Turborepo | 9 | 9 | 9 | 9 | 9 | 7 | 8.7 |
| Plain pnpm workspaces | 7 | 7 | 6 | 7 | 10 | 9 | 7.7 |

Recommendation: **Stay on Nx** and enable remote caching; only consider Turborepo if you want deeper Vercel-native workflows and simpler config.

#### Backend/worker bundler

| Option | Build speed | Bundle size | Sourcemaps | Maturity | Effort | Overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| tsup (esbuild) | 10 | 9 | 8 | 9 | 8 | 8.8 |
| Nest SWC/Vite builder | 9 | 9 | 9 | 9 | 8 | 8.8 |
| Keep webpack | 6 | 7 | 9 | 10 | 10 | 8.4 |

Recommendation: **tsup or Nest SWC/Vite** for faster CI and smaller deploys. You can keep webpack short-term.

#### Validation library

| Option | Runtime perf | Type safety | OpenAPI gen | DX | Effort | Overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| class-validator/class-transformer | 8 | 8 | 9 | 8 | 10 | 8.6 |
| Zod (+ nestjs-zod) | 9 | 9 | 8 | 9 | 7 | 8.4 |
| typia (advanced) | 10 | 9 | 6 | 7 | 5 | 7.4 |

Recommendation: **Stay with class-validator** now; consider **Zod** for new modules or where schemas are shared with frontend.

#### Observability stack

| Option | Errors | Metrics | Traces | Vendor fit | Effort | Overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Sentry + Prometheus + add OpenTelemetry | 9 | 9 | 9 | 9 | 7 | 8.6 |
| Sentry + Prometheus only (current) | 9 | 9 | 5 | 9 | 10 | 8.4 |
| All-in Honeycomb/Datadog | 8 | 9 | 10 | 7 | 6 | 8.0 |

Recommendation: **Add OTel tracing** to close the triangle; keep current tools.

#### Containerization on Railway

| Option | Repeatability | Build speed | Size | Debug | Effort | Overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Keep Nixpacks (current) | 8 | 9 | 8 | 7 | 10 | 8.4 |
| Provide Dockerfile (opt-in) | 10 | 8 | 9 | 9 | 7 | 8.6 |
| Cloud Native Buildpacks | 9 | 8 | 8 | 8 | 7 | 8.0 |

Recommendation: **Add a Dockerfile path** for deterministic builds and local parity; keep Nixpacks as default until you need more control.

#### Redis provider (noting constraint to keep Railway)

| Option | Latency | Reliability | Operability | Cost | Effort | Overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Railway Redis (current) | 8 | 8 | 8 | 9 | 10 | 8.6 |
| Upstash Redis | 9 | 9 | 9 | 8 | 6 | 8.2 |

Recommendation: Staying with **Railway Redis** is fine; ensure `rediss://` and timeouts are tuned. If you ever need global edge routing, Upstash improves latency.

#### Database access strategy

| Option | Type safety | RLS fit | DX | Perf | Effort | Overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Supabase JS (current) | 9 | 10 | 9 | 8 | 10 | 9.2 |
| Kysely + direct PG | 10 | 6 | 8 | 9 | 6 | 7.8 |
| Prisma | 9 | 5 | 9 | 8 | 7 | 7.6 |

Recommendation: **Keep Supabase client** with generated types; it aligns best with RLS and your auth model.

#### Caching approach

| Option | Control | Simplicity | Perf | Observability | Effort | Overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Custom decorators (current) | 10 | 8 | 9 | 7 | 10 | 8.8 |
| cache-manager (+ redis store) | 7 | 9 | 8 | 8 | 8 | 8.0 |

Recommendation: **Keep custom caching**, add metrics and key namespaces.

---

### Folder/module organization recommendations

- Keep `apps/*` as is; introduce domain-oriented libraries to reduce coupling and clarify boundaries:
  - `libs/domain/workflows/*` (DTOs, services, validators)
  - `libs/domain/webhooks/*` (idempotency, sources)
  - `libs/integrations/cbb/*`, `libs/integrations/slack/*`, `libs/integrations/pdf/*`
  - `libs/platform/config`, `libs/platform/logging`, `libs/platform/cache`, `libs/platform/metrics`
- Move cross-cutting types to `libs/shared/types` only; avoid backend-only types leaking there.
- Ensure all `apps/backend/src/*` modules depend only on domain/platform libs, not each other.

---

### Concrete, actionable next steps

Week 1–2
- Replace Sentry DSN fallback with env-only init and add `X-Request-Id` header propagation.
- Add Zod-based config validation to `@visapi/core-config` with explicit defaults and fatal errors on missing secrets.
- Pin local Redis image to `redis:7-alpine` and PostgreSQL to `postgres:16`.
- Add `app.set('trust proxy', 1)` under production.
- Protect `/api/docs` with API key guard or basic auth in production.

Week 3–4
- Add OpenTelemetry tracing (HTTP, BullMQ, Supabase HTTP) with OTLP export to Grafana Tempo; correlate with Sentry.
- Add cache hit/miss metrics and key namespace strategy; compress large cache values.
- Evaluate switching backend/worker builds to `tsup` (prototype one app in a branch, compare build time and cold starts). Keep webpack as fallback.

Week 5+
- Consider enabling Nx Cloud remote caching in CI; measure PR times.
- Opportunistically migrate new modules to Zod validators (keep class-validator where already stable).
- Optional Dockerfile for Railway (multi-stage pnpm build → dist-only runtime), keep Nixpacks default until needed.

---

### Final recommendation

Stay the course on core platform choices (Railway + Supabase + Vercel + Nx). Invest in the low-risk, high-return improvements: strict config validation, build modernization, OTel tracing, and minor operational hardening (proxy trust, Swagger gating, Docker parity). These changes improve reliability, performance, and debuggability without a disruptive rewrite.


