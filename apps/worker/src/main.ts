import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './app/worker.module';

const describeError = (error: unknown): { message: string; stack?: string } => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: 'Unknown error' };
  }
};

const formatReason = (reason: unknown): string => {
  if (reason instanceof Error) {
    return reason.message;
  }
  if (typeof reason === 'string') {
    return reason;
  }
  try {
    return JSON.stringify(reason);
  } catch {
    return 'Unknown reason';
  }
};

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);

  const logger = new Logger('WorkerBootstrap');
  logger.log('🚀 Worker process started');

  // Graceful shutdown handlers
  const gracefulShutdown = async () => {
    logger.log('Received shutdown signal, draining jobs...');

    // Allow up to 30 seconds for graceful shutdown
    const shutdownTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, 30000);

    try {
      await app.close();
      clearTimeout(shutdownTimeout);
      logger.log('Worker shutdown complete');
      process.exit(0);
    } catch (error: unknown) {
      const { message, stack } = describeError(error);
      logger.error(`Error during shutdown: ${message}`, stack);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => {
    void gracefulShutdown();
  });
  process.on('SIGINT', () => {
    void gracefulShutdown();
  });

  // Keep the process alive
  process.on('uncaughtException', (error) => {
    const { message, stack } = describeError(error);
    logger.error(`Uncaught exception: ${message}`, stack);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    const serializedReason = formatReason(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    logger.error(`Unhandled rejection: ${serializedReason}`, stack);
    process.exit(1);
  });
}

void bootstrap().catch((error: unknown) => {
  const { message, stack } = describeError(error);
  const logger = new Logger('WorkerBootstrap');
  logger.error(`Worker failed to start: ${message}`, stack);
  process.exit(1);
});
