import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ConfigService } from '@visapi/core-config';
import fastifyHelmet from '@fastify/helmet';
import { createSwaggerAuthMiddleware } from './common/guards/swagger-auth.guard';
import { API_GLOBAL_PREFIX } from './common/constants/api.constants';
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      bodyLimit: 10485760, // 10MB
    }),
    {
      // Raw body is needed for webhook signature verification
      rawBody: true,
    },
  );
  const configService = app.get(ConfigService);
  const globalPrefix = API_GLOBAL_PREFIX;
  app.setGlobalPrefix(globalPrefix);

  // Security - Fastify helmet
  // Cast to unknown first then to the expected type to handle version mismatch
  await app.register(fastifyHelmet as unknown as Parameters<NestFastifyApplication['register']>[0], {
    contentSecurityPolicy:
      configService.nodeEnv === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
            },
          }
        : false,
  });

  // Trust proxy in production (required for correct client IP behind Railway/Vercel proxies)
  if (configService.nodeEnv === 'production') {
    const fastifyInstance = app.getHttpAdapter().getInstance();
    // Set trust proxy for Fastify
    if (fastifyInstance && 'server' in fastifyInstance && fastifyInstance.server) {
      // Safely access trustProxy property
      const server = fastifyInstance.server as { trustProxy?: boolean };
      server.trustProxy = true;
    }
    Logger.log('Trust proxy enabled for production environment');
  }

  // Enable CORS for your frontend with exposed headers
  app.enableCors({
    origin: configService.corsOrigin,
    credentials: true,
    exposedHeaders: [
      'X-Request-Id',
      'X-Correlation-Id',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation with authentication in production
  const config = new DocumentBuilder()
    .setTitle('VisAPI')
    .setDescription('Workflow automation API for Visanet')
    .setVersion(configService.appVersion)
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
      },
      'api-key',
    )
    .addBasicAuth(
      {
        type: 'http',
        scheme: 'basic',
      },
      'basic-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Apply authentication middleware to Swagger routes in production
  if (configService.nodeEnv === 'production') {
    const swaggerAuth = createSwaggerAuthMiddleware(configService);
    app.use(`/${API_GLOBAL_PREFIX}/docs`, swaggerAuth);
    app.use(`/${API_GLOBAL_PREFIX}/docs-json`, swaggerAuth);
    Logger.log('Swagger documentation protected with authentication');
  }

  SwaggerModule.setup(`${API_GLOBAL_PREFIX}/docs`, app, document);

  // Enable graceful shutdown hooks
  // Note: Disabled due to Fastify closeIdleConnections compatibility issue with Node.js 22
  // app.enableShutdownHooks();

  // Register shutdown handlers
  const shutdown = async (signal: string) => {
    Logger.log(`Received ${signal}, starting graceful shutdown...`);

    try {
      // Give ongoing requests 10 seconds to complete
      const shutdownTimeout = setTimeout(() => {
        Logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 10000);

      await app.close();
      clearTimeout(shutdownTimeout);

      Logger.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      Logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle termination signals
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  const port = configService.port;
  Logger.log(`Attempting to start server on port ${port}...`);

  try {
    // Bind to 0.0.0.0 to accept external connections (Fastify format)
    await app.listen({
      port,
      host: '0.0.0.0',
    });
    Logger.log(
      `🚀 Application is running on: http://0.0.0.0:${port}/${globalPrefix}`,
    );
    Logger.log(
      `📚 API Documentation: http://0.0.0.0:${port}/${globalPrefix}/docs`,
    );

    // Log environment info for debugging
    Logger.log(`Environment: ${configService.nodeEnv}`);
    Logger.log(
      `REDIS_URL: ${configService.redisUrl ? '[REDACTED]' : 'NOT SET'}`,
    );
    // All database access through Supabase (no direct DATABASE_URL)
    Logger.log('Database: Using Supabase for all database operations');
  } catch (error) {
    Logger.error(
      `Failed to start server: ${(error as Error).message}`,
      (error as Error).stack,
    );
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  Logger.error(
    `Bootstrap failed: ${(error as Error).message}`,
    (error as Error).stack,
  );
  process.exit(1);
});
