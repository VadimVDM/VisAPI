import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  TerminusModule,
  HealthCheckService,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis.health';
import { SupabaseHealthIndicator } from './indicators/supabase.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let redisHealth: jest.Mocked<RedisHealthIndicator>;
  let supabaseHealth: jest.Mocked<SupabaseHealthIndicator>;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
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
    healthCheckService = module.get(HealthCheckService) as jest.Mocked<HealthCheckService>;
    redisHealth = module.get(RedisHealthIndicator);
    supabaseHealth = module.get(SupabaseHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return healthy status when all services are up', async () => {
      const mockHealthResult = {
        status: 'ok' as const,
        info: {
          redis: {
            status: 'up' as const,
          },
          database: {
            status: 'up' as const,
          },
        },
        error: {},
        details: {
          redis: {
            status: 'up' as const,
          },
          database: {
            status: 'up' as const,
          },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
      expect(mockHealthCheckService.check).toHaveBeenCalledWith([
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
          database: {
            status: 'down' as const,
            message: 'Timeout',
          },
        },
        details: {
          redis: {
            status: 'down' as const,
            message: 'Connection refused',
          },
          database: {
            status: 'down' as const,
            message: 'Timeout',
          },
        },
      };

      mockHealthCheckService.check.mockRejectedValue({
        response: mockHealthResult,
      });

      await expect(controller.check()).rejects.toMatchObject({
        response: mockHealthResult,
      });
    });
  });

  describe('liveness', () => {
    it('should return ok status for liveness probe', () => {
      const result = controller.liveness();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });
  });
});
