import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from '@visapi/core-supabase';
import { ApiKeyRecord } from '@visapi/shared-types';
import { ConfigService } from '@visapi/core-config';
import { PinoLogger } from 'nestjs-pino';
import * as bcrypt from 'bcrypt';

// Mock bcrypt module properly
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Get the mocked functions after the module is mocked
const mockedBcrypt = jest.mocked(bcrypt);

describe('AuthService', () => {
  let service: AuthService;

  // Mock factory for Supabase client to reduce boilerplate
  const createMockSupabaseClient = () => {
    const selectMock = jest.fn();
    const singleMock = jest.fn();
    const eqMock = jest.fn();
    const orderMock = jest.fn().mockReturnValue({ data: [], error: null });

    eqMock.mockReturnValue({ single: singleMock });
    selectMock.mockReturnValue({
      eq: eqMock,
      order: orderMock,
      single: singleMock,
    });

    return {
      from: jest.fn().mockReturnValue({
        select: selectMock,
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
  };

  const mockSupabaseClient = createMockSupabaseClient();

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
    module.get<SupabaseService>(SupabaseService);
    module.get<ConfigService>(ConfigService);
    module.get<PinoLogger>(PinoLogger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateApiKey', () => {
    it('should return api key data when valid key is provided', async () => {
      const mockApiKey: ApiKeyRecord = {
        id: '123',
        name: 'test-key',
        hashed_key: '', // Legacy field
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
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Configure the final single() method to return the api key
      const fromResult = mockSupabaseClient.from('api_keys');
      const selectResult = fromResult.select();
      (selectResult.single as jest.Mock).mockResolvedValue({
        data: mockApiKey,
        error: null,
      });

      const result = await service.validateApiKey('vapi_testsecret123');

      expect(result).toEqual(mockApiKey);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('api_keys');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'testsecret123',
        'hashed-value',
      );
    });

    it('should return null when key is not found', async () => {
      // Configure the final single() method to return no data
      const fromResult = mockSupabaseClient.from('api_keys');
      const selectResult = fromResult.select();
      (selectResult.single as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      });

      const result = await service.validateApiKey('invalid_testsecret');

      expect(result).toBeNull();
    });

    it('should return null when key is expired', async () => {
      const mockApiKey: ApiKeyRecord = {
        id: '123',
        name: 'test-key',
        hashed_key: '', // Legacy field
        prefix: 'vapi_',
        hashed_secret: 'hashed-value',
        scopes: ['webhooks:trigger'],
        expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        last_used_at: null,
        updated_at: new Date().toISOString(),
      };

      // Configure the final single() method to return expired key
      const fromResult = mockSupabaseClient.from('api_keys');
      const selectResult = fromResult.select();
      (selectResult.single as jest.Mock).mockResolvedValue({
        data: mockApiKey,
        error: null,
      });

      const result = await service.validateApiKey('vapi_testsecret123');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Configure the final single() method to return database error
      const fromResult = mockSupabaseClient.from('api_keys');
      const selectResult = fromResult.select();
      (selectResult.single as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await service.validateApiKey('test_key');

      expect(result).toBeNull();
    });

    it('should return null when secret does not match', async () => {
      const mockApiKey: ApiKeyRecord = {
        id: '123',
        name: 'test-key',
        hashed_key: '', // Legacy field
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
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Configure the final single() method to return the api key (but bcrypt will fail)
      const fromResult = mockSupabaseClient.from('api_keys');
      const selectResult = fromResult.select();
      (selectResult.single as jest.Mock).mockResolvedValue({
        data: mockApiKey,
        error: null,
      });

      const result = await service.validateApiKey('vapi_wrongsecret');

      expect(result).toBeNull();
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'wrongsecret',
        'hashed-value',
      );
    });
  });

  // Helper function to create mock ApiKeyRecord
  const createMockApiKey = (
    overrides: Partial<ApiKeyRecord> = {},
  ): ApiKeyRecord => ({
    id: '123',
    name: 'test-key',
    hashed_key: '', // Legacy field
    prefix: 'vapi_',
    hashed_secret: 'hashed-value',
    scopes: ['webhooks:trigger'],
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    created_by: 'user-123',
    created_at: new Date().toISOString(),
    last_used_at: null,
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  describe('checkScopes', () => {
    it('should return true when api key has required scope', async () => {
      const apiKey = createMockApiKey({
        scopes: ['webhooks:trigger', 'workflows:read'],
      });

      const result = service.checkScopes(apiKey, ['webhooks:trigger']);

      expect(result).toBe(true);
    });

    it('should return false when api key does not have required scope', async () => {
      const apiKey = createMockApiKey({
        scopes: ['webhooks:trigger'],
      });

      const result = service.checkScopes(apiKey, ['admin:write']);

      expect(result).toBe(false);
    });

    it('should return true when no scopes are required', async () => {
      const apiKey = createMockApiKey({
        scopes: [],
      });

      const result = service.checkScopes(apiKey, []);

      expect(result).toBe(true);
    });
  });
});
