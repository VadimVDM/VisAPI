import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Request } from 'express';
import { User } from '@visapi/shared-types';
import { AuthUser } from '@supabase/supabase-js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser; userRecord?: User }>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const { user, error } = await this.authService.verifyJWT(token);

      if (error || !user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Get the user record with roles
      const userRecord = await this.authService.getUserByAuthId(user.id);
      if (!userRecord) {
        throw new UnauthorizedException('User not found in system');
      }

      // Attach user info to request
      request.user = user;
      request.userRecord = userRecord;

      return true;
    } catch (error: unknown) {
      throw new UnauthorizedException(
        `Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
