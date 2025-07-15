import { Test, TestingModule } from '@nestjs/testing';
import { RedisHealthIndicator } from './redis.health';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

jest.mock('ioredis');
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;
  let configService: jest.Mocked<ConfigService>;
  let mockRedisInstance: jest.Mocked<Redis>;

  beforeEach(async () => {
    mockRedisInstance = {
      ping: jest.fn(),
      disconnect: jest.fn(),
      status: 'ready',
    } as any;

    MockedRedis.mockImplementation(() => mockRedisInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        {
          provide: ConfigService,
          useValue: {
            redisUrl: 'redis://localhost:6379',
          },
        },
      ],
    }).compile();

    indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy', () => {
    it('should return healthy status when Redis is responsive', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');

      const result = await indicator.isHealthy('redis');

      expect(result).toEqual({
        redis: {
          status: 'up',
          message: 'Redis is responsive',
        },
      });
      expect(mockRedisInstance.ping).toHaveBeenCalled();
      expect(mockRedisInstance.disconnect).toHaveBeenCalled();
    });

    it('should return unhealthy status when Redis ping fails', async () => {
      const pingError = new Error('Connection refused');
      mockRedisInstance.ping.mockRejectedValue(pingError);

      const result = await indicator.isHealthy('redis');

      expect(result).toEqual({
        redis: {
          status: 'down',
          message: 'Redis connection failed: Connection refused',
        },
      });
      expect(mockRedisInstance.disconnect).toHaveBeenCalled();
    });

    it('should return unhealthy status when Redis ping returns unexpected response', async () => {
      mockRedisInstance.ping.mockResolvedValue('UNEXPECTED');

      const result = await indicator.isHealthy('redis');

      expect(result).toEqual({
        redis: {
          status: 'down',
          message: 'Redis ping returned unexpected response: UNEXPECTED',
        },
      });
    });

    it('should handle Redis connection creation errors', async () => {
      MockedRedis.mockImplementation(() => {
        throw new Error('Invalid Redis URL');
      });

      const result = await indicator.isHealthy('redis');

      expect(result).toEqual({
        redis: {
          status: 'down',
          message: 'Failed to create Redis connection: Invalid Redis URL',
        },
      });
    });

    it('should handle disconnect errors gracefully', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
      mockRedisInstance.disconnect.mockRejectedValue(
        new Error('Disconnect failed')
      );

      const result = await indicator.isHealthy('redis');

      // Should still return healthy status even if disconnect fails
      expect(result).toEqual({
        redis: {
          status: 'up',
          message: 'Redis is responsive',
        },
      });
    });
  });
});
