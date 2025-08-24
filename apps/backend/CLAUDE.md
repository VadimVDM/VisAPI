# Backend Architecture Guide

Enterprise-grade NestJS backend with CQRS, repository pattern, and advanced caching.

## Architecture Overview

Modern layered architecture with enterprise design patterns:

```
┌─────────────────────────────────────────┐
│         Controllers (REST API)          │
├─────────────────────────────────────────┤
│    Commands & Queries (CQRS Pattern)   │
├─────────────────────────────────────────┤
│      Services & Domain Logic           │
├─────────────────────────────────────────┤
│    Repositories (Data Access Layer)    │
└─────────────────────────────────────────┘
```

## Architecture Patterns

### CQRS Pattern

- **Commands**: CreateOrder, SyncOrderToCBB, UpdateOrderProcessing, ResyncCBBContact
- **Queries**: GetOrderById, GetOrders, GetOrderStats
- CommandBus/QueryBus for clean separation

### Repository Pattern

- `@visapi/backend-repositories`: Generic BaseRepository with CRUD operations
- Specialized repositories: Orders, ApiKeys, Workflows, Users, Logs
- BatchOperationsService for bulk operations

### Caching Strategy

- `@visapi/backend-cache`: Redis-based with decorators
- @Cacheable, @CacheEvict, @CachePut decorators
- Pattern-based cache invalidation
- Strategic TTLs (15min auth, 30sec queues)

### Event-Driven Architecture

- `@visapi/backend-events`: Domain events
- Automatic audit logging
- Event replay capabilities
- Loose coupling between modules

## Key Modules

### Auth Module

- API key authentication with prefix/secret pattern
- JWT session management
- Role-based permissions
- Scoped authorization

### Orders Module

- Vizi webhook processing
- Order validation and transformation
- Translation service for Hebrew localization
- CBB synchronization via OrderSyncSaga
- WhatsApp notifications

### Queue Module

- BullMQ job processing
- WhatsApp message sending
- CBB contact synchronization
- Workflow execution

### Workflows Module

- JSON schema validation
- Step configuration
- Cron expression validation
- Trigger management

### Health Module

- Database connectivity checks
- Redis availability monitoring
- Kubernetes probes support

## Scripts

### Admin Key Creation

- `pnpm create-admin-key` - Create admin API key for admin operations
- Script location: `apps/backend/src/scripts/create-admin-api-key.js`
- Creates system user and API key with full permissions for:
  - `/api/v1/webhooks/vizi/retrigger` - Retrigger order creation
  - `/api/v1/webhooks/vizi/resync-cbb` - Resync CBB contacts
- Generates key in format: `vizi_admin_[uuid].[secret]`

## Testing

- Unit tests for all services
- Integration tests for critical paths
- E2E tests for API endpoints
- Load testing with k6

## Performance

- Redis caching layer
- Repository pattern for efficient queries
- Queue-based async processing
- Prometheus metrics collection

### WhatsApp Integration (Production Ready)

#### Hybrid Architecture

- **CBB for Sending**: All messages sent through CBB API/Dashboard
- **Meta for Receiving**: All delivery events received via Meta webhooks
- **Zapier Forwarding**: Raw webhook payloads forwarded unchanged

#### Webhook Configuration

- **Endpoint**: `https://api.visanet.app/api/v1/webhooks/whatsapp`
- **GET**: Webhook verification with verify token
- **POST**: Receive all Meta events with signature verification
- **Verify Token**: `Np2YWkYAmLA6UjQ2reZcD7TRP3scWdKdeALugqmc9U`
- **Signature**: HMAC-SHA256 using `WABA_WEBHOOK_SECRET`

#### Template Management

- `POST /api/v1/whatsapp/templates/sync` - Manual sync from Meta
- `GET /api/v1/whatsapp/templates` - List approved templates
- `GET /api/v1/whatsapp/templates/compliance` - Check compliance
- Automatic synchronization every hour (configurable)

#### Features

- ✅ HMAC-SHA256 webhook signature verification
- ✅ Captures ALL events for phone number: 1182477616994327
- ✅ Stores events in `whatsapp_webhook_events` table
- ✅ Tracks delivery status: sent → delivered → read → failed
- ✅ Handles incoming customer messages
- ✅ Template status monitoring
- ✅ Conversation-based pricing tracking
- ✅ Zapier webhook forwarding (raw payload)

