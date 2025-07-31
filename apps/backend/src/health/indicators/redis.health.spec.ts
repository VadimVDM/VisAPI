import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';
import { RedisService } from '@visapi/util-redis';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRedisService = {
      checkConnection: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy', () => {
    const healthKey = 'redis';

    it('should return healthy status when Redis connection is successful', async () => {
      redisService.checkConnection.mockResolvedValue(true);

      const result = await indicator.isHealthy(healthKey);

      expect(result).toEqual({
        redis: {
          status: 'up',
          message: 'Redis is accessible and responsive',
        },
      });
      expect(redisService.checkConnection).toHaveBeenCalledTimes(1);
    });

    it('should throw HealthCheckError when Redis connection fails', async () => {
      redisService.checkConnection.mockResolvedValue(false);

      await expect(indicator.isHealthy(healthKey)).rejects.toThrow(
        HealthCheckError,
      );
      expect(redisService.checkConnection).toHaveBeenCalledTimes(1);
    });

    it('should throw HealthCheckError when Redis service throws an error', async () => {
      const error = new Error('Connection timeout');
      redisService.checkConnection.mockRejectedValue(error);

      await expect(indicator.isHealthy(healthKey)).rejects.toThrow(
        HealthCheckError,
      );

      try {
        await indicator.isHealthy(healthKey);
      } catch (e: unknown) {
        const err = e as HealthCheckError;
        expect(err).toBeInstanceOf(HealthCheckError);
        expect(err.message).toBe('Redis connection failed');
        expect(err.causes).toEqual({
          redis: {
            status: 'down',
            message: 'Unable to connect to Redis',
            error: 'Connection timeout',
          },
        });
      }
    });

    it('should include the provided key in the health status', async () => {
      const customKey = 'redis_cluster';
      redisService.checkConnection.mockResolvedValue(true);

      const result = await indicator.isHealthy(customKey);

      expect(result).toHaveProperty(customKey);
      expect(result[customKey]).toEqual({
        status: 'up',
        message: 'Redis is accessible and responsive',
      });
    });

    it('should handle Redis service timeout gracefully', async () => {
      redisService.checkConnection.mockResolvedValue(false);

      await expect(indicator.isHealthy(healthKey)).rejects.toThrow(
        HealthCheckError,
      );

      try {
        await indicator.isHealthy(healthKey);
      } catch (e: unknown) {
        const err = e as HealthCheckError;
        expect(err).toBeInstanceOf(HealthCheckError);
        expect(err.message).toBe('Redis connection failed');
        expect(err.causes).toEqual({
          redis: {
            status: 'down',
            message: 'Unable to connect to Redis',
            error: 'Redis connection failed',
          },
        });
      }
    });

    it('should handle Redis service connection error', async () => {
      const error = new Error('Redis connection failed');
      redisService.checkConnection.mockRejectedValue(error);

      await expect(indicator.isHealthy(healthKey)).rejects.toThrow(
        HealthCheckError,
      );

      try {
        await indicator.isHealthy(healthKey);
      } catch (e: unknown) {
        const err = e as HealthCheckError;
        expect(err).toBeInstanceOf(HealthCheckError);
        expect(err.message).toBe('Redis connection failed');
        expect(err.causes).toEqual({
          redis: {
            status: 'down',
            message: 'Unable to connect to Redis',
            error: 'Redis connection failed',
          },
        });
      }
    });
  });
});
