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

### Service Pattern

- Direct service calls for streamlined architecture
- OrdersService handles order creation and sync triggering
- Event-driven updates via domain events

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

- Vizi webhook processing with phone normalization
- Order validation and transformation
- Translation service for Hebrew localization
- Direct CBB synchronization via OrderSyncService
- WhatsApp notifications

### Queue Module

- BullMQ job processing with Redis backing
- `whatsapp-messages` queue for order confirmations
- `cbb-sync` queue for contact synchronization
- `pdf` queue for PDF generation (processed by Worker)
- Uses `QUEUE_NAMES` constants (never hardcode queue names)

### Workflows Module

- JSON schema validation
- Step configuration
- Cron expression validation
- Trigger management

### PDF Module

- REST API for PDF generation requests
- Job queuing and status tracking
- Template management
- Preview mode support
- Webhook callbacks on completion

### Airtable Module

- `/api/v1/airtable/lookup` endpoint secured by API keys (`integrations:airtable:read` scope)
- Python subprocess execution (`src/airtable/scripts/airtable_lookup.py`) with pyairtable
- Searches by `orderid` or `email` field with case-insensitive matching
- **Automatic linked record expansion**: Fetches full details from Applications, Applicants, and Transactions tables
- Redis caching (5 min TTL) reduces API calls
- Docker requirements: Python 3, pip, pyairtable==3.2.0, requests
- Response statuses: `found` (with expansion), `none`, or `multiple`

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
- ✅ Message ID correlation (temp → real WAMID)
- ✅ Conversation-based pricing tracking
- ✅ Zapier webhook forwarding (raw payload)

#### Business Rules & Message Tracking

- **Processing Times**: Database function `calculate_processing_days()`
  - Default: 3 days, Morocco: 5 days, Vietnam: 7 days, Urgent: 1 day
- **Message ID Tracking**: Automatic correlation system
  - `MessageIdUpdaterService` handles webhook updates
  - Correlation via `biz_opaque_callback_data` field
  - `meta_message_id` column stores real Meta WAMIDs

## Backend Optimization Implementation (August 24-25, 2025)

### Backend Optimization Phases (Completed)

**Phase 1-3**: Bug fixes, service consolidation, typed configuration ✅
**Phase 4-5**: Performance optimization, production hardening ✅
**Phase 6**: Fastify migration, Redis rate limiting, RFC 7807 errors ✅
**Phase 7** (Sept 28): Service architecture refactoring ✅

### Key Architecture Features

- **Redis Caching**: Decorator-based with compression, pattern invalidation, metrics
- **Graceful Shutdown**: 10-second grace period, queue draining, resource cleanup
- **Docker Optimization**: 3-stage build, non-root user, health checks (~380MB)
- **Rate Limiting**: Redis-backed, 200 req/min per API key, multi-instance support
- **Error Handling**: RFC 7807 compliant with 26 structured error codes

### Performance & Quality Metrics

- **Build**: ~45 seconds, ~380MB image
- **Runtime**: <3s startup, ~120MB idle
- **Performance**: 85% cache hit rate, 20-30% throughput gain (Fastify)
- **Test Coverage**: 91% overall (Services 92%, Controllers 88%, Repositories 95%)

### Production Readiness

✅ TypeScript strict mode | ✅ RFC 7807 errors | ✅ Correlation IDs | ✅ Redis rate limiting
✅ Graceful shutdown | ✅ Docker optimized | ✅ Health checks | ✅ Metrics ready
✅ 16 test suites passing | ✅ Fastify migration complete | ✅ Service architecture refactored

---

**Version**: v1.1.2 Production
**Last Updated**: September 28, 2025

### Recent Changes (September 28, 2025)

**Architecture Simplification**
✅ **CQRS Removed**: Streamlined to direct service calls without command/query pattern
✅ **Phone Normalization**: Strips leading zeros from phone numbers after country codes
✅ **CBB Sync Fixed**: OrdersService directly triggers sync after order creation
✅ **Duplicate Prevention**: Prevents duplicate CBB contacts from phone format issues

**Service Architecture**
- **Vizi**: Split into focused services for webhooks, workflows, and admin operations
- **CBB**: Orchestrator delegates to specialized contact sync and WhatsApp services
- **Phone Processing**: Universal normalization at webhook transformation layer
