import { SetMetadata } from '@nestjs/common';
import { CacheService } from './cache.service';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

/**
 * Decorator to cache method results
 */
export function Cacheable(options?: {
  ttl?: number;
  key?: string;
  condition?: (...args: any[]) => boolean;
}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Check condition if provided
      if (options?.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Get cache service from the instance
      const cacheService: CacheService = (this as any).cacheService;
      if (!cacheService) {
        console.warn(
          `CacheService not found in ${target.constructor.name}. Skipping cache.`,
        );
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const className = target.constructor.name;
      const methodName = propertyName;
      const cacheKey =
        options?.key ||
        cacheService.generateKey(`${className}:${methodName}`, args);

      // Try to get from cache
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute method and cache result
      const result = await originalMethod.apply(this, args);
      await cacheService.set(cacheKey, result, options?.ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator to evict cache entries
 */
export function CacheEvict(options?: {
  key?: string;
  pattern?: string;
  allEntries?: boolean;
}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Execute the original method first
      const result = await originalMethod.apply(this, args);

      // Get cache service from the instance
      const cacheService: CacheService = (this as any).cacheService;
      if (!cacheService) {
        console.warn(
          `CacheService not found in ${target.constructor.name}. Skipping cache eviction.`,
        );
        return result;
      }

      // Evict cache based on options
      if (options?.allEntries) {
        const className = target.constructor.name;
        await cacheService.deleteByPattern(`${className}:*`);
      } else if (options?.pattern) {
        await cacheService.deleteByPattern(options.pattern);
      } else if (options?.key) {
        await cacheService.delete(options.key);
      } else {
        // Default: evict by generated key
        const className = target.constructor.name;
        const methodName = propertyName;
        const cacheKey = cacheService.generateKey(
          `${className}:${methodName}`,
          args,
        );
        await cacheService.delete(cacheKey);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator to put/update cache entries
 */
export function CachePut(options?: { ttl?: number; key?: string }) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Execute the original method
      const result = await originalMethod.apply(this, args);

      // Get cache service from the instance
      const cacheService: CacheService = (this as any).cacheService;
      if (!cacheService) {
        console.warn(
          `CacheService not found in ${target.constructor.name}. Skipping cache put.`,
        );
        return result;
      }

      // Generate cache key
      const className = target.constructor.name;
      const methodName = propertyName;
      const cacheKey =
        options?.key ||
        cacheService.generateKey(`${className}:${methodName}`, args);

      // Update cache with result
      await cacheService.set(cacheKey, result, options?.ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * Class decorator to enable caching
 */
export function EnableCache() {
  return function (target: any) {
    // This decorator marks a class as cache-enabled
    SetMetadata('cache:enabled', true)(target);
  };
}

/**
 * Parameter decorator for cache key
 */
export function CacheKey() {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const existingKeys =
      Reflect.getMetadata('cache:keys', target, propertyKey) || [];
    existingKeys.push(parameterIndex);
    Reflect.defineMetadata('cache:keys', existingKeys, target, propertyKey);
  };
}

/**
 * Metadata helper to set cache TTL
 */
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);
