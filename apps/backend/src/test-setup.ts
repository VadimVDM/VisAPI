import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '@visapi/core-config';
import {
  DynamicModule,
  ForwardReference,
  Provider,
  Type,
} from '@nestjs/common';

// Set test environment
process.env.NODE_ENV = 'test';

// Reduce console noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Suppress console logs during tests unless DEBUG is set
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.error = jest.fn();
  }

  // Set shorter timeouts for test environment
  jest.setTimeout(10000);
});

afterAll(() => {
  // Restore console
  console.log = originalConsoleLog;
  console.error = originalConsoleError;

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Mock external services by default
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  }));
});

// Helper function to create test module
export const createTestModule = (
  providers: Provider[] = [],
  imports: (
    | Type<any>
    | DynamicModule
    | Promise<DynamicModule>
    | ForwardReference
  )[] = [],
): TestingModuleBuilder => {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        load: [configuration],
        isGlobal: true,
      }),
      ...imports,
    ],
    providers: [...providers],
  });
};
