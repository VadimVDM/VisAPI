import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ApiKeyService } from './services/api-key.service';
import { UserAuthService } from './services/user-auth.service';
import { TokenService } from './services/token.service';
import { PermissionService } from './services/permission.service';
import { ApiKeyRecord } from '@visapi/shared-types';

describe('AuthService', () => {
  let service: AuthService;
  let apiKeyService: jest.Mocked<ApiKeyService>;

  beforeEach(async () => {
    const mockApiKeyService = {
      createApiKey: jest.fn(),
      validateApiKey: jest.fn(),
      listApiKeys: jest.fn(),
      revokeApiKey: jest.fn(),
      checkScopes: jest.fn(),
    };

    const mockUserAuthService = {
      signUpWithEmail: jest.fn(),
      signInWithEmail: jest.fn(),
      signOut: jest.fn(),
      updatePassword: jest.fn(),
      getUserById: jest.fn(),
      getCurrentUser: jest.fn(),
    };

    const mockTokenService = {
      confirmToken: jest.fn(),
      refreshTokens: jest.fn(),
    };

    const mockPermissionService = {
      hasPermission: jest.fn(),
      getUserRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ApiKeyService,
          useValue: mockApiKeyService,
        },
        {
          provide: UserAuthService,
          useValue: mockUserAuthService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    apiKeyService = module.get(ApiKeyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateApiKey', () => {
    it('should delegate to ApiKeyService', async () => {
      const mockApiKey: ApiKeyRecord = {
        id: '123',
        name: 'test-key',
        prefix: 'vapi_test',
        hashed_secret: 'hashed-value',
        scopes: ['webhooks:trigger'],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        last_used_at: null,
        updated_at: new Date().toISOString(),
      };

      apiKeyService.validateApiKey.mockResolvedValue(mockApiKey);

      const result = await service.validateApiKey('vapi_test.secret123');

      expect(result).toEqual(mockApiKey);
      expect(apiKeyService.validateApiKey).toHaveBeenCalledWith('vapi_test.secret123');
    });

    it('should return null when ApiKeyService returns null', async () => {
      apiKeyService.validateApiKey.mockResolvedValue(null);

      const result = await service.validateApiKey('invalid_key');

      expect(result).toBeNull();
      expect(apiKeyService.validateApiKey).toHaveBeenCalledWith('invalid_key');
    });
  });

  describe('checkScopes', () => {
    it('should delegate to ApiKeyService', () => {
      const mockApiKey: ApiKeyRecord = {
        id: '123',
        name: 'test-key',
        prefix: 'vapi_',
        hashed_secret: 'hashed-value',
        scopes: ['webhooks:trigger'],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        last_used_at: null,
        updated_at: new Date().toISOString(),
      };

      apiKeyService.checkScopes.mockReturnValue(true);

      const result = service.checkScopes(mockApiKey, ['webhooks:trigger']);

      expect(result).toBe(true);
      expect(apiKeyService.checkScopes).toHaveBeenCalledWith(mockApiKey, ['webhooks:trigger']);
    });
  });

  describe('createApiKey', () => {
    it('should delegate to ApiKeyService', async () => {
      const mockResult = {
        key: 'vapi_test.secret123',
        apiKey: {
          id: '123',
          name: 'test-key',
          prefix: 'vapi_test',
          hashed_secret: 'hashed-value',
          scopes: ['webhooks:trigger'],
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          created_by: 'user-123',
          created_at: new Date().toISOString(),
          last_used_at: null,
          updated_at: new Date().toISOString(),
        } as ApiKeyRecord,
      };

      apiKeyService.createApiKey.mockResolvedValue(mockResult);

      const result = await service.createApiKey('test-key', ['webhooks:trigger'], 'user-123');

      expect(result).toEqual(mockResult);
      expect(apiKeyService.createApiKey).toHaveBeenCalledWith('test-key', ['webhooks:trigger'], 'user-123', undefined);
    });
  });
});
