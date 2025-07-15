import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<PinoLogger>;

  const mockSupabaseClient = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: {
            serviceClient: mockSupabaseClient,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            jwtSecret: 'test-secret',
          },
        },
        {
          provide: PinoLogger,
          useValue: {
            setContext: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    supabaseService = module.get(SupabaseService);
    configService = module.get(ConfigService);
    logger = module.get(PinoLogger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateApiKey', () => {
    it('should return api key data when valid key is provided', async () => {
      const mockApiKey = {
        id: '123',
        name: 'test-key',
        hashed_key: 'hashed-value',
        scopes: ['webhooks:trigger'],
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
        created_by: 'user-123',
        created_at: new Date().toISOString(),
      };

      mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockApiKey,
        error: null,
      });

      const result = await service.validateApiKey('test-key-123');

      expect(result).toEqual(mockApiKey);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('api_keys');
    });

    it('should return null when key is not found', async () => {
      mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: null,
          error: { message: 'No rows found' },
        });

      const result = await service.validateApiKey('invalid-key');

      expect(result).toBeNull();
    });

    it('should return null when key is expired', async () => {
      const mockApiKey = {
        id: '123',
        name: 'test-key',
        hashed_key: 'hashed-value',
        scopes: ['webhooks:trigger'],
        expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        created_by: 'user-123',
        created_at: new Date().toISOString(),
      };

      mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockApiKey,
        error: null,
      });

      const result = await service.validateApiKey('test-key-123');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });

      const result = await service.validateApiKey('test-key');

      expect(result).toBeNull();
    });
  });

  describe('checkScopes', () => {
    it('should return true when api key has required scope', async () => {
      const apiKey = {
        id: '123',
        name: 'test-key',
        hashed_key: 'hashed-value',
        scopes: ['webhooks:trigger', 'workflows:read'],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_by: 'user-123',
        created_at: new Date().toISOString(),
      };

      const result = await service.checkScopes(apiKey, ['webhooks:trigger']);

      expect(result).toBe(true);
    });

    it('should return false when api key does not have required scope', async () => {
      const apiKey = {
        id: '123',
        name: 'test-key',
        hashed_key: 'hashed-value',
        scopes: ['webhooks:trigger'],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_by: 'user-123',
        created_at: new Date().toISOString(),
      };

      const result = await service.checkScopes(apiKey, ['admin:write']);

      expect(result).toBe(false);
    });

    it('should return true when no scopes are required', async () => {
      const apiKey = {
        id: '123',
        name: 'test-key',
        hashed_key: 'hashed-value',
        scopes: [],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_by: 'user-123',
        created_at: new Date().toISOString(),
      };

      const result = await service.checkScopes(apiKey, []);

      expect(result).toBe(true);
    });
  });
});
