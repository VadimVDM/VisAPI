import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest() as { route?: { path: string }; url: string; method: string };
    const response = ctx.getResponse() as { statusCode: number };

    const startTime = Date.now();

    // Increment active connections
    this.metricsService.incrementActiveConnections();

    // Extract route pattern (e.g., /api/v1/users/:id instead of /api/v1/users/123)
    const route = request.route?.path || request.url;
    const method = request.method;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.metricsService.recordHttpRequest(
            method,
            route,
            statusCode,
            duration
          );
          this.metricsService.decrementActiveConnections();
        },
        error: (error: { status?: number }) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.metricsService.recordHttpRequest(
            method,
            route,
            statusCode,
            duration
          );
          this.metricsService.decrementActiveConnections();
        },
      })
    );
  }
}
