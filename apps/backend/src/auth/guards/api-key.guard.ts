import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { SCOPES_KEY } from '../decorators/scopes.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const validatedKey = await this.authService.validateApiKey(apiKey);
    if (!validatedKey) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Check scopes if specified
    const requiredScopes =
      this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (requiredScopes.length > 0) {
      const hasScopes = await this.authService.checkScopes(
        validatedKey,
        requiredScopes
      );

      if (!hasScopes) {
        throw new UnauthorizedException(
          `Insufficient permissions. Required scopes: ${requiredScopes.join(
            ', '
          )}`
        );
      }
    }

    // Attach the validated key to the request
    request.apiKey = validatedKey;

    return true;
  }

  private extractApiKey(request: any): string | null {
    // Check X-API-Key header
    const apiKey = request.headers['x-api-key'];
    if (apiKey) {
      return apiKey;
    }

    // Check Authorization Bearer token
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
