import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';
import { AuthService } from '../auth.service';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let authService: jest.Mocked<AuthService>;
  let reflector: jest.Mocked<Reflector>;

  const mockExecutionContext = {
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => ({
        headers: {},
        user: null,
      })),
    })),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: AuthService,
          useValue: {
            validateApiKey: jest.fn(),
            hasScope: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
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

  it('should return true when valid API key is provided', async () => {
    const mockRequest = {
      headers: {
        'x-api-key': 'valid-api-key',
      },
    };

    const mockUser = {
      id: '123',
      scopes: ['webhooks:trigger'],
    };

    mockExecutionContext.switchToHttp().getRequest.mockReturnValue(mockRequest);
    authService.validateApiKey.mockResolvedValue(mockUser);
    reflector.get.mockReturnValue(null); // No specific scopes required

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(mockRequest['user']).toBe(mockUser);
    expect(authService.validateApiKey).toHaveBeenCalledWith('valid-api-key');
  });

  it('should throw UnauthorizedException when no API key is provided', async () => {
    const mockRequest = {
      headers: {},
    };

    mockExecutionContext.switchToHttp().getRequest.mockReturnValue(mockRequest);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('should throw UnauthorizedException when invalid API key is provided', async () => {
    const mockRequest = {
      headers: {
        'x-api-key': 'invalid-api-key',
      },
    };

    mockExecutionContext.switchToHttp().getRequest.mockReturnValue(mockRequest);
    authService.validateApiKey.mockResolvedValue(null);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('should check scopes when required', async () => {
    const mockRequest = {
      headers: {
        'x-api-key': 'valid-api-key',
      },
    };

    const mockUser = {
      id: '123',
      scopes: ['webhooks:trigger'],
    };

    mockExecutionContext.switchToHttp().getRequest.mockReturnValue(mockRequest);
    authService.validateApiKey.mockResolvedValue(mockUser);
    reflector.get.mockReturnValue(['admin:write']); // Required scope
    authService.hasScope.mockReturnValue(false);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      UnauthorizedException
    );

    expect(authService.hasScope).toHaveBeenCalledWith(mockUser, 'admin:write');
  });

  it('should allow access when user has required scope', async () => {
    const mockRequest = {
      headers: {
        'x-api-key': 'valid-api-key',
      },
    };

    const mockUser = {
      id: '123',
      scopes: ['admin:write'],
    };

    mockExecutionContext.switchToHttp().getRequest.mockReturnValue(mockRequest);
    authService.validateApiKey.mockResolvedValue(mockUser);
    reflector.get.mockReturnValue(['admin:write']);
    authService.hasScope.mockReturnValue(true);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });
});
