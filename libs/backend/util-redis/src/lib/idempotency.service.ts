import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

// Redis client interface - to be injected
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode?: string,
    duration?: number,
    flag?: string
  ): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  eval(script: string, numKeys: number, ...args: string[]): Promise<any>;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: RedisClient) {}

  /**
   * Check if an idempotency key has already been processed and return cached result
   */
  private async checkIdempotency(key: string): Promise<any> {
    try {
      const cachedResult = await this.redis.get(`idempotent:${key}:result`);
      return cachedResult ? JSON.parse(cachedResult) : null;
    } catch (error) {
      this.logger.warn(`Failed to check idempotency for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Store the result of an idempotent operation
   */
  private async storeResult(
    key: string,
    result: any,
    ttl: number = 3600
  ): Promise<void> {
    try {
      await this.redis.setex(
        `idempotent:${key}:result`,
        ttl,
        JSON.stringify({
          result,
          timestamp: Date.now(),
          status: 'completed',
        })
      );
      this.logger.debug(`Stored idempotent result for key: ${key}`);
    } catch (error) {
      this.logger.warn(
        `Failed to store idempotent result for key ${key}:`,
        error
      );
    }
  }

  /**
   * Execute an operation with idempotency protection
   */
  async checkAndExecute<T>(
    key: string,
    executor: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const lockKey = `idempotent:${key}:lock`;
    const resultKey = `idempotent:${key}:result`;

    // Check if result already exists
    const existingResult = await this.redis.get(resultKey);
    if (existingResult) {
      this.logger.debug(`Returning cached idempotent result for key: ${key}`);
      const parsed = JSON.parse(existingResult);
      return parsed.result;
    }

    // Try to acquire lock
    const lockId = randomUUID();
    const lockAcquired = await this.redis.set(
      lockKey,
      lockId,
      'PX',
      300000,
      'NX'
    );

    if (lockAcquired !== 'OK') {
      // Another request is processing, wait and check for result
      await this.waitForResult(resultKey, 30000); // Wait up to 30 seconds
      const result = await this.redis.get(resultKey);
      if (result) {
        const parsed = JSON.parse(result);
        return parsed.result;
      }
      throw new Error('Idempotent operation failed - no result available');
    }

    try {
      // Execute the operation
      this.logger.debug(`Executing idempotent operation for key: ${key}`);
      const result = await executor();

      // Store result
      await this.storeResult(key, result, ttl);

      return result;
    } finally {
      // Release lock
      await this.releaseLock(lockKey, lockId);
    }
  }

  /**
   * Mark an operation as in progress to prevent concurrent execution
   */
  private async markInProgress(key: string, ttl: number = 300): Promise<boolean> {
    try {
      const success = await this.redis.set(
        `idempotent:${key}:lock`,
        'processing',
        'PX',
        ttl * 1000,
        'NX'
      );
      return success === 'OK';
    } catch (error) {
      this.logger.warn(
        `Failed to mark operation as in progress for key ${key}:`,
        error
      );
      return false;
    }
  }

  /**
   * Wait for a result to become available (polling with backoff)
   */
  private async waitForResult(
    resultKey: string,
    maxWaitMs: number
  ): Promise<void> {
    const startTime = Date.now();
    let delay = 100; // Start with 100ms delay

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.redis.get(resultKey);
      if (result) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 2000); // Exponential backoff, max 2s
    }
  }

  /**
   * Release a distributed lock using Lua script for atomicity
   */
  private async releaseLock(lockKey: string, lockId: string): Promise<boolean> {
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await this.redis.eval(script, 1, lockKey, lockId);
      return result === 1;
    } catch (error) {
      this.logger.warn(`Failed to release lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Clear an idempotency key (for testing or manual cleanup)
   */
  async clearIdempotencyKey(key: string): Promise<void> {
    try {
      await this.redis.del(`idempotent:${key}:lock`);
      await this.redis.del(`idempotent:${key}:result`);
      this.logger.debug(`Cleared idempotency key: ${key}`);
    } catch (error) {
      this.logger.warn(`Failed to clear idempotency key ${key}:`, error);
    }
  }

  /**
   * Public method to get cached result for an idempotency key
   */
  async get(key: string): Promise<any> {
    return this.checkIdempotency(key);
  }

  /**
   * Public method to store result for an idempotency key
   */
  async set(key: string, result: any, ttl: number = 3600): Promise<void> {
    return this.storeResult(key, result, ttl);
  }
}
