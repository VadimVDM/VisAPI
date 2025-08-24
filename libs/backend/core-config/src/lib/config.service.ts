import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { getValidatedConfig, ValidatedConfig } from './config-schema';

@Injectable()
export class ConfigService {
  private cachedConfig?: ValidatedConfig;
  
  constructor(private configService?: NestConfigService) {}
  
  /**
   * Get the full validated configuration object
   * Can be used when ConfigService is instantiated without injection
   */
  getConfig(): ValidatedConfig {
    if (!this.cachedConfig) {
      this.cachedConfig = getValidatedConfig();
    }
    return this.cachedConfig;
  }

  // Generic get method for accessing any config value
  get<T = any>(propertyPath: string): T {
    if (!this.configService) {
      // Fallback to getting from validated config when ConfigService is used standalone
      const config = this.getConfig();
      const pathParts = propertyPath.split('.');
      let value: any = config;
      
      for (const part of pathParts) {
        value = value?.[part];
        if (value === undefined) {
          throw new Error(`Configuration value for '${propertyPath}' is not defined`);
        }
      }
      return value as T;
    }
    
    const value = this.configService.get<T>(propertyPath);
    if (value === undefined) {
      throw new Error(`Configuration value for '${propertyPath}' is not defined`);
    }
    return value;
  }

  get nodeEnv(): string {
    return this.get<string>('node.env') ?? 'development';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.get<number>('port');
  }

  get corsOrigin(): string[] {
    return this.get<string[]>('cors.origin');
  }

  get databaseUrl(): string {
    return this.get<string>('database.url');
  }

  get redisUrl(): string {
    return this.get<string>('redis.url');
  }

  get supabaseUrl(): string {
    return this.get<string>('supabase.url');
  }

  get supabaseServiceRoleKey(): string {
    return this.get<string>('supabase.serviceRoleKey');
  }

  get supabaseAnonKey(): string {
    return this.get<string>('supabase.anonKey');
  }

  get jwtSecret(): string {
    return this.get<string>('auth.jwtSecret');
  }

  get apiKeyPrefix(): string {
    return this.get<string>('auth.apiKeyPrefix');
  }

  get apiKeyExpiryDays(): number {
    return this.get<number>('auth.apiKeyExpiryDays');
  }

  get allowedEmailDomains(): string[] {
    return this.get<string[]>('auth.allowedEmailDomains');
  }

  get frontendUrl(): string {
    return this.get<string>('frontend.url');
  }

  get rateLimitBurst(): number {
    return this.get<number>('rateLimit.burst');
  }

  get rateLimitSustained(): number {
    return this.get<number>('rateLimit.sustained');
  }

  get queueConcurrency(): number {
    return this.get<number>('queue.concurrency');
  }

  get queueMaxRetries(): number {
    return this.get<number>('queue.maxRetries');
  }

  get queueRetryDelay(): number {
    return this.get<number>('queue.retryDelay');
  }

  get logLevel(): string {
    return this.get<string>('logging.level');
  }

  get logFormat(): string {
    return this.get<string>('logging.format');
  }

  get slackWebhookUrl(): string {
    return this.get<string>('slack.webhookUrl');
  }

  get slackBotToken(): string {
    return this.get<string>('slack.botToken');
  }

  get slackSigningSecret(): string {
    return this.get<string>('slack.signingSecret');
  }

  get slackDefaultChannel(): string {
    return this.get<string>('slack.defaultChannel');
  }

  get slackEnabled(): boolean {
    return this.get<boolean>('slack.enabled');
  }
  
  // CBB Configuration
  get cbbApiUrl(): string {
    return this.get<string>('cbb.apiUrl');
  }
  
  get cbbApiKey(): string {
    return this.get<string>('cbb.apiKey');
  }
  
  get cbbTimeout(): number {
    return this.get<number>('cbb.timeout');
  }
  
  get cbbRetryAttempts(): number {
    return this.get<number>('cbb.retryAttempts');
  }
  
  get cbbCacheTimeout(): number {
    return this.get<number>('cbb.cacheTimeout');
  }
  
  get cbbSyncEnabled(): boolean {
    return this.get<boolean>('cbb.syncEnabled');
  }
  
  get cbbSyncDryRun(): boolean {
    return this.get<boolean>('cbb.syncDryRun');
  }
  
  get cbbSyncBatchSize(): number {
    return this.get<number>('cbb.syncBatchSize');
  }
  
  get cbbSyncConcurrency(): number {
    return this.get<number>('cbb.syncConcurrency');
  }
  
  get cbbSyncDelayMs(): number {
    return this.get<number>('cbb.syncDelayMs');
  }
  
  // Resend Configuration
  get resendApiKey(): string {
    return this.get<string>('resend.apiKey');
  }
  
  get resendFromEmail(): string {
    return this.get<string>('resend.fromEmail');
  }

  // WhatsApp Configuration
  get whatsappMessageDelayMs(): number {
    return this.get<number>('whatsapp.messageDelayMs');
  }

  get whatsappProcessDelayMs(): number {
    return this.get<number>('whatsapp.processDelayMs');
  }

  // Workflow Configuration
  get workflowProcessingDelayMs(): number {
    return this.get<number>('workflow.processingDelayMs');
  }

  get workflowBatchProcessingSize(): number {
    return this.get<number>('workflow.batchProcessingSize');
  }
}
