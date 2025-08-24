# Backend Cache Library

Enterprise-grade Redis caching with decorators, compression, and metrics.

## Overview

Provides decorator-based caching for NestJS services with automatic compression, metrics tracking, and pattern-based invalidation.

## Features

- **Decorator-based caching** - `@Cacheable`, `@CacheEvict`, `@CachePut`
- **Automatic compression** - Values >8KB compressed with gzip
- **Metrics tracking** - Hit/miss ratios, operation timings
- **Pattern invalidation** - Clear cache by patterns
- **Namespace support** - Multi-tenancy ready
- **TTL management** - Configurable per operation

## Usage

### Basic Caching

```typescript
import { Cacheable, CacheEvict, CachePut } from '@visapi/backend-cache';

@Injectable()
export class OrdersRepository {
  constructor(private readonly cacheService: CacheService) {}

  @Cacheable({ ttl: 300, key: 'orders:unprocessed' })
  async findUnprocessedOrders(limit = 100): Promise<OrderRecord[]> {
    // Database query here
  }

  @CacheEvict({ pattern: 'orders:*' })
  async markAsProcessed(orderId: string): Promise<void> {
    // Update operation
  }

  @CachePut({ ttl: 60 })
  async updateOrder(order: OrderRecord): Promise<OrderRecord> {
    // Update and cache result
  }
}
```

### Manual Cache Operations

```typescript
// Get or set pattern
const data = await cacheService.getOrSet(
  'key',
  async () => fetchFromDatabase(),
  300, // TTL in seconds
);

// Invalidate by tags
await cacheService.invalidateByTags(['orders', 'users']);

// Generate cache key
const key = cacheService.generateKey('prefix', { id: 123 });

// Namespaced keys
const nsKey = cacheService.generateNamespacedKey('tenant1', 'key');
```

## Decorators

### @Cacheable

Caches method results. Checks cache first, executes if miss.

```typescript
@Cacheable({
  ttl: 300,                              // Time to live in seconds
  key: 'custom:key',                     // Custom cache key
  condition: (...args) => args[0] > 0    // Conditional caching
})
```

### @CacheEvict

Removes cache entries after method execution.

```typescript
@CacheEvict({
  key: 'specific:key',      // Evict specific key
  pattern: 'prefix:*',      // Evict by pattern
  allEntries: true          // Clear all entries for class
})
```

### @CachePut

Updates cache with method result.

```typescript
@CachePut({
  ttl: 60,
  key: 'custom:key'
})
```

## Metrics

The CacheMetricsService provides Prometheus metrics:

- `cache_hits_total` - Total cache hits by operation and key prefix
- `cache_misses_total` - Total cache misses
- `cache_operations_total` - Total operations by type and status
- `cache_operation_duration_seconds` - Operation timing histogram
- `cache_size` - Current number of cached keys
- `cache_hit_ratio` - Current hit/miss ratio

## Configuration

```typescript
@Module({
  imports: [
    CacheModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
      defaultTTL: 300,
      compressionThreshold: 8192, // Compress values >8KB
    }),
  ],
})
```

## Implementation Details

### Compression

- Values larger than 8KB automatically compressed with gzip
- Transparent compression/decompression
- Compressed values prefixed with `COMPRESSED:`

### Key Generation

- MD5 hash of parameters for consistent keys
- Environment prefix for isolation
- Namespace support for multi-tenancy

### Statistics

```typescript
const stats = await cacheService.getStats();
// {
//   size: 1234,
//   memoryUsage: '12.5MB',
//   hits: 5678,
//   misses: 234,
//   hitRatio: 0.96
// }
```

## Performance Impact

- **Cache hit latency**: <1ms
- **Cache miss penalty**: ~5ms for compression
- **Memory overhead**: ~10% for metadata
- **Hit ratio target**: >85% in production

Last Updated: August 25, 2025
