import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  TerminusModule,
  HealthCheckService,
  TerminusOptions,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis.health';
import { SupabaseHealthIndicator } from './indicators/supabase.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let redisHealth: jest.Mocked<RedisHealthIndicator>;
  let supabaseHealth: jest.Mocked<SupabaseHealthIndicator>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: RedisHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
        {
          provide: SupabaseHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    redisHealth = module.get(RedisHealthIndicator);
    supabaseHealth = module.get(SupabaseHealthIndicator);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services are up', async () => {
      const mockHealthResult = {
        status: 'ok' as const,
        info: {
          redis: {
            status: 'up' as const,
          },
          supabase: {
            status: 'up' as const,
          },
        },
        error: {},
        details: {
          redis: {
            status: 'up' as const,
          },
          supabase: {
            status: 'up' as const,
          },
        },
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.healthCheck();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should return error status when services are down', async () => {
      const mockHealthResult = {
        status: 'error' as const,
        info: {},
        error: {
          redis: {
            status: 'down' as const,
            message: 'Connection refused',
          },
          supabase: {
            status: 'down' as const,
            message: 'Timeout',
          },
        },
        details: {
          redis: {
            status: 'down' as const,
            message: 'Connection refused',
          },
          supabase: {
            status: 'down' as const,
            message: 'Timeout',
          },
        },
      };

      healthCheckService.check.mockRejectedValue({
        response: mockHealthResult,
      });

      await expect(controller.healthCheck()).rejects.toMatchObject({
        response: mockHealthResult,
      });
    });
  });

  describe('livenessCheck', () => {
    it('should return ok status for liveness probe', async () => {
      const result = await controller.livenessCheck();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });
  });

  describe('versionInfo', () => {
    it('should return version information', async () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        npm_package_version: '1.0.0',
        GIT_SHA: 'abc123def456',
        NODE_ENV: 'test',
      };

      const result = await controller.versionInfo();

      expect(result).toEqual({
        version: '1.0.0',
        gitSha: 'abc123def456',
        environment: 'test',
        nodeVersion: process.version,
        timestamp: expect.any(String),
      });

      // Restore environment
      process.env = originalEnv;
    });

    it('should handle missing environment variables', async () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        npm_package_version: undefined,
        GIT_SHA: undefined,
        NODE_ENV: undefined,
      };

      const result = await controller.versionInfo();

      expect(result).toEqual({
        version: 'unknown',
        gitSha: 'unknown',
        environment: 'unknown',
        nodeVersion: process.version,
        timestamp: expect.any(String),
      });

      // Restore environment
      process.env = originalEnv;
    });
  });
});
