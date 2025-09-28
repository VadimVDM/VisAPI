import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { Request } from 'express';
import { ApiKeyRecord } from '@visapi/shared-types';
import { AirtableLookupService, AirtableLookupField } from './airtable.service';
import { AirtableLookupDto } from './dto/airtable-lookup.dto';
import { AirtableLookupResponseDto } from './dto/airtable-lookup-response.dto';

@ApiTags('Airtable')
@Controller('v1/airtable')
@UseGuards(ApiKeyGuard)
export class AirtableController {
  constructor(
    private readonly airtableLookupService: AirtableLookupService,
  ) {}

  @Post('lookup')
  @Scopes('integrations:airtable:read')
  @ApiOperation({
    summary: 'Lookup Airtable record by Email, Order ID, or Phone',
    description:
      'Searches the configured Airtable base and table for a record matching the provided field and value.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lookup result detailing whether a record was found.',
    type: AirtableLookupResponseDto,
  })
  async lookup(
    @Body() dto: AirtableLookupDto,
    @Req() request: Request & { apiKey?: ApiKeyRecord; correlationId?: string },
  ): Promise<AirtableLookupResponseDto> {
    const field: AirtableLookupField =
      dto.field === 'email' ? 'email' :
      dto.field === 'phone' ? 'phone' : 'orderId';
    const value = dto.key.trim();

    // Pass API key and request context for logging
    return this.airtableLookupService.lookup(
      field,
      value,
      {
        apiKey: request.apiKey,
        correlationId: request.correlationId,
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip || request.socket?.remoteAddress,
      },
    );
  }

  @Post('completed')
  @Scopes('integrations:airtable:read')
  @ApiOperation({
    summary: 'Track new completed records from Airtable view',
    description:
      'Searches the configured Airtable base and table for a record in the completed view (viwgYjpU6K6nXq8ii) and fetches its connected application records.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lookup result detailing whether a record was found in the completed view.',
    type: AirtableLookupResponseDto,
  })
  async completed(
    @Body() dto: AirtableLookupDto,
    @Req() request: Request & { apiKey?: ApiKeyRecord; correlationId?: string },
  ): Promise<AirtableLookupResponseDto> {
    const field: AirtableLookupField =
      dto.field === 'email' ? 'email' :
      dto.field === 'phone' ? 'phone' : 'orderId';
    const value = dto.key.trim();

    // Pass API key and request context for logging
    // Use the completed method which will use the specific view
    return this.airtableLookupService.completed(
      field,
      value,
      {
        apiKey: request.apiKey,
        correlationId: request.correlationId,
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip || request.socket?.remoteAddress,
      },
    );
  }
}
