import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { SCOPES_KEY } from '../decorators/scopes.decorator';
import { MetricsService } from '../../metrics/metrics.service';
import { ApiKeyRecord } from '@visapi/shared-types';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
    @Optional() private readonly metricsService?: MetricsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { apiKey?: ApiKeyRecord }>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Start timing API key validation
    const startTime = Date.now();
    let isValid = false;

    try {
      const validatedKey = await this.authService.validateApiKey(apiKey);
      if (!validatedKey) {
        throw new UnauthorizedException('Invalid or expired API key');
      }
      isValid = true;

      // Check scopes if specified
      const requiredScopes =
        this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
          context.getHandler(),
          context.getClass(),
        ]) || [];

      if (requiredScopes.length > 0) {
        const hasScopes = this.authService.checkScopes(
          validatedKey,
          requiredScopes,
        );

        if (!hasScopes) {
          throw new UnauthorizedException(
            `Insufficient permissions. Required scopes: ${requiredScopes.join(
              ', ',
            )}`,
          );
        }
      }

      // Attach the validated key to the request
      request.apiKey = validatedKey;

      return true;
    } finally {
      // Record the validation duration regardless of success or failure
      const duration = Date.now() - startTime;
      if (this.metricsService) {
        this.metricsService.recordApiKeyValidation(duration, isValid);
      }
    }
  }

  private extractApiKey(request: Request): string | null {
    // Check X-API-Key header
    const apiKey = request.headers['x-api-key'];
    if (typeof apiKey === 'string') {
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