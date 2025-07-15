import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseHealthIndicator } from './supabase.health';
import { SupabaseService } from '../../supabase/supabase.service';

describe('SupabaseHealthIndicator', () => {
  let indicator: SupabaseHealthIndicator;
  let supabaseService: jest.Mocked<SupabaseService>;

  const mockSupabaseClient = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseHealthIndicator,
        {
          provide: SupabaseService,
          useValue: {
            serviceClient: mockSupabaseClient,
          },
        },
      ],
    }).compile();

    indicator = module.get<SupabaseHealthIndicator>(SupabaseHealthIndicator);
    supabaseService = module.get(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy', () => {
    it('should return healthy status when Supabase is responsive', async () => {
      const startTime = Date.now();
      mockSupabaseClient.from().select().limit().single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await indicator.isHealthy('supabase');

      expect(result).toEqual({
        supabase: {
          status: 'up',
          message: 'Supabase is responsive',
          responseTime: expect.any(Number),
        },
      });

      // Check that response time is reasonable
      const responseTime = result.supabase.responseTime;
      expect(responseTime).toBeGreaterThanOrEqual(0);
      expect(responseTime).toBeLessThan(5000); // Should be less than 5 seconds

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('api_keys');
    });

    it('should return healthy status even when query returns an error (connection is working)', async () => {
      mockSupabaseClient
        .from()
        .select()
        .limit()
        .single.mockResolvedValue({
          data: null,
          error: { message: 'No rows found', code: 'PGRST116' },
        });

      const result = await indicator.isHealthy('supabase');

      expect(result).toEqual({
        supabase: {
          status: 'up',
          message: 'Supabase is responsive',
          responseTime: expect.any(Number),
        },
      });
    });

    it('should return unhealthy status when Supabase connection fails', async () => {
      const connectionError = new Error('Network timeout');
      mockSupabaseClient
        .from()
        .select()
        .limit()
        .single.mockRejectedValue(connectionError);

      const result = await indicator.isHealthy('supabase');

      expect(result).toEqual({
        supabase: {
          status: 'down',
          message: 'Supabase connection failed: Network timeout',
        },
      });
    });

    it('should return unhealthy status when query takes too long', async () => {
      // Mock a slow response
      mockSupabaseClient
        .from()
        .select()
        .limit()
        .single.mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolve({ data: null, error: null });
              }, 11000); // 11 seconds - longer than timeout
            })
        );

      const result = await indicator.isHealthy('supabase');

      expect(result).toEqual({
        supabase: {
          status: 'down',
          message: 'Supabase health check timed out after 10000ms',
        },
      });
    }, 15000); // Increase test timeout to handle the mock delay

    it('should handle missing serviceClient gracefully', async () => {
      // Create a new indicator with missing serviceClient
      const moduleWithMissingClient: TestingModule =
        await Test.createTestingModule({
          providers: [
            SupabaseHealthIndicator,
            {
              provide: SupabaseService,
              useValue: {
                serviceClient: null,
              },
            },
          ],
        }).compile();

      const indicatorWithMissingClient =
        moduleWithMissingClient.get<SupabaseHealthIndicator>(
          SupabaseHealthIndicator
        );

      const result = await indicatorWithMissingClient.isHealthy('supabase');

      expect(result).toEqual({
        supabase: {
          status: 'down',
          message: 'Supabase client not initialized',
        },
      });
    });
  });
});
