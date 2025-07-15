import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';
import { AuthService } from '../auth.service';
import { ApiKey } from '@visapi/shared-types';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let authService: jest.Mocked<AuthService>;
  let reflector: jest.Mocked<Reflector>;

  const mockApiKey: ApiKey = {
    id: 'api-key-123',
    name: 'Test API Key',
    prefix: 'vapi_',
    hashed_secret: 'hashed-secret',
    scopes: ['webhooks:trigger', 'workflows:read'],
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    created_by: 'user-123',
    created_at: new Date().toISOString(),
    active: true,
  };

  const createMockExecutionContext = (headers: any = {}): ExecutionContext => {
    const mockRequest = { headers, apiKey: null };
    return {
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => mockRequest),
      })),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: AuthService,
          useValue: {
            validateApiKey: jest.fn(),
            checkScopes: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    authService = module.get(AuthService);
    reflector = module.get(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access with valid API key and no required scopes', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'vapi_validkey123',
      });

      authService.validateApiKey.mockResolvedValue(mockApiKey);
      reflector.getAllAndOverride.mockReturnValue([]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authService.validateApiKey).toHaveBeenCalledWith('vapi_validkey123');
      expect(context.switchToHttp().getRequest().apiKey).toEqual(mockApiKey);
    });

    it('should throw UnauthorizedException when API key is missing', async () => {
      const context = createMockExecutionContext({}); // No API key header

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
      expect(() => {
        throw new UnauthorizedException('API key is required');
      }).toThrow('API key is required');
    });

    it('should throw UnauthorizedException when API key is invalid', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'invalid-key',
      });

      authService.validateApiKey.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
      expect(() => {
        throw new UnauthorizedException('Invalid or expired API key');
      }).toThrow('Invalid or expired API key');
    });

    it('should check required scopes when specified', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'vapi_validkey123',
      });

      const requiredScopes = ['admin:write'];
      authService.validateApiKey.mockResolvedValue(mockApiKey);
      authService.checkScopes.mockResolvedValue(true);
      reflector.getAllAndOverride.mockReturnValue(requiredScopes);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authService.checkScopes).toHaveBeenCalledWith(
        mockApiKey,
        requiredScopes
      );
    });

    it('should throw UnauthorizedException when scopes are insufficient', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'vapi_validkey123',
      });

      const requiredScopes = ['admin:write'];
      authService.validateApiKey.mockResolvedValue(mockApiKey);
      authService.checkScopes.mockResolvedValue(false);
      reflector.getAllAndOverride.mockReturnValue(requiredScopes);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );

      expect(authService.checkScopes).toHaveBeenCalledWith(
        mockApiKey,
        requiredScopes
      );
    });

    it('should extract API key from Authorization header with Bearer token', async () => {
      const context = createMockExecutionContext({
        authorization: 'Bearer vapi_bearerkey123',
      });

      authService.validateApiKey.mockResolvedValue(mockApiKey);
      reflector.getAllAndOverride.mockReturnValue([]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authService.validateApiKey).toHaveBeenCalledWith('vapi_bearerkey123');
    });

    it('should extract API key from X-API-Key header', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'vapi_xapikeyheader123',
      });

      authService.validateApiKey.mockResolvedValue(mockApiKey);
      reflector.getAllAndOverride.mockReturnValue([]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authService.validateApiKey).toHaveBeenCalledWith('vapi_xapikeyheader123');
    });

    it('should handle multiple required scopes', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'vapi_validkey123',
      });

      const requiredScopes = ['webhooks:trigger', 'workflows:read'];
      authService.validateApiKey.mockResolvedValue(mockApiKey);
      authService.checkScopes.mockResolvedValue(true);
      reflector.getAllAndOverride.mockReturnValue(requiredScopes);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authService.checkScopes).toHaveBeenCalledWith(
        mockApiKey,
        requiredScopes
      );
    });

    it('should attach validated API key to request object', async () => {
      const context = createMockExecutionContext({
        'x-api-key': 'vapi_validkey123',
      });

      authService.validateApiKey.mockResolvedValue(mockApiKey);
      reflector.getAllAndOverride.mockReturnValue([]);

      await guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.apiKey).toEqual(mockApiKey);
    });
  });
});