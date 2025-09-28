import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@visapi/core-config';
import { API_VERSION } from '../common/constants/api.constants';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get(`${API_VERSION}/healthz`)
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
      this.logger.warn('Health check warning:', error);
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

  @Get(`${API_VERSION}/livez`)
  liveness() {
    return { status: 'alive' };
  }

  @Get(`${API_VERSION}/version`)
  version() {
    const config = this.configService.getConfig();
    return {
      name: this.configService.appName,
      version: this.configService.appVersion,
      commit: config.git?.sha ?? 'local',
      build: config.build?.number ?? 'local',
    };
  }
}
