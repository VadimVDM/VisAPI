// IMPORTANT: Make sure to import `instrument.ts` at the top of your file.
import './instrument';

// All other imports below
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ConfigService } from '@visapi/core-config';
import helmet from 'helmet';
import { createSwaggerAuthMiddleware } from './common/guards/swagger-auth.guard';
import { ErrorFilter } from './common/utils/error-filter';

async function bootstrap() {
  // Install error filter in production to suppress known non-critical errors
  if (process.env.NODE_ENV === 'production') {
    ErrorFilter.install();
  }

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Security
  app.use(helmet());

  // Trust proxy in production (required for correct client IP behind Railway/Vercel proxies)
  if (configService.nodeEnv === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
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
    .setVersion('0.5.0')
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
    app.use('/api/docs', swaggerAuth);
    app.use('/api/docs-json', swaggerAuth);
    Logger.log('Swagger documentation protected with authentication');
  }
  
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.port;
  Logger.log(`Attempting to start server on port ${port}...`);

  try {
    // Bind to 0.0.0.0 to accept external connections
    await app.listen(port, '0.0.0.0');
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
    Logger.log(
      `DATABASE_URL: ${configService.databaseUrl ? '[REDACTED]' : 'NOT SET'}`,
    );
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
