import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '@visapi/core-config';

// Global test setup
beforeAll(async () => {
  // Global setup logic here
});

afterAll(async () => {
  // Global cleanup logic here
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
  providers: any[] = [],
  imports: any[] = []
) => {
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
