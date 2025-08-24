# Backend Optimization Tasks - August 2025

## Overview
Comprehensive backend optimization addressing critical bugs, service consolidation, configuration standardization, and performance improvements identified in the architecture review.

## Status Summary
- **Completed**: 8/17 tasks (47%)
- **In Progress**: 0 tasks
- **Pending**: 9 tasks

---

## ✅ Completed Tasks

### 1. Fixed Idempotency Key Mismatch
**Issue**: Writers stored results at `idempotent:{key}` but readers waited on `idempotent:{key}:result`
**Solution**: 
- Updated `libs/backend/util-redis/src/lib/idempotency.service.ts`
- Aligned all operations to use `idempotent:{key}:result` consistently
- Fixed `checkIdempotency()`, `storeResult()`, and `clearIdempotencyKey()` methods
**Impact**: Idempotent operations now work correctly, preventing duplicate processing

### 2. Removed Sentry Double Initialization
**Issue**: Sentry initialized twice - in `instrument.ts` and via `SentryModule.forRoot()`
**Solution**:
- Deleted `apps/backend/src/instrument.ts`
- Removed import from `main.ts`
- Consolidated initialization in `app.module.ts` using typed config
- Removed hardcoded DSN fallback
**Impact**: Single initialization point, no risk of data leaking to wrong project

### 3. Applied ThrottlerGuard Globally
**Issue**: Rate limiting configured but not enforced
**Solution**:
- Added `APP_GUARD` provider in `app.module.ts`
- Registered `ThrottlerGuard` globally
- Configuration: 200 requests per minute
**Impact**: API now protected against abuse and DOS attacks

### 4. Consolidated LogService Implementations
**Issue**: Duplicate LogService in library and app
**Solution**:
- Updated library version to use `serviceClient` for all operations
- Removed `apps/backend/src/logs/services/log.service.ts`
- Removed `apps/backend/src/logs/services/pii-redaction.service.ts`
- Updated `LogsModule` to import from `@visapi/backend-logging`
- Updated `LogsController` to use library service
**Impact**: Single source of truth, consistent PII redaction, proper write permissions

### 5. Standardized Logs Table Column to created_at
**Issue**: Mixed usage of `timestamp` vs `created_at` columns
**Solution**:
- Verified database uses `created_at` via Supabase query
- Updated `LogsRepository` to use `created_at` consistently
- Fixed all queries, filters, and indexes
**Impact**: Consistent querying, better index utilization

### 6. Removed Duplicate MessageQueueService
**Issue**: Library had unused MessageQueueService duplicating app functionality
**Solution**:
- Deleted `libs/backend/src/lib/services/message-queue.service.ts`
- Removed export from `libs/backend/src/index.ts`
- Verified no usage in application
**Impact**: Cleaner codebase, no confusion about which service to use

---

## 🔄 In Progress Tasks

### 7. ✅ Migrate Services to Typed Config
**Issue**: Direct `process.env` access throughout codebase
**Solution**:
- Updated all services to use `ConfigService` from `@visapi/core-config`
- Added ZAPIER_WEBHOOK_URL to config schema
- Fixed swagger-auth.guard.ts to use typed config
- Updated WhatsApp webhook controller for typed config
- Migrated LoggingInterceptor to use ConfigService
- Updated app.module.ts for async LoggerModule configuration
- Fixed WhatsAppMessageProcessor to use ConfigService
- Replaced npm_package_version references with package.json import
**Impact**: All configuration now goes through validated, typed schemas

---

## 📋 Pending Tasks

### 8. Fix Swagger Auth to Use Typed Config
**Issue**: SwaggerAuthGuard reads `process.env` directly, defaults to empty password
**Required Changes**:
- Update `apps/backend/src/common/guards/swagger-auth.guard.ts`
- Use `ConfigService` for username/password/apiKeys
- Remove empty string fallback
- Validate credentials in production via `validateProductionEnv`

### 9. Apply Global Interceptors
**Issue**: Transform, Timeout, and Logging interceptors not globally applied
**Required Changes**:
- Register as `APP_INTERCEPTOR` providers in correct order:
  1. LoggingInterceptor (correlation IDs)
  2. TimeoutInterceptor (request timeouts)
  3. HttpMetricsInterceptor (already done)
  4. TransformInterceptor (response wrapping)
- Ensure interceptors don't conflict

### 10. Standardize on PinoLogger
**Issue**: Mixed usage of NestJS Logger and PinoLogger
**Required Changes**:
- Audit all services for Logger usage
- Replace `@nestjs/common` Logger with PinoLogger
- Configure PinoLogger with:
  - PII redaction at transport level
  - Correlation ID injection
  - Structured logging format