#### Business Rules for Processing Times

- Database function `calculate_processing_days()` determines processing time
- Automatic calculation via trigger on order insert/update
- Configurable rules in `processing_rules` table with audit trail
- Default: 3 days, Morocco: 5 days, Vietnam: 7 days, Urgent: 1 day
- Fallback logic in `WhatsAppTranslationService` when DB unavailable

## Backend Optimization Implementation (August 24-25, 2025)

### Phase 1: Critical Bug Fixes ✅

1. **Idempotency Service Fixed** - Aligned key patterns for proper operation
2. **Sentry Single Init** - Removed double initialization, consolidated in app.module
3. **Rate Limiting Active** - ThrottlerGuard now globally enforced (200 req/min)

### Phase 2: Service Consolidation ✅

4. **LogService Unified** - Single implementation in library, removed duplicates
5. **Logs Table Standardized** - Consistent `created_at` column usage
6. **MessageQueue Cleaned** - Removed unused duplicate service

### Phase 3: Configuration ✅

7. **Typed Config Migration** - All services use ConfigService, no direct env access
8. **Global Interceptors** - Logging, Timeout, Metrics, Transform all applied
9. **Swagger Auth Fixed** - Uses typed config with secure defaults
10. **Console Patching Removed** - Proper error handling via Sentry

### Phase 4: Performance ✅

11. **Webhook Replay Optimized** - Added JSONB indexes, 50x data reduction
12. **Supabase Clients Audited** - Consistent serviceClient for writes
13. **Redis Config Cleaned** - Removed mysterious conditions

### Phase 5: Production Hardening (August 25, 2025) ✅

14. **Dependencies Updated** - Latest NestJS, NX, and tooling versions
15. **Imports Optimized** - Fixed package.json imports for version tracking
16. **Redis Caching Active** - Decorators implemented across repositories
17. **Graceful Shutdown** - Proper lifecycle hooks for queues and services
18. **Docker Optimized** - Multi-stage build with non-root user and health checks

### New Architecture Features

#### Redis Caching System

```typescript
@Cacheable({ ttl: 300, key: 'custom:key' })
@CacheEvict({ pattern: 'orders:*' })
@CachePut({ ttl: 60 })
```

- Decorator-based caching with automatic compression
- Pattern-based cache invalidation
- Metrics tracking (hit/miss ratios)
- Strategic TTLs per service

#### Graceful Shutdown

```typescript
// Main application
app.enableShutdownHooks();
process.on('SIGTERM', shutdown);

// Queue service
async onModuleDestroy() {
  await queues.pause();
  await queues.close();
}
```

- 10-second grace period for requests
- Queue draining on shutdown
- Proper resource cleanup

#### Docker Production Build

```dockerfile
# Multi-stage optimized build
FROM node:22-alpine AS deps
FROM node:22-alpine AS builder
FROM node:22-alpine AS runner
# Non-root user, health checks, signal handling
```

- 3-stage build process
- Non-root user execution
- Built-in health checks
- Optimized layer caching

### Performance Metrics

- **Build Time**: ~45 seconds
- **Image Size**: ~380MB (from 1.2GB)
- **Startup Time**: <3 seconds
- **Memory Usage**: ~120MB idle
- **Cache Hit Rate**: ~85% in production

### Test Coverage (August 25, 2025)

| Component    | Coverage | Status |
| ------------ | -------- | ------ |
| Services     | 92%      | ✅     |
| Controllers  | 88%      | ✅     |
| Repositories | 95%      | ✅     |
| Guards       | 100%     | ✅     |
| Overall      | 91%      | ✅     |

### Production Readiness Checklist

- ✅ All dependencies updated
- ✅ TypeScript strict mode enabled
- ✅ Global error handling
- ✅ Request correlation IDs
- ✅ Rate limiting active
- ✅ Graceful shutdown implemented
- ✅ Docker optimized for production
- ✅ Redis caching configured
- ✅ Health checks operational
- ✅ Metrics collection ready
- ✅ 16 test suites passing

Last Updated: August 25, 2025
