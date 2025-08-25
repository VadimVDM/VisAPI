import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@visapi/core-config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('v1/healthz')
  async healthCheck() {
    // Basic health check for load balancers - always returns 200 if app is running
    // For detailed component health, use /api/health endpoint
    try {
      // Quick database connectivity check
      const dbHealthy = await this.appService.checkDatabaseHealth();

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'visapi-backend',
        uptime: process.uptime(),
        database: dbHealthy ? 'connected' : 'degraded',
        // Redis is optional - queue features may be degraded without it
        queue: 'optional',
      };
    } catch (error) {
      // Even if checks fail, return 200 to keep service in rotation
      // Log the error for monitoring
      console.error('Health check warning:', error);
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'visapi-backend',
        uptime: process.uptime(),
        database: 'unknown',
        queue: 'optional',
        warning: 'Some services may be degraded',
      };
    }
  }

  @Get('v1/livez')
  liveness() {
    return { status: 'alive' };
  }

  @Get('v1/version')
  version() {
    return {
      version: '0.5.0',
      commit: this.configService.get<string>('git.sha') || 'local',
      build: this.configService.get<string>('build.number') || 'local',
    };
  }
}
