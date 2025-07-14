import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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
      version: '0.1.0',
      commit: process.env.GIT_SHA || 'local',
      build: process.env.BUILD_NUMBER || 'local',
    };
  }
}
