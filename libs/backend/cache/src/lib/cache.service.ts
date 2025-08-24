import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { Redis } from 'ioredis';
import { createHash } from 'crypto';
import { CacheMetricsService } from './cache-metrics.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  prefix?: string; // Cache key prefix
  compress?: boolean; // Compress large values
  namespace?: string; // Cache namespace for multi-tenancy
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 300; // 5 minutes
  private readonly compressionThreshold = 8192; // 8KB

  constructor(
    private readonly redis: Redis,
    @Optional() private readonly metrics?: CacheMetricsService,
  ) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Get a value from cache with metrics tracking
   */
  async get<T>(key: string): Promise<T | null> {
    const timer = this.metrics?.startTimer('get');
    const keyPrefix = this.metrics?.extractKeyPrefix(key) || 'unknown';

    try {
      const value = await this.redis.get(key);

      if (!value) {
        this.metrics?.recordMiss('get', keyPrefix);
        timer?.();
        return null;
      }

      this.metrics?.recordHit('get', keyPrefix);
      this.metrics?.recordOperation('get', 'success');
      timer?.();

      // Handle compressed values
      if (value.startsWith('COMPRESSED:')) {
        const compressed = value.slice(11);
        const decompressed = await this.decompress(compressed);
        return JSON.parse(decompressed) as T;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      this.metrics?.recordOperation('get', 'error');
      timer?.();
      return null;
    }
  }

  /**
   * Set a value in cache with metrics tracking and optional compression
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const timer = this.metrics?.startTimer('set');

    try {
      let serialized = JSON.stringify(value);

      // Compress large values
      if (serialized.length > this.compressionThreshold) {
        const compressed = await this.compress(serialized);
        serialized = `COMPRESSED:${compressed}`;
        this.logger.debug(
          `Compressed cache value for key ${key}: ${serialized.length} bytes`,
        );
      }

      const finalTTL = ttl || this.defaultTTL;
      await this.redis.setex(key, finalTTL, serialized);

      this.metrics?.recordOperation('set', 'success');
      timer?.();
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
      this.metrics?.recordOperation('set', 'error');
      timer?.();
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deleteByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(
        `Error deleting cache keys by pattern ${pattern}:`,
        error,
      );
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, execute factory and cache the result
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.deleteByPattern(`*:${tag}:*`);
    }
  }

  /**
   * Generate cache key from parameters
   */
  generateKey(prefix: string, params: any): string {
    const hash = createHash('md5').update(JSON.stringify(params)).digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * Increment a counter
   */
  async increment(key: string, by = 1): Promise<number> {
    return this.redis.incrby(key, by);
  }

  /**
   * Decrement a counter
   */
  async decrement(key: string, by = 1): Promise<number> {
    return this.redis.decrby(key, by);
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl);
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  /**
   * Flush all cache
   */
  async flush(): Promise<void> {
    await this.redis.flushdb();
    this.logger.warn('Cache flushed');
  }

  /**
   * Get cache statistics with enhanced metrics
   */
  async getStats(): Promise<{
    size: number;
    memoryUsage: string;
    hits: number;
    misses: number;
    hitRatio?: number;
  }> {
    const info = await this.redis.info('stats');
    const stats = info
      .split('\r\n')
      .reduce((acc: Record<string, string>, line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {});

    const size = await this.redis.dbsize();
    const hits = parseInt(stats['keyspace_hits'] || '0', 10);
    const misses = parseInt(stats['keyspace_misses'] || '0', 10);
    const total = hits + misses;
    const hitRatio = total > 0 ? hits / total : 0;

    // Update metrics
    this.metrics?.updateCacheSize(size);
    this.metrics?.updateHitRatio();

    return {
      size,
      memoryUsage: stats['used_memory_human'] || 'N/A',
      hits,
      misses,
      hitRatio,
    };
  }

  /**
   * Compress data using zlib
   */
  private async compress(data: string): Promise<string> {
    const { gzip } = await import('zlib');
    const { promisify } = await import('util');
    const gzipAsync = promisify(gzip);

    const compressed = await gzipAsync(Buffer.from(data, 'utf-8'));
    return compressed.toString('base64');
  }

  /**
   * Decompress data using zlib
   */
  private async decompress(data: string): Promise<string> {
    const { gunzip } = await import('zlib');
    const { promisify } = await import('util');
    const gunzipAsync = promisify(gunzip);

    const buffer = Buffer.from(data, 'base64');
    const decompressed = await gunzipAsync(buffer);
    return decompressed.toString('utf-8');
  }

  /**
   * Generate namespaced cache key
   */
  generateNamespacedKey(namespace: string, key: string): string {
    const env = process.env.NODE_ENV || 'development';
    return `${env}:${namespace}:${key}`;
  }
}
