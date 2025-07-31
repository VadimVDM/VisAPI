import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { RequirePermissions } from './auth/decorators/permissions.decorator';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Hello World!';
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('admin:read')
  getAdminInfo(): string {
    return 'Admin access granted';
  }
}
