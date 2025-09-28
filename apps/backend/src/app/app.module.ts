import { Module, Logger } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@visapi/core-config';
import { SupabaseModule } from '@visapi/core-supabase';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { HealthModule } from '../health/health.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ViziWebhooksModule } from '../webhooks/vizi/vizi-webhooks.module';
import { AdminModule } from '../admin/admin.module';
import { CronModule } from '../cron/cron.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { LogsModule } from '../logs/logs.module';
import { MetricsModule } from '../metrics/metrics.module';
import { EmailModule } from '../email/email.module';
import { HttpMetricsInterceptor } from '../metrics/http-metrics.interceptor';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from '../common/interceptors/timeout.interceptor';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { SlackModule } from '../notifications/slack.module';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { SentryModule } from '@sentry/nestjs/setup';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { CacheModule } from '@visapi/backend-cache';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { WhatsAppWebhooksModule } from '../webhooks/whatsapp-webhooks.module';
import { PdfModule } from '../pdf/pdf.module';
import Redis from 'ioredis';
import { AirtableModule } from '../airtable/airtable.module';

// Initialize Sentry if DSN is configured
const configService = new ConfigService();
const sentryConfig = configService.getConfig().monitoring.sentry;

// Dynamic Sentry import to avoid issues when module not available
if (sentryConfig.dsn) {
  import('@sentry/nestjs')
    .then((SentryModule) => {
      SentryModule.init({
        dsn: sentryConfig.dsn,
        environment: sentryConfig.environment,
        tracesSampleRate: sentryConfig.tracesSampleRate,
        release: sentryConfig.release,
        sendDefaultPii: sentryConfig.environment !== 'production',
        beforeSend(event) {
          // Filter out sensitive headers
          if (event.request?.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['x-api-key'];
            delete event.request.headers['cookie'];
          }
          // Filter out sensitive data from error messages
          if (event.exception?.values) {
            event.exception.values.forEach((exception) => {
              if (exception.value) {
                exception.value = exception.value
                  .replace(/password=\S+/gi, 'password=[REDACTED]')
                  .replace(/api[_-]?key=\S+/gi, 'api_key=[REDACTED]')
                  .replace(/token=\S+/gi, 'token=[REDACTED]');
              }
            });
          }
          return event;
        },
        ignoreErrors: [
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',
          'Network request failed',
          'NetworkError',
          'Failed to fetch',
          // Redis localhost connection attempts from BullMQ internal schedulers
          /Error: connect ECONNREFUSED 127\.0\.0\.1:6379/,
          // NestJS route converter warnings for wildcard paths
          /LegacyRouteConverter.*Unsupported route path.*\/api\//,
          // Node.js 22 punycode deprecation
          /\[DEP0040\].*punycode.*deprecated/,
          // BullMQ internal scheduler attempting localhost
          /connect ECONNREFUSED.*127\.0\.0\.1.*6379/,
        ],
      });
    })
    .catch((error) => {
      const logger = new Logger('SentryInitialization');
      logger.error('Failed to initialize Sentry:', error);
    });
}

@Module({
  imports: [
    SentryModule.forRoot(),
    // TracingModule, // TODO: Fix OpenTelemetry Resource import
    ConfigModule,
    CacheModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.logLevel,
          transport: !configService.isProduction
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                },
              }
            : undefined,
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Use public URL if available (for Railway), otherwise use standard URL
        let publicRedisUrl: string | undefined;
        try {
          publicRedisUrl = configService.get<string>('redis.publicUrl');
        } catch {
          // Public URL is optional
          publicRedisUrl = undefined;
        }
        const redisUrl = publicRedisUrl || configService.redisUrl;

        // If Redis is available, use Redis storage; otherwise fallback to in-memory
        const storage = redisUrl
          ? new ThrottlerStorageRedisService(
              new Redis(redisUrl, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => Math.min(times * 50, 2000),
              }),
            )
          : undefined;

        return {
          throttlers: [
            {
              ttl: 60000, // 1 minute
              limit: 200, // 200 requests per minute (default)
            },
          ],
          storage,
        };
      },
    }),
    SupabaseModule,
    AuthModule,
    LogsModule,
    QueueModule,
    HealthModule,
    ApiKeysModule,
    ViziWebhooksModule,
    AdminModule,
    CronModule,
    WorkflowsModule,
    MetricsModule,
    SlackModule,
    EmailModule,
    WhatsAppWebhooksModule,
    PdfModule,
    AirtableModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    // Interceptors in order of execution
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // 1. Add correlation IDs and logging
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor, // 2. Apply request timeouts
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor, // 3. Collect metrics
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor, // 4. Transform response structure
    },
  ],
})
export class AppModule {}
