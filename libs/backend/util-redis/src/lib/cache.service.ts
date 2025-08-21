import { Injectable, Inject, Logger } from '@nestjs/common';
import { RedisClient } from './idempotency.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix for namespacing
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 3600; // 1 hour default
  private readonly defaultPrefix = 'cache:';

  constructor(@Inject('REDIS_CLIENT') private readonly redis: RedisClient) {}

  /**
   * Get a value from cache with optional JSON parsing
   */
  async get<T = any>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.prefix);
    
    try {
      const value = await this.redis.get(fullKey);
      if (!value) return null;
      
      // Try to parse as JSON, fallback to raw value
      try {
        return JSON.parse(value);
      } catch {
        return value as T;
      }
    } catch (error) {
      this.logger.error(`Cache get error for key ${fullKey}:`, error);
      return null; // Fail gracefully
    }
  }

  /**
   * Set a value in cache with automatic JSON stringification
   */
  async set<T = any>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.prefix);
    const ttl = options?.ttl ?? this.defaultTTL;
    
    try {
      const serialized = typeof value === 'string' 
        ? value 
        : JSON.stringify(value);
      
      await this.redis.setex(fullKey, ttl, serialized);
      this.logger.debug(`Cached key ${fullKey} with TTL ${ttl}s`);
      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.prefix);
    
    try {
      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.prefix);
    
    try {
      const result = await this.redis.get(fullKey);
      return result !== null;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Get or set a value using a factory function (cache-aside pattern)
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      this.logger.debug(`Cache hit for key ${key}`);
      return cached;
    }
    
    // Cache miss - fetch fresh data
    this.logger.debug(`Cache miss for key ${key}, fetching fresh data`);
    const fresh = await factory();
    
    // Store in cache for next time
    await this.set(key, fresh, options);
    
    return fresh;
  }

  /**
   * Invalidate multiple cache keys by pattern
   */
  async invalidatePattern(pattern: string, options?: CacheOptions): Promise<number> {
    const prefix = options?.prefix ?? this.defaultPrefix;
    const fullPattern = `${prefix}${pattern}`;
    
    try {
      // Use SCAN to find matching keys (safer than KEYS for production)
      const keys = await this.scanKeys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      // Delete in batches for better performance
      const batchSize = 100;
      let deleted = 0;
      
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const result = await Promise.all(
          batch.map(key => this.redis.del(key))
        );
        deleted += result.reduce((sum, val) => sum + val, 0);
      }
      
      this.logger.log(`Invalidated ${deleted} cache keys matching pattern ${fullPattern}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Cache invalidation error for pattern ${fullPattern}:`, error);
      return 0;
    }
  }

  /**
   * Update TTL for an existing cache key
   */
  async touch(key: string, ttl?: number, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.prefix);
    const seconds = ttl ?? this.defaultTTL;
    
    try {
      const result = await this.redis.expire(fullKey, seconds);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache touch error for key ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a cache key
   */
  async ttl(key: string, options?: CacheOptions): Promise<number> {
    const fullKey = this.buildKey(key, options?.prefix);
    
    try {
      const result = await this.redis.ttl(fullKey);
      return result;
    } catch (error) {
      this.logger.error(`Cache TTL error for key ${fullKey}:`, error);
      return -1;
    }
  }

  /**
   * Build a full cache key with prefix
   */
  private buildKey(key: string, prefix?: string): string {
    const actualPrefix = prefix ?? this.defaultPrefix;
    return `${actualPrefix}${key}`;
  }

  /**
   * Scan for keys matching a pattern (production-safe alternative to KEYS)
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    
    return keys;
  }
}

// Add missing Redis methods to the interface
declare module './idempotency.service' {
  interface RedisClient {
    ttl(key: string): Promise<number>;
    scan(cursor: string, ...args: string[]): Promise<[string, string[]]>;
  }
}