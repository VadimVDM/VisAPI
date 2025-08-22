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
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'visapi-backend',
      uptime: process.uptime(),
    };
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
