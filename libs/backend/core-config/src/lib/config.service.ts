import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('node.env');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.configService.get<number>('port');
  }

  get corsOrigin(): string[] {
    return this.configService.get<string[]>('cors.origin');
  }

  get databaseUrl(): string {
    return this.configService.get<string>('database.url');
  }

  get redisUrl(): string {
    return this.configService.get<string>('redis.url');
  }

  get supabaseUrl(): string {
    return this.configService.get<string>('supabase.url');
  }

  get supabaseServiceRoleKey(): string {
    return this.configService.get<string>('supabase.serviceRoleKey');
  }

  get supabaseAnonKey(): string {
    return this.configService.get<string>('supabase.anonKey');
  }

  get jwtSecret(): string {
    return this.configService.get<string>('auth.jwtSecret');
  }

  get apiKeyPrefix(): string {
    return this.configService.get<string>('auth.apiKeyPrefix');
  }

  get apiKeyExpiryDays(): number {
    return this.configService.get<number>('auth.apiKeyExpiryDays');
  }

  get rateLimitBurst(): number {
    return this.configService.get<number>('rateLimit.burst');
  }

  get rateLimitSustained(): number {
    return this.configService.get<number>('rateLimit.sustained');
  }

  get queueConcurrency(): number {
    return this.configService.get<number>('queue.concurrency');
  }

  get queueMaxRetries(): number {
    return this.configService.get<number>('queue.maxRetries');
  }

  get queueRetryDelay(): number {
    return this.configService.get<number>('queue.retryDelay');
  }

  get logLevel(): string {
    return this.configService.get<string>('logging.level');
  }

  get logFormat(): string {
    return this.configService.get<string>('logging.format');
  }
}
