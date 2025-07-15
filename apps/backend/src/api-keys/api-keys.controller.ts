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
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';

@ApiTags('API Keys')
@Controller('api/v1/apikeys')
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
export class ApiKeysController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @Scopes('keys:read')
  @ApiOperation({ summary: 'List all API keys' })
  @ApiResponse({ status: 200, description: 'Returns array of API keys' })
  async listApiKeys(@Request() req: any) {
    const keys = await this.authService.listApiKeys();
    // Remove sensitive data
    return keys.map(({ hashed_secret, ...key }) => key);
  }

  @Post()
  @Scopes('keys:create')
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'Returns the created API key' })
  async createApiKey(@Body() dto: CreateApiKeyDto, @Request() req: any) {
    const { key, apiKey } = await this.authService.createApiKey(
      dto.name,
      dto.scopes,
      req.apiKey.created_by || 'system'
    );

    // Return the key only once
    return {
      ...apiKey,
      key, // This is the only time the raw key is shown
      message: 'Save this key securely. It will not be shown again.',
    };
  }

  @Delete(':id')
  @Scopes('keys:delete')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 204, description: 'Key successfully revoked' })
  async revokeApiKey(@Param('id') id: string) {
    await this.authService.revokeApiKey(id);
    return { message: 'API key revoked successfully' };
  }
}
