import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

/**
 * CacheMetricsService - Prometheus metrics for cache operations
 * 
 * Tracks:
 * - Cache hits/misses by operation and key pattern
 * - Cache operation latency
 * - Cache size and memory usage
 * - TTL distribution
 * - Eviction rates
 */
@Injectable()
export class CacheMetricsService {
  // Cache hit/miss counters
  private readonly cacheHitsCounter: Counter<string>;
  private readonly cacheMissesCounter: Counter<string>;
  
  // Cache operation counters
  private readonly cacheOperationsCounter: Counter<string>;
  
  // Cache operation latency histogram
  private readonly cacheLatencyHistogram: Histogram<string>;
  
  // Cache size gauge
  private readonly cacheSizeGauge: Gauge<string>;
  
  // Cache memory usage gauge
  private readonly cacheMemoryGauge: Gauge<string>;
  
  // Cache evictions counter
  private readonly cacheEvictionsCounter: Counter<string>;
  
  // Hit ratio gauge (calculated)
  private readonly cacheHitRatioGauge: Gauge<string>;

  constructor() {
    // Initialize cache hit counter
    this.cacheHitsCounter = new Counter({
      name: 'visapi_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['operation', 'key_prefix', 'cache_name'],
      registers: [register],
    });

    // Initialize cache miss counter
    this.cacheMissesCounter = new Counter({
      name: 'visapi_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['operation', 'key_prefix', 'cache_name'],
      registers: [register],
    });

    // Initialize cache operations counter
    this.cacheOperationsCounter = new Counter({
      name: 'visapi_cache_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['operation', 'status', 'cache_name'],
      registers: [register],
    });

    // Initialize cache latency histogram
    this.cacheLatencyHistogram = new Histogram({
      name: 'visapi_cache_operation_duration_seconds',
      help: 'Cache operation duration in seconds',
      labelNames: ['operation', 'cache_name'],
      buckets: [0.001, 0.005, 0.010, 0.025, 0.050, 0.100, 0.250, 0.500, 1.0],
      registers: [register],
    });

    // Initialize cache size gauge
    this.cacheSizeGauge = new Gauge({
      name: 'visapi_cache_keys_total',
      help: 'Total number of keys in cache',
      labelNames: ['cache_name'],
      registers: [register],
    });

    // Initialize cache memory gauge
    this.cacheMemoryGauge = new Gauge({
      name: 'visapi_cache_memory_bytes',
      help: 'Cache memory usage in bytes',
      labelNames: ['cache_name'],
      registers: [register],
    });

    // Initialize cache evictions counter
    this.cacheEvictionsCounter = new Counter({
      name: 'visapi_cache_evictions_total',
      help: 'Total number of cache evictions',
      labelNames: ['reason', 'cache_name'],
      registers: [register],
    });

    // Initialize hit ratio gauge
    this.cacheHitRatioGauge = new Gauge({
      name: 'visapi_cache_hit_ratio',
      help: 'Cache hit ratio (hits / (hits + misses))',
      labelNames: ['cache_name', 'window'],
      registers: [register],
    });
  }

  /**
   * Record a cache hit
   */
  recordHit(operation: string, keyPrefix: string, cacheName = 'default'): void {
    this.cacheHitsCounter.labels(operation, keyPrefix, cacheName).inc();
  }

  /**
   * Record a cache miss
   */
  recordMiss(operation: string, keyPrefix: string, cacheName = 'default'): void {
    this.cacheMissesCounter.labels(operation, keyPrefix, cacheName).inc();
  }

  /**
   * Record a cache operation
   */
  recordOperation(
    operation: string,
    status: 'success' | 'error',
    cacheName = 'default'
  ): void {
    this.cacheOperationsCounter.labels(operation, status, cacheName).inc();
  }

  /**
   * Record cache operation latency
   */
  recordLatency(
    operation: string,
    durationMs: number,
    cacheName = 'default'
  ): void {
    this.cacheLatencyHistogram
      .labels(operation, cacheName)
      .observe(durationMs / 1000); // Convert to seconds
  }

  /**
   * Start timing an operation
   */
  startTimer(operation: string, cacheName = 'default'): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.recordLatency(operation, duration, cacheName);
    };
  }

  /**
   * Update cache size metric
   */
  updateCacheSize(size: number, cacheName = 'default'): void {
    this.cacheSizeGauge.labels(cacheName).set(size);
  }

  /**
   * Update cache memory usage metric
   */
  updateMemoryUsage(bytes: number, cacheName = 'default'): void {
    this.cacheMemoryGauge.labels(cacheName).set(bytes);
  }

  /**
   * Record a cache eviction
   */
  recordEviction(reason: 'ttl' | 'lru' | 'manual' | 'memory', cacheName = 'default'): void {
    this.cacheEvictionsCounter.labels(reason, cacheName).inc();
  }

  /**
   * Calculate and update hit ratio
   */
  async updateHitRatio(cacheName = 'default', window = '1m'): Promise<void> {
    // Get current metric values
    const hits = await this.getMetricValue(this.cacheHitsCounter, { cache_name: cacheName });
    const misses = await this.getMetricValue(this.cacheMissesCounter, { cache_name: cacheName });
    
    const total = hits + misses;
    const ratio = total > 0 ? hits / total : 0;
    
    this.cacheHitRatioGauge.labels(cacheName, window).set(ratio);
  }

  /**
   * Get metric value (helper method)
   */
  private async getMetricValue(
    metric: Counter<string> | Gauge<string>,
    labels: Record<string, string>
  ): Promise<number> {
    const metrics = await register.getSingleMetricAsString(metric.name);
    // Parse the metric value (simplified - in production use proper parsing)
    const value = 0; // This would need proper implementation
    return value;
  }

  /**
   * Extract key prefix from cache key
   */
  extractKeyPrefix(key: string): string {
    const parts = key.split(':');
    return parts.length > 0 ? parts[0] : 'unknown';
  }

  /**
   * Get cache statistics summary
   */
  async getCacheStats(cacheName = 'default'): Promise<{
    hits: number;
    misses: number;
    hitRatio: number;
    size: number;
    memoryBytes: number;
    evictions: number;
  }> {
    // This would need to query actual metric values
    // For now, return placeholder
    return {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      size: 0,
      memoryBytes: 0,
      evictions: 0,
    };
  }
}