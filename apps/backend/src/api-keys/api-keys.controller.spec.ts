import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysController } from './api-keys.controller';
import { SupabaseService } from '../supabase/supabase.service';
import { PinoLogger } from 'nestjs-pino';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('ApiKeysController', () => {
  let controller: ApiKeysController;
  let supabaseService: jest.Mocked<SupabaseService>;
  let logger: jest.Mocked<PinoLogger>;

  const mockSupabaseClient = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeysController],
      providers: [
        {
          provide: SupabaseService,
          useValue: {
            serviceClient: mockSupabaseClient,
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

    controller = module.get<ApiKeysController>(ApiKeysController);
    supabaseService = module.get(SupabaseService);
    logger = module.get(PinoLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createApiKey', () => {
    const mockRequest = {
      user: {
        id: 'user-123',
        scopes: ['admin:write'],
      },
    };

    const createApiKeyDto: CreateApiKeyDto = {
      name: 'Test API Key',
      scopes: ['webhooks:trigger', 'workflows:read'],
      expiresInDays: 90,
    };

    it('should create a new API key successfully', async () => {
      // Mock name uniqueness check
      mockSupabaseClient.from().select().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock bcrypt hash
      mockedBcrypt.hash.mockResolvedValue('hashed-key' as never);

      // Mock database insert
      const mockApiKey = {
        id: 'api-key-123',
        name: 'Test API Key',
        hashed_key: 'hashed-key',
        scopes: ['webhooks:trigger', 'workflows:read'],
        expires_at: expect.any(String),
        created_by: 'user-123',
        created_at: expect.any(String),
      };

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockApiKey,
        error: null,
      });

      const result = await controller.createApiKey(
        createApiKeyDto,
        mockRequest as any
      );

      expect(result).toEqual({
        id: 'api-key-123',
        name: 'Test API Key',
        key: expect.stringMatching(/^vapi_[a-zA-Z0-9]{56}$/),
        scopes: ['webhooks:trigger', 'workflows:read'],
        expiresAt: expect.any(String),
        createdAt: expect.any(String),
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(expect.any(String), 12);
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeyId: 'api-key-123',
          apiKeyName: 'Test API Key',
          createdBy: 'user-123',
        }),
        'API key created successfully'
      );
    });

    it('should throw ConflictException when API key name already exists', async () => {
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .maybeSingle.mockResolvedValue({
          data: { id: 'existing-key', name: 'Test API Key' },
          error: null,
        });

      await expect(
        controller.createApiKey(createApiKeyDto, mockRequest as any)
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid scopes', async () => {
      const invalidDto = {
        ...createApiKeyDto,
        scopes: ['invalid:scope'],
      };

      mockSupabaseClient.from().select().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        controller.createApiKey(invalidDto, mockRequest as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from().select().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      mockedBcrypt.hash.mockResolvedValue('hashed-key' as never);

      mockSupabaseClient
        .from()
        .insert()
        .select()
        .single.mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: '23505' },
        });

      await expect(
        controller.createApiKey(createApiKeyDto, mockRequest as any)
      ).rejects.toThrow('Failed to create API key');

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: { message: 'Database error', code: '23505' },
        }),
        'Failed to create API key'
      );
    });
  });

  describe('listApiKeys', () => {
    it('should return list of API keys without sensitive data', async () => {
      const mockApiKeys = [
        {
          id: 'key-1',
          name: 'Production Key',
          scopes: ['webhooks:trigger'],
          expires_at: '2025-04-14T00:00:00Z',
          created_at: '2025-01-14T00:00:00Z',
          created_by: 'user-123',
          last_used_at: '2025-01-13T12:00:00Z',
          // hashed_key should not be included
        },
        {
          id: 'key-2',
          name: 'Development Key',
          scopes: ['workflows:read'],
          expires_at: '2025-07-14T00:00:00Z',
          created_at: '2025-01-10T00:00:00Z',
          created_by: 'user-456',
          last_used_at: null,
        },
      ];

      mockSupabaseClient.from().select.mockReturnValue({
        order: jest.fn(() => ({
          data: mockApiKeys,
          error: null,
        })),
      });

      const result = await controller.listApiKeys();

      expect(result).toEqual(mockApiKeys);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('api_keys');
      expect(mockSupabaseClient.from().select).toHaveBeenCalledWith(
        'id, name, scopes, expires_at, created_at, created_by, last_used_at'
      );
    });

    it('should handle database errors when listing keys', async () => {
      mockSupabaseClient.from().select.mockReturnValue({
        order: jest.fn(() => ({
          data: null,
          error: { message: 'Connection failed' },
        })),
      });

      await expect(controller.listApiKeys()).rejects.toThrow(
        'Failed to list API keys'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: { message: 'Connection failed' },
        }),
        'Failed to list API keys'
      );
    });
  });

  describe('revokeApiKey', () => {
    const mockRequest = {
      user: {
        id: 'user-123',
        scopes: ['admin:write'],
      },
    };

    it('should revoke an API key successfully', async () => {
      const keyId = 'key-to-revoke';

      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await controller.revokeApiKey(keyId, mockRequest as any);

      expect(result).toEqual({
        success: true,
        message: 'API key revoked successfully',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('api_keys');
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeyId: keyId,
          revokedBy: 'user-123',
        }),
        'API key revoked'
      );
    });

    it('should handle database errors when revoking key', async () => {
      const keyId = 'key-to-revoke';

      mockSupabaseClient
        .from()
        .delete()
        .eq.mockResolvedValue({
          data: null,
          error: { message: 'Key not found' },
        });

      await expect(
        controller.revokeApiKey(keyId, mockRequest as any)
      ).rejects.toThrow('Failed to revoke API key');

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeyId: keyId,
          error: { message: 'Key not found' },
        }),
        'Failed to revoke API key'
      );
    });
  });
});
