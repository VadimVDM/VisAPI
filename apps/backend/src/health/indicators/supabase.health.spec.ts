import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { SupabaseHealthIndicator } from './supabase.health';
import { SupabaseService } from '@visapi/core-supabase';

describe('SupabaseHealthIndicator', () => {
  let indicator: SupabaseHealthIndicator;
  let supabaseService: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockSupabaseService = {
      checkConnection: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseHealthIndicator,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    indicator = module.get<SupabaseHealthIndicator>(SupabaseHealthIndicator);
    supabaseService = module.get(SupabaseService);
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy', () => {
    const healthKey = 'supabase';

    it('should return healthy status when Supabase connection is successful', async () => {
      supabaseService.checkConnection.mockResolvedValue(true);

      const result = await indicator.isHealthy(healthKey);

      expect(result).toEqual({
        supabase: {
          status: 'up',
        },
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(supabaseService.checkConnection).toHaveBeenCalledTimes(1);
    });

    it('should throw HealthCheckError when Supabase connection fails', async () => {
      supabaseService.checkConnection.mockResolvedValue(false);

      await expect(indicator.isHealthy(healthKey)).rejects.toThrow(
        HealthCheckError,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(supabaseService.checkConnection).toHaveBeenCalledTimes(1);
    });

    it('should throw HealthCheckError when Supabase service throws an error', async () => {
      const error = new Error('Network timeout');
      supabaseService.checkConnection.mockRejectedValue(error);

      await expect(indicator.isHealthy(healthKey)).rejects.toThrow(
        HealthCheckError,
      );

      try {
        await indicator.isHealthy(healthKey);
      } catch (e: unknown) {
        const err = e as HealthCheckError;
        expect(err).toBeInstanceOf(HealthCheckError);
        expect(err.message).toBe('Supabase connection failed');
        expect(err.causes).toEqual({
          supabase: {
            status: 'down',
          },
        });
      }
    });

    it('should include the provided key in the health status', async () => {
      const customKey = 'supabase_cluster';
      supabaseService.checkConnection.mockResolvedValue(true);

      const result = await indicator.isHealthy(customKey);

      expect(result).toHaveProperty(customKey);
      expect(result[customKey]).toEqual({
        status: 'up',
      });
    });

    it('should handle Supabase service timeout gracefully', async () => {
      supabaseService.checkConnection.mockResolvedValue(false);

      try {
        await indicator.isHealthy(healthKey);
      } catch (e: unknown) {
        const err = e as HealthCheckError;
        expect(err).toBeInstanceOf(HealthCheckError);
        expect(err.message).toBe('Supabase connection failed');
        expect(err.causes).toEqual({
          supabase: {
            status: 'down',
          },
        });
      }
    });
  });
});
