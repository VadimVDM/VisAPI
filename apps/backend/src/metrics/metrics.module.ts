import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { RemoteWriteService } from './remote-write.service';
import { metricsProviders } from './metrics.providers';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'visapi_',
        },
      },
      defaultLabels: {
        app: 'visapi',
        version: process.env['npm_package_version'] || 'unknown',
      },
    }),
  ],
  providers: [
    ...metricsProviders,
    MetricsService,
    HttpMetricsInterceptor,
    RemoteWriteService,
  ],
  exports: [MetricsService, HttpMetricsInterceptor, PrometheusModule], // Export PrometheusModule for global metrics access
})
export class MetricsModule {}
