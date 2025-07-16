import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@visapi/core-config';
import { SupabaseModule } from '@visapi/core-supabase';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { HealthModule } from '../health/health.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AdminModule } from '../admin/admin.module';
import { CronModule } from '../cron/cron.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { LogsModule } from '../logs/logs.module';
import { MetricsModule } from '../metrics/metrics.module';
import { HttpMetricsInterceptor } from '../metrics/http-metrics.interceptor';
import { SlackModule } from '../notifications/slack.module';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { SentryModule } from '@sentry/nestjs/setup';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                },
              }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 200, // 200 requests per minute
      },
    ]),
    SupabaseModule,
    AuthModule,
    QueueModule,
    HealthModule,
    ApiKeysModule,
    WebhooksModule,
    AdminModule,
    CronModule,
    WorkflowsModule,
    LogsModule,
    MetricsModule,
    SlackModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class AppModule {}
