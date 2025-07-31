import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import {
  ApiKeyResponseDto,
  ApiKeyWithSecretResponseDto,
} from './dto/api-key-response.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { User } from '@visapi/shared-types';

@ApiTags('API Keys')
@Controller('v1/api-keys')
export class ApiKeysController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('keys:read')
  @ApiOperation({ summary: 'List all API keys' })
  @ApiResponse({
    status: 200,
    description: 'Returns array of API keys',
    type: [ApiKeyResponseDto],
  })
  async listApiKeys(): Promise<ApiKeyResponseDto[]> {
    const keys = await this.authService.listApiKeys();
    return keys.map((key) => ApiKeyResponseDto.fromRecord(key));
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('keys:create')
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({
    status: 201,
    description: 'Returns the created API key with secret',
    type: ApiKeyWithSecretResponseDto,
  })
  async createApiKey(
    @Body() dto: CreateApiKeyDto,
    @Request() req: { userRecord?: User },
  ): Promise<ApiKeyWithSecretResponseDto> {
    const { key, apiKey } = await this.authService.createApiKey(
      dto.name,
      dto.scopes,
      req.userRecord?.id ?? 'system',
    );

    return ApiKeyWithSecretResponseDto.fromRecordWithKey(apiKey, key);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('keys:delete')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 204, description: 'Key successfully revoked' })
  async revokeApiKey(@Param('id') id: string): Promise<{ message: string }> {
    await this.authService.revokeApiKey(id);
    return { message: 'API key revoked successfully' };
  }
}