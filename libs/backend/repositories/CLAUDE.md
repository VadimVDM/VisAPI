# Backend Repositories Library

Data access layer with repository pattern, caching, and batch operations.

## Overview

Provides a consistent repository pattern for database operations with built-in caching, type safety, and batch processing capabilities.

## Architecture

```
┌─────────────────────────────────┐
│     Service Layer               │
├─────────────────────────────────┤
│     Repository Layer            │ ← You are here
├─────────────────────────────────┤
│     Supabase Client             │
└─────────────────────────────────┘
```

## Base Repository

All repositories extend `BaseRepository<T>` providing:

- CRUD operations (create, findOne, findMany, update, delete)
- Batch operations (createMany, updateMany, deleteMany)
- Query building with filters, sorting, pagination
- Automatic timestamp management
- Type-safe operations with TypeScript generics

## Specialized Repositories

### OrdersRepository

Manages visa order records with caching optimizations.

**Cached Operations:**

- `findUnprocessedOrders()` - 30s TTL
- `findPendingWhatsAppConfirmations()` - 30s TTL
- `findPendingCBBSync()` - 30s TTL
- `getStatistics()` - 60s TTL

**Cache Eviction:**

- `markAsProcessed()` - Clears `orders:*`
- `markWhatsAppConfirmationSent()` - Clears `orders:whatsapp:*`
- `markCBBSynced()` - Clears `orders:cbb:*`
- `bulkUpdate()` - Clears all order caches

### ApiKeysRepository

Manages API key authentication with hashing.

**Features:**

- Bcrypt hashing for secrets
- Prefix-based key generation
- Scope-based permissions
- User association

### WorkflowsRepository

Handles workflow configurations and executions.

**Features:**

- JSON schema validation
- Cron expression support
- Execution history tracking
- Step configuration

### UsersRepository

User management with role-based access.

**Features:**

- Email-based lookup
- Role management
- Organization support
- Activity tracking

### LogsRepository

Centralized logging with PII redaction.

**Features:**

- Structured log entries
- Metadata support (JSONB)
- Level-based filtering
- Time-range queries

## Caching Strategy

```typescript
// Repository with caching decorators
@Injectable()
export class OrdersRepository extends BaseRepository<OrderRecord> {
  @Cacheable({ ttl: 30, key: 'orders:unprocessed' })
  async findUnprocessedOrders(limit = 100): Promise<OrderRecord[]> {
    // Query implementation
  }

  @CacheEvict({ pattern: 'orders:*' })
  async markAsProcessed(orderId: string): Promise<OrderRecord> {
    // Update implementation
  }
}
```

## Usage Examples

### Basic CRUD

```typescript
// Create
const order = await ordersRepo.create({
  order_id: 'ORD-123',
  client_name: 'John Doe',
  // ...
});

// Read
const order = await ordersRepo.findOne({
  where: { order_id: 'ORD-123' },
  include: ['workflow_executions'],
});

// Update
const updated = await ordersRepo.update('order-id', {
  order_status: 'processed',
});

// Delete
await ordersRepo.delete('order-id');
```

### Advanced Queries

```typescript
// Find with filters
const orders = await ordersRepo.findMany({
  where: {
    branch: 'il',
    order_status: 'pending',
  },
  orderBy: 'created_at',
  orderDirection: 'desc',
  limit: 10,
  offset: 0,
});

// Custom repository methods
const pending = await ordersRepo.findPendingWhatsAppConfirmations(50);
const stats = await ordersRepo.getStatistics('il');
```

### Batch Operations

```typescript
// Bulk create
const orders = await batchOps.createMany('orders', [
  { order_id: 'ORD-1', ... },
  { order_id: 'ORD-2', ... }
]);

// Bulk update
await ordersRepo.bulkUpdate(
  ['id-1', 'id-2'],
  { processed_at: new Date().toISOString() }
);
```

## Performance Optimizations

### Cache TTLs

- **Unprocessed orders**: 30 seconds (frequently changing)
- **Statistics**: 60 seconds (expensive aggregation)
- **Pending operations**: 30 seconds (queue processing)

### Query Optimization

- Indexed columns for common filters
- JSONB indexes for metadata queries
- Composite indexes for multi-column searches
- Limit/offset for pagination

### Connection Management

- Uses Supabase service client for writes
- Can use regular client for RLS-protected reads
- Connection pooling handled by Supabase

## Best Practices

1. **Always use repositories** - Don't access Supabase directly
2. **Cache expensive queries** - Use decorators for repeated reads
3. **Evict on writes** - Clear related caches on updates
4. **Use batch operations** - For multiple records
5. **Type your queries** - Leverage TypeScript generics

## Testing

```typescript
// Mock repository in tests
const mockOrdersRepo = {
  findOne: jest.fn().mockResolvedValue(mockOrder),
  create: jest.fn().mockResolvedValue(mockOrder),
  // ...
};

// Provide in test module
TestingModule.compile({
  providers: [
    {
      provide: OrdersRepository,
      useValue: mockOrdersRepo,
    },
  ],
});
```

Last Updated: August 25, 2025
