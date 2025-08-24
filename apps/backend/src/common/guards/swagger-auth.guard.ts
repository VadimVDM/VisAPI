import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
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

  constructor(private readonly configService: ConfigService) {
    this.isProduction = configService.isProduction;

    // Get Swagger auth credentials from typed config with defaults
    try {
      this.swaggerUsername = configService.get<string>('swagger.username');
    } catch {
      this.swaggerUsername = 'admin';
    }

    try {
      this.swaggerPassword = configService.get<string>('swagger.password');
    } catch {
      this.swaggerPassword = 'admin';
    }

    // Get API keys from config (optional)
    try {
      const swaggerApiKeys = configService.get<string[]>('swagger.apiKeys');
      this.validApiKeys = new Set(swaggerApiKeys);
    } catch {
      this.validApiKeys = new Set();
    }
  }

  canActivate(context: ExecutionContext): boolean {
    // Allow unrestricted access in development/test
    if (!this.isProduction) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, unknown>;
    }>();

    // Check for API key authentication
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey && this.validApiKeys.has(apiKey)) {
      return true;
    }

    // Check for Basic authentication
    const authHeader = request.headers.authorization as string;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Basic ')) {
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
 * Middleware for Swagger authentication
 * Used to protect the Swagger UI route at application level
 * Works with both Express and Fastify
 */
export function createSwaggerAuthMiddleware(configService: ConfigService) {
  const isProduction = configService.isProduction;

  // Try to get swagger config, use defaults if not configured
  let swaggerUsername = 'admin';
  let swaggerPassword = 'admin';
  let swaggerApiKeys = new Set<string>();

  try {
    swaggerUsername = configService.get<string>('swagger.username');
  } catch {
    // Use default
  }

  try {
    swaggerPassword = configService.get<string>('swagger.password');
  } catch {
    // Use default
  }

  try {
    const apiKeys = configService.get<string[]>('swagger.apiKeys');
    swaggerApiKeys = new Set(apiKeys);
  } catch {
    // Use empty set
  }

  return (req: any, res: any, next: any) => {
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
    // Works for both Express and Fastify
    if (res.setHeader) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
      res.status(401).json({
        statusCode: 401,
        message: 'Authentication required to access API documentation',
      });
    } else {
      // Fastify response
      res.header('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
      res.code(401).send({
        statusCode: 401,
        message: 'Authentication required to access API documentation',
      });
    }
  };
}
