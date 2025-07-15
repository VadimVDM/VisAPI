import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysController } from './api-keys.controller';
import { AuthService } from '../auth/auth.service';
import { ApiKey } from '@visapi/shared-types';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

describe('ApiKeysController', () => {
  let controller: ApiKeysController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeysController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            createApiKey: jest.fn(),
            listApiKeys: jest.fn(),
            revokeApiKey: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ApiKeysController>(ApiKeysController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createApiKey', () => {
    const mockRequest = {
      apiKey: {
        created_by: 'user-123',
      },
    };

    const createApiKeyDto: CreateApiKeyDto = {
      name: 'Test API Key',
      scopes: ['webhooks:trigger', 'workflows:read'],
    };

    it('should create a new API key successfully', async () => {
      const mockResult = {
        key: 'vapi_1234567890abcdef',
        apiKey: {
          id: 'api-key-123',
          name: 'Test API Key',
          prefix: 'vapi_',
          hashed_secret: 'hashed-secret',
          scopes: ['webhooks:trigger', 'workflows:read'],
          expires_at: '2025-04-14T00:00:00Z',
          created_at: '2025-01-14T00:00:00Z',
          created_by: 'user-123',
          active: true,
        },
      };

      authService.createApiKey.mockResolvedValue(mockResult);

      const result = await controller.createApiKey(
        createApiKeyDto,
        mockRequest as any
      );

      expect(result).toEqual({
        ...mockResult.apiKey,
        key: mockResult.key,
        message: 'Save this key securely. It will not be shown again.',
      });

      expect(authService.createApiKey).toHaveBeenCalledWith(
        'Test API Key',
        ['webhooks:trigger', 'workflows:read'],
        'user-123'
      );
    });

    it('should handle auth service errors', async () => {
      authService.createApiKey.mockRejectedValue(
        new Error('Failed to create API key')
      );

      await expect(
        controller.createApiKey(createApiKeyDto, mockRequest as any)
      ).rejects.toThrow('Failed to create API key');
    });
  });

  describe('listApiKeys', () => {
    const mockRequest = {};

    it('should return list of API keys without sensitive data', async () => {
      const mockApiKeys = [
        {
          id: 'key-1',
          name: 'Production Key',
          prefix: 'vapi_',
          hashed_secret: 'should-be-removed',
          scopes: ['webhooks:trigger'],
          expires_at: '2025-04-14T00:00:00Z',
          created_at: '2025-01-14T00:00:00Z',
          created_by: 'user-123',
          active: true,
        },
        {
          id: 'key-2',
          name: 'Development Key',
          prefix: 'vapi_',
          hashed_secret: 'should-also-be-removed',
          scopes: ['workflows:read'],
          expires_at: '2025-07-14T00:00:00Z',
          created_at: '2025-01-10T00:00:00Z',
          created_by: 'user-456',
          active: true,
        },
      ];

      authService.listApiKeys.mockResolvedValue(mockApiKeys);

      const result = await controller.listApiKeys(mockRequest as any);

      expect(result).toEqual([
        {
          id: 'key-1',
          name: 'Production Key',
          prefix: 'vapi_',
          scopes: ['webhooks:trigger'],
          expires_at: '2025-04-14T00:00:00Z',
          created_at: '2025-01-14T00:00:00Z',
          created_by: 'user-123',
          active: true,
        },
        {
          id: 'key-2',
          name: 'Development Key',
          prefix: 'vapi_',
          scopes: ['workflows:read'],
          expires_at: '2025-07-14T00:00:00Z',
          created_at: '2025-01-10T00:00:00Z',
          created_by: 'user-456',
          active: true,
        },
      ]);

      expect(authService.listApiKeys).toHaveBeenCalled();
    });

    it('should handle auth service errors when listing keys', async () => {
      authService.listApiKeys.mockRejectedValue(
        new Error('Failed to list API keys')
      );

      await expect(controller.listApiKeys(mockRequest as any)).rejects.toThrow(
        'Failed to list API keys'
      );
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key successfully', async () => {
      const keyId = 'key-to-revoke';

      authService.revokeApiKey.mockResolvedValue();

      const result = await controller.revokeApiKey(keyId);

      expect(result).toEqual({
        message: 'API key revoked successfully',
      });

      expect(authService.revokeApiKey).toHaveBeenCalledWith(keyId);
    });

    it('should handle auth service errors when revoking key', async () => {
      const keyId = 'key-to-revoke';

      authService.revokeApiKey.mockRejectedValue(
        new Error('Failed to revoke API key')
      );

      await expect(controller.revokeApiKey(keyId)).rejects.toThrow(
        'Failed to revoke API key'
      );
    });
  });
});
