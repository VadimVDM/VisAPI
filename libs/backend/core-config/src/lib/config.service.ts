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

  get allowedEmailDomains(): string[] {
    return this.configService.get<string[]>('auth.allowedEmailDomains');
  }

  get frontendUrl(): string {
    return this.configService.get<string>('frontend.url');
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

  get slackWebhookUrl(): string {
    return this.configService.get<string>('slack.webhookUrl');
  }

  get slackBotToken(): string {
    return this.configService.get<string>('slack.botToken');
  }

  get slackSigningSecret(): string {
    return this.configService.get<string>('slack.signingSecret');
  }

  get slackDefaultChannel(): string {
    return this.configService.get<string>('slack.defaultChannel');
  }

  get slackEnabled(): boolean {
    return this.configService.get<boolean>('slack.enabled');
  }
  
  // CGB Configuration
  get cgbApiUrl(): string {
    return this.configService.get<string>('cgb.apiUrl');
  }
  
  get cgbApiKey(): string {
    return this.configService.get<string>('cgb.apiKey');
  }
  
  get cgbTimeout(): number {
    return this.configService.get<number>('cgb.timeout');
  }
  
  get cgbRetryAttempts(): number {
    return this.configService.get<number>('cgb.retryAttempts');
  }
  
  get cgbCacheTimeout(): number {
    return this.configService.get<number>('cgb.cacheTimeout');
  }
  
  get cgbSyncEnabled(): boolean {
    return this.configService.get<boolean>('cgb.syncEnabled');
  }
  
  get cgbSyncDryRun(): boolean {
    return this.configService.get<boolean>('cgb.syncDryRun');
  }
  
  get cgbSyncBatchSize(): number {
    return this.configService.get<number>('cgb.syncBatchSize');
  }
  
  get cgbSyncConcurrency(): number {
    return this.configService.get<number>('cgb.syncConcurrency');
  }
  
  get cgbSyncDelayMs(): number {
    return this.configService.get<number>('cgb.syncDelayMs');
  }
  
  // Resend Configuration
  get resendApiKey(): string {
    return this.configService.get<string>('resend.apiKey');
  }
  
  get resendFromEmail(): string {
    return this.configService.get<string>('resend.fromEmail');
  }
}