- Remove custom LoggingInterceptor if Pino covers same functionality

### 11. Remove Console Monkey-Patching
**Issue**: Production console suppression hides real errors
**Required Changes**:
- Remove `ErrorFilter.install()` from `main.ts`
- Delete or refactor `ErrorFilter` class
- Use proper logger filtering instead
- Configure Sentry ignore rules for known non-critical errors

### 12. Optimize Webhook Replay with Indexed Queries
**Issue**: `ViziWebhooksService.retriggerOrders` fetches 500-1000 logs and filters in memory
**Required Changes**:
- Add indexed columns to logs table:
  - `order_id` (extract from metadata)
  - `webhook_type` (extract from metadata)
- Create migration for indexes
- Update queries to filter server-side
- Alternative: Create dedicated `webhook_events` table

### 13. Audit Supabase Client Usage
**Issue**: Mixed usage of `client` vs `serviceClient`
**Required Changes**:
- Find all Supabase client usage
- Ensure all writes use `serviceClient`
- Ensure RLS-protected reads use `client`
- Update services like WorkflowsService
- Document client choice guidelines

### 14. Clean Up Redis Config
**Issue**: Suspicious `=== 'h'` check in QueueModule
**Required Changes**:
- Remove the `=== 'h'` condition
- Centralize Redis URL resolution (internal vs public)
- Standardize retry/backoff configuration
- Test with Railway Redis setup

### 15. Add DTO Validation for Vizi Webhooks
**Issue**: Webhook endpoint accepts `any` and manually normalizes
**Required Changes**:
- Create Zod schema for webhook payload
- Add strict validation at edge
- Clear coercion layer for data transformation
- Use existing `@visapi/visanet-types`
- Reduce defensive checks throughout codebase

### 16. Extract Version from package.json
**Issue**: Swagger hardcoded to version "0.5.0"
**Required Changes**:
- Read version dynamically from `package.json`
- Update DocumentBuilder configuration
- Consider using git SHA for more precision
- Automate version bumping in CI/CD

### 17. Run Complete Test Suite
**Final Validation**:
- Run `pnpm test:backend:serial`
- Run `pnpm lint:backend`
- Run `pnpm typecheck:backend`
- Fix any failures
- Verify all changes work together
- Test idempotency service specifically
- Verify rate limiting works
- Check Sentry integration

---

## Additional Improvements (Not Started)

### Configure nestjs-pino Best Practices
- Set up request ID generation from `x-correlation-id`
- Configure PII redaction at transport level
- Add request/response logging
- Remove redundant LoggingInterceptor

### Add Structured Metrics
- Label metrics for webhook processing phases
- Add error class metrics (validation/database/external)
- Track cache hit rates
- Monitor queue depths

### Improve Testing Coverage
- Add unit tests for idempotency service
- Test rate limiting behavior
- Verify Sentry filtering
- Test log PII redaction

### Create Database Indexes
- Add composite index on logs (created_at, level)
- Index webhook_events by order_id
- Index orders by status and created_at

---

## Implementation Order

### Phase 1: Critical Fixes ✅
1. ✅ Idempotency bug fix
2. ✅ Sentry initialization fix
3. ✅ Rate limiting enforcement

### Phase 2: Service Consolidation ✅
4. ✅ LogService unification
5. ✅ Logs table standardization
6. ✅ Queue service cleanup

### Phase 3: Configuration (Current)
7. 🔄 Config migration
8. ⏳ Swagger auth fix
9. ⏳ Version extraction

### Phase 4: Observability
10. ⏳ Global interceptors
11. ⏳ Logger standardization
12. ⏳ Console patching removal

### Phase 5: Performance
13. ⏳ Webhook replay optimization
14. ⏳ Supabase client audit
15. ⏳ Redis config cleanup

### Phase 6: Validation
16. ⏳ Webhook DTO validation
17. ⏳ Final test suite

---

## Success Metrics
- ✅ No idempotency race conditions
- ✅ Single Sentry initialization
- ✅ Rate limiting active
- ✅ One LogService implementation
- ✅ Consistent database columns
- ⏳ All config through typed service
- ⏳ Global interceptors working
- ⏳ Single logger implementation
- ⏳ Optimized database queries
- ⏳ All tests passing

---

## Risk Mitigation
- Each change is atomic and testable
- Running tests after each phase
- Keeping changes backward compatible
- Not modifying database schema (only adding indexes)
- Preserving existing API contracts

---

## Notes
- All changes follow existing patterns in codebase
- No breaking changes to external APIs
- Performance improvements are measurable
- Security improvements (rate limiting, config validation)
- Better observability and debugging capabilities

Last Updated: August 24, 2025