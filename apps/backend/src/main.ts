// IMPORTANT: Make sure to import `instrument.ts` at the top of your file.
import './instrument';

// All other imports below
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ConfigService } from '@visapi/core-config';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Security
  app.use(helmet());

  // Enable CORS for your frontend
  app.enableCors({
    origin: configService.corsOrigin,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
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
    .build();

  const document = SwaggerModule.createDocument(app, config);
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
