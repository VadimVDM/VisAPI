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

## Architecture Review Implementation (August 23, 2025)

### Completed Optimizations (Session 2)

8 out of 14 planned optimizations implemented:

1. **Zod Config Validation** ✅
   - Created `libs/backend/core-config/src/lib/config-schema.ts`
   - Comprehensive environment validation with strict types
   - ⚠️ Has type errors in default values that need fixing

2. **Correlation ID Tracking** ✅
   - Added X-Request-Id and X-Correlation-Id headers
   - Enhanced GlobalExceptionFilter with correlation support
   - ⚠️ Not yet deployed to production

3. **Trust Proxy Configuration** ✅
   - Production-specific settings for Railway/Vercel
   - Ensures correct client IP detection

4. **Swagger Security** ✅
   - Created SwaggerAuthGuard at `src/common/guards/swagger-auth.guard.ts`
   - Supports API key and Basic authentication
   - Protected /api/docs routes

5. **TypeScript Strict Mode** ✅
   - Enabled in tsconfig.app.json
   - ⚠️ 315 type errors need fixing before production

6. **Modern Build System (tsup)** ✅
   - Created tsup.config.ts with esbuild
   - ⚠️ Missing external dependencies configuration

7. **Enhanced Cache Metrics** ✅
   - Created CacheMetricsService with Prometheus metrics
   - Added compression for values >8KB
   - Hit/miss ratio tracking

8. **WhatsApp Business API** ✅
   - Module structure at `libs/backend/whatsapp-business/`
   - HMAC-SHA256 webhook verification
   - Meta credentials configured and verified
   - Template synchronization operational
   - Webhook endpoint receiving all events
   - 100% complete and production ready

### Test Results (August 24, 2025)

| Test | Command | Status | Issues |
|------|---------|--------|--------|
| TypeScript Strict | `pnpm typecheck:backend` | ✅ | Fixed |
| Health Check | `curl /api/v1/healthz` | ✅ | Working |
| WhatsApp Webhook | Meta verification | ✅ | Verified |
| Template Sync | `/api/v1/whatsapp/templates` | ✅ | 10 templates |
| Build | `pnpm build:backend` | ✅ | Success |

### Recent Updates (August 24, 2025)

1. **CBB Contact Resync API** ✅ - Admin endpoint for manual CBB sync recovery
2. **WhatsApp Integration** ✅ - Fully operational with Meta webhooks
3. **Webhook Signature Verification** ✅ - HMAC-SHA256 validation working
4. **Zapier Forwarding** ✅ - Raw webhook payloads forwarded correctly
5. **TypeScript Strict Mode** ✅ - All errors resolved

Last Updated: August 24, 2025