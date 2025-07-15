import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from '@visapi/core-supabase';
import { ApiKey } from '@visapi/shared-types';
import { ConfigService } from '@visapi/core-config';
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
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn(),
        }),
        order: jest.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn(),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          data: null,
          error: null,
        }),
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          data: null,
          error: null,
        }),
      }),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
            apiKeyPrefix: 'vapi_',
            apiKeyExpiryDays: 90,
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
        prefix: 'vapi_',
        hashed_secret: 'hashed-value',
        scopes: ['webhooks:trigger'],
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        last_used_at: null,
        updated_at: new Date().toISOString(),
      };

      // Mock bcrypt.compare to return true for valid secret
      mockedBcrypt.compare.mockResolvedValue(true as never);
      
      // Configure the final single() method to return the api key
      const singleMock = mockSupabaseClient.from().select().eq().single;
      singleMock.mockResolvedValue({
        data: mockApiKey,
        error: null,
      });

      const result = await service.validateApiKey('vapi_testsecret123');

      expect(result).toEqual(mockApiKey);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('api_keys');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('testsecret123', 'hashed-value');
    });

    it('should return null when key is not found', async () => {
      // Configure the final single() method to return no data
      const singleMock = mockSupabaseClient.from().select().eq().single;
      singleMock.mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      });

      const result = await service.validateApiKey('invalid_testsecret');

      expect(result).toBeNull();
    });

    it('should return null when key is expired', async () => {
      const mockApiKey = {
        id: '123',
        name: 'test-key',
        prefix: 'vapi_',
        hashed_secret: 'hashed-value',
        scopes: ['webhooks:trigger'],
        expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        active: true,
      };

      // Configure the final single() method to return expired key
      const singleMock = mockSupabaseClient.from().select().eq().single;
      singleMock.mockResolvedValue({
        data: mockApiKey,
        error: null,
      });

      const result = await service.validateApiKey('vapi_testsecret123');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Configure the final single() method to return database error
      const singleMock = mockSupabaseClient.from().select().eq().single;
      singleMock.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await service.validateApiKey('test_key');

      expect(result).toBeNull();
    });

    it('should return null when secret does not match', async () => {
      const mockApiKey = {
        id: '123',
        name: 'test-key',
        prefix: 'vapi_',
        hashed_secret: 'hashed-value',
        scopes: ['webhooks:trigger'],
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        last_used_at: null,
        updated_at: new Date().toISOString(),
      };

      // Mock bcrypt.compare to return false for invalid secret
      mockedBcrypt.compare.mockResolvedValue(false as never);
      
      // Configure the final single() method to return the api key (but bcrypt will fail)
      const singleMock = mockSupabaseClient.from().select().eq().single;
      singleMock.mockResolvedValue({
        data: mockApiKey,
        error: null,
      });

      const result = await service.validateApiKey('vapi_wrongsecret');

      expect(result).toBeNull();
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('wrongsecret', 'hashed-value');
    });
  });

  describe('checkScopes', () => {
    it('should return true when api key has required scope', async () => {
      const apiKey = {
        id: '123',
        name: 'test-key',
        prefix: 'vapi_',
        hashed_secret: 'hashed-value',
        scopes: ['webhooks:trigger', 'workflows:read'],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        active: true,
      };

      const result = await service.checkScopes(apiKey, ['webhooks:trigger']);

      expect(result).toBe(true);
    });

    it('should return false when api key does not have required scope', async () => {
      const apiKey = {
        id: '123',
        name: 'test-key',
        prefix: 'vapi_',
        hashed_secret: 'hashed-value',
        scopes: ['webhooks:trigger'],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        active: true,
      };

      const result = await service.checkScopes(apiKey, ['admin:write']);

      expect(result).toBe(false);
    });

    it('should return true when no scopes are required', async () => {
      const apiKey = {
        id: '123',
        name: 'test-key',
        prefix: 'vapi_',
        hashed_secret: 'hashed-value',
        scopes: [],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        active: true,
      };

      const result = await service.checkScopes(apiKey, []);

      expect(result).toBe(true);
    });
  });
});
