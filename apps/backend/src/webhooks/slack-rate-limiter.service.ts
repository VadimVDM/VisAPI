import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@visapi/backend-cache';

interface RateLimitConfig {
  maxNotifications: number; // Maximum notifications per window
  windowMs: number; // Time window in milliseconds
}

@Injectable()
export class SlackRateLimiterService {
  private readonly logger = new Logger(SlackRateLimiterService.name);
  private readonly defaultConfig: RateLimitConfig = {
    maxNotifications: 1, // 1 notification
    windowMs: 60 * 60 * 1000, // per hour
  };

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check if we should send a Slack notification based on rate limiting
   * @param notificationType Type of notification (e.g., 'webhook_failure', 'template_rejected')
   * @param key Optional specific key within the type (e.g., specific error message)
   * @returns true if notification should be sent, false if rate limited
   */
  async shouldSendNotification(
    notificationType: string,
    key?: string,
  ): Promise<boolean> {
    const cacheKey = this.getCacheKey(notificationType, key);
    const config = this.getConfigForType(notificationType);

    try {
      // Get current count from cache
      const currentCount = (await this.cacheService.get<number>(cacheKey)) || 0;

      if (currentCount >= config.maxNotifications) {
        this.logger.debug(
          `Rate limit exceeded for ${notificationType}${key ? `:${key}` : ''} ` +
            `(${currentCount}/${config.maxNotifications} in ${config.windowMs}ms window)`,
        );
        return false;
      }

      // Increment counter and set TTL to window duration
      await this.cacheService.set(
        cacheKey,
        currentCount + 1,
        Math.floor(config.windowMs / 1000), // Convert to seconds for Redis TTL
      );

      this.logger.debug(
        `Slack notification allowed for ${notificationType}${key ? `:${key}` : ''} ` +
          `(${currentCount + 1}/${config.maxNotifications})`,
      );

      return true;
    } catch (error) {
      // On cache error, allow the notification (fail open)
      this.logger.error(
        `Error checking rate limit for ${notificationType}: ${error}`,
      );
      return true;
    }
  }

  /**
   * Get the last time a notification was sent
   * @param notificationType Type of notification
   * @param key Optional specific key
   * @returns Date of last notification or null
   */
  async getLastNotificationTime(
    notificationType: string,
    key?: string,
  ): Promise<Date | null> {
    const timestampKey = `${this.getCacheKey(notificationType, key)}:timestamp`;

    try {
      const timestamp = await this.cacheService.get<string>(timestampKey);
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      this.logger.error(`Error getting last notification time: ${error}`);
      return null;
    }
  }

  /**
   * Record that a notification was sent
   * @param notificationType Type of notification
   * @param key Optional specific key
   */
  async recordNotificationSent(
    notificationType: string,
    key?: string,
  ): Promise<void> {
    const timestampKey = `${this.getCacheKey(notificationType, key)}:timestamp`;
    const config = this.getConfigForType(notificationType);

    try {
      await this.cacheService.set(
        timestampKey,
        new Date().toISOString(),
        Math.floor(config.windowMs / 1000), // Same TTL as rate limit window
      );
    } catch (error) {
      this.logger.error(`Error recording notification sent: ${error}`);
    }
  }

  /**
   * Reset rate limit for a specific notification type
   * @param notificationType Type of notification
   * @param key Optional specific key
   */
  async resetRateLimit(notificationType: string, key?: string): Promise<void> {
    const cacheKey = this.getCacheKey(notificationType, key);
    const timestampKey = `${cacheKey}:timestamp`;

    try {
      await this.cacheService.delete(cacheKey);
      await this.cacheService.delete(timestampKey);
      this.logger.debug(
        `Reset rate limit for ${notificationType}${key ? `:${key}` : ''}`,
      );
    } catch (error) {
      this.logger.error(`Error resetting rate limit: ${error}`);
    }
  }

  /**
   * Get rate limit status for a notification type
   * @param notificationType Type of notification
   * @param key Optional specific key
   */
  async getRateLimitStatus(
    notificationType: string,
    key?: string,
  ): Promise<{
    currentCount: number;
    maxNotifications: number;
    windowMs: number;
    canSend: boolean;
    lastSentAt: Date | null;
  }> {
    const cacheKey = this.getCacheKey(notificationType, key);
    const config = this.getConfigForType(notificationType);

    try {
      const currentCount = (await this.cacheService.get<number>(cacheKey)) || 0;
      const lastSentAt = await this.getLastNotificationTime(
        notificationType,
        key,
      );

      return {
        currentCount,
        maxNotifications: config.maxNotifications,
        windowMs: config.windowMs,
        canSend: currentCount < config.maxNotifications,
        lastSentAt,
      };
    } catch (error) {
      this.logger.error(`Error getting rate limit status: ${error}`);
      return {
        currentCount: 0,
        maxNotifications: config.maxNotifications,
        windowMs: config.windowMs,
        canSend: true,
        lastSentAt: null,
      };
    }
  }

  /**
   * Generate cache key for rate limiting
   */
  private getCacheKey(notificationType: string, key?: string): string {
    const baseKey = `slack_rate_limit:${notificationType}`;
    return key ? `${baseKey}:${key}` : baseKey;
  }

  /**
   * Get configuration for specific notification type
   */
  private getConfigForType(notificationType: string): RateLimitConfig {
    // Different rate limits for different notification types
    switch (notificationType) {
      case 'webhook_failure':
        return {
          maxNotifications: 1,
          windowMs: 60 * 60 * 1000, // 1 per hour
        };

      case 'template_rejected':
        return {
          maxNotifications: 1,
          windowMs: 24 * 60 * 60 * 1000, // 1 per day
        };

      case 'account_banned':
        return {
          maxNotifications: 10,
          windowMs: 60 * 1000, // 10 per minute (critical alert)
        };

      case 'message_failed':
        return {
          maxNotifications: 5,
          windowMs: 60 * 60 * 1000, // 5 per hour
        };

      default:
        return this.defaultConfig;
    }
  }
}
