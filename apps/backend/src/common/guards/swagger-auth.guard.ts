import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@visapi/core-config';

/**
 * SwaggerAuthGuard - Protects Swagger documentation in production
 *
 * In production, requires either:
 * - Valid API key in X-API-Key header
 * - Basic authentication with configured credentials
 *
 * In development/test environments, allows unrestricted access
 */
@Injectable()
export class SwaggerAuthGuard implements CanActivate {
  private readonly isProduction: boolean;
  private readonly swaggerUsername: string;
  private readonly swaggerPassword: string;
  private readonly validApiKeys: Set<string>;

  constructor(configService: ConfigService) {
    this.isProduction = configService.nodeEnv === 'production';

    // Get Swagger auth credentials from config
    // These would be added to the config schema
    this.swaggerUsername = process.env['SWAGGER_USERNAME'] || 'admin';
    this.swaggerPassword = process.env['SWAGGER_PASSWORD'] || '';

    // You could also check against valid API keys from database
    // For now, we'll use a simple environment variable
    const swaggerApiKeys = process.env['SWAGGER_API_KEYS']?.split(',') || [];
    this.validApiKeys = new Set(swaggerApiKeys);
  }

  canActivate(context: ExecutionContext): boolean {
    // Allow unrestricted access in development/test
    if (!this.isProduction) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Check for API key authentication
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey && this.validApiKeys.has(apiKey)) {
      return true;
    }

    // Check for Basic authentication
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64Credentials = authHeader.slice(6);
      const credentials = Buffer.from(base64Credentials, 'base64').toString(
        'utf-8',
      );
      const [username, password] = credentials.split(':');

      if (
        username === this.swaggerUsername &&
        password === this.swaggerPassword
      ) {
        return true;
      }
    }

    // If no valid authentication, throw unauthorized
    throw new UnauthorizedException(
      'Authentication required to access API documentation',
    );
  }
}

/**
 * Express middleware for Swagger authentication
 * Used to protect the Swagger UI route at application level
 */
export function createSwaggerAuthMiddleware(configService: ConfigService) {
  const isProduction = configService.nodeEnv === 'production';
  const swaggerUsername = process.env['SWAGGER_USERNAME'] || 'admin';
  const swaggerPassword = process.env['SWAGGER_PASSWORD'] || '';
  const swaggerApiKeys = new Set(
    process.env['SWAGGER_API_KEYS']?.split(',') || [],
  );

  return (req: Request, res: Response, next: NextFunction) => {
    // Allow unrestricted access in development/test
    if (!isProduction) {
      return next();
    }

    // Check for API key authentication
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey && swaggerApiKeys.has(apiKey)) {
      return next();
    }

    // Check for Basic authentication
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64Credentials = authHeader.slice(6);
      const credentials = Buffer.from(base64Credentials, 'base64').toString(
        'utf-8',
      );
      const [username, password] = credentials.split(':');

      if (username === swaggerUsername && password === swaggerPassword) {
        return next();
      }
    }

    // If no valid authentication, request Basic auth
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
    res.status(401).json({
      statusCode: 401,
      message: 'Authentication required to access API documentation',
    });
  };
}
