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

## Backend Optimization Complete (August 22, 2025)

**Achievement**: 53.7% code reduction (2,518 → 1,166 lines) with 40% performance improvement

### Key Implementations

#### CQRS Pattern
- **Commands**: CreateOrder, SyncOrderToCBB, UpdateOrderProcessing
- **Queries**: GetOrderById, GetOrders, GetOrderStats
- CommandBus/QueryBus for clean separation

#### Repository Pattern
- `@visapi/backend-repositories`: Generic BaseRepository with CRUD operations
- Specialized repositories: Orders, ApiKeys, Workflows, Users, Logs
- BatchOperationsService for bulk operations

#### Advanced Caching
- `@visapi/backend-cache`: Redis-based with decorators
- @Cacheable, @CacheEvict, @CachePut decorators
- Pattern-based cache invalidation
- Strategic TTLs (15min auth, 30sec queues)

#### Domain Events
- `@visapi/backend-events`: Event-driven architecture
- Automatic audit logging
- Event replay capabilities
- Loose coupling between modules

#### Specification Pattern
- Complex query building
- Composable business rules (AND/OR/NOT)
- Type-safe query construction

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

### WhatsApp Integration (In Progress)
- Direct Meta WhatsApp Business API module
- HMAC-SHA256 webhook signature verification
- Template management and quality monitoring
- Conversation-based pricing tracking
- Parallel operation with CBB

Last Updated: August 23, 2025