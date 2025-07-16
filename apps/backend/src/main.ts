// IMPORTANT: Make sure to import `instrument.ts` at the top of your file.
import './instrument';

// All other imports below
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Security
  app.use(helmet());

  // Enable CORS for your frontend
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('VisAPI')
    .setDescription('Workflow automation API for Visanet')
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
      },
      'api-key'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  Logger.log(`Attempting to start server on port ${port}...`);

  try {
    // Bind to 0.0.0.0 to accept external connections
    await app.listen(port, '0.0.0.0');
    Logger.log(
      `🚀 Application is running on: http://0.0.0.0:${port}/${globalPrefix}`
    );
    Logger.log(
      `📚 API Documentation: http://0.0.0.0:${port}/${globalPrefix}/docs`
    );

    // Log environment info for debugging
    Logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    Logger.log(
      `REDIS_URL: ${process.env.REDIS_URL ? '[REDACTED]' : 'NOT SET'}`
    );
    Logger.log(
      `DATABASE_URL: ${process.env.DATABASE_URL ? '[REDACTED]' : 'NOT SET'}`
    );
  } catch (error) {
    Logger.error(`Failed to start server: ${error.message}`, error.stack);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  Logger.error(`Bootstrap failed: ${error.message}`, error.stack);
  process.exit(1);
});
