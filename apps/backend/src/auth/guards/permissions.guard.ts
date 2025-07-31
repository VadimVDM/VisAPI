import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Request } from 'express';
import { User } from '@visapi/shared-types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { userRecord?: User }>();
    const userRecord = request.userRecord;

    if (!userRecord) {
      throw new ForbiddenException('User authentication required');
    }

    // Check if user has any of the required permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await this.authService.checkPermission(
        userRecord.id,
        permission,
      );
      if (hasPermission) {
        return true;
      }
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
