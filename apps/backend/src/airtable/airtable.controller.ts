import { Body, Controller, Post, Get, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { Request } from 'express';
import { ApiKeyRecord } from '@visapi/shared-types';
import { AirtableLookupService, AirtableLookupField } from './airtable.service';
import { CompletedTrackerService } from './services/completed-tracker.service';
import { AirtableLookupDto } from './dto/airtable-lookup.dto';
import { AirtableLookupResponseDto } from './dto/airtable-lookup-response.dto';

@ApiTags('Airtable')
@Controller('v1/airtable')
@UseGuards(ApiKeyGuard)
export class AirtableController {
  constructor(
    private readonly airtableLookupService: AirtableLookupService,
    private readonly completedTracker: CompletedTrackerService,
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
      dto.field === 'email'
        ? 'email'
        : dto.field === 'phone'
          ? 'phone'
          : 'orderId';
    const value = dto.key.trim();

    // Pass API key and request context for logging
    return this.airtableLookupService.lookup(field, value, {
      apiKey: request.apiKey,
      correlationId: request.correlationId,
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip || request.socket?.remoteAddress,
    });
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
    description:
      'Lookup result detailing whether a record was found in the completed view.',
    type: AirtableLookupResponseDto,
  })
  async completed(
    @Body() dto: AirtableLookupDto,
    @Req() request: Request & { apiKey?: ApiKeyRecord; correlationId?: string },
  ): Promise<AirtableLookupResponseDto> {
    const field: AirtableLookupField =
      dto.field === 'email'
        ? 'email'
        : dto.field === 'phone'
          ? 'phone'
          : 'orderId';
    const value = dto.key.trim();

    // Pass API key and request context for logging
    // Use the completed method which will use the specific view
    return this.airtableLookupService.completed(field, value, {
      apiKey: request.apiKey,
      correlationId: request.correlationId,
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip || request.socket?.remoteAddress,
    });
  }

  @Post('completed/check')
  @Scopes('integrations:airtable:read')
  @ApiOperation({
    summary: 'Check for new completed records since last check',
    description:
      'Manually trigger a check for new completed records. Usually runs automatically every 10 minutes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Check results with new records found.',
  })
  async checkCompleted() {
    return this.completedTracker.checkForNew();
  }

  @Post('completed/bootstrap')
  @Scopes('integrations:airtable:write')
  @ApiOperation({
    summary: 'Bootstrap the completed tracker with existing records',
    description:
      'One-time initialization to load all existing completed records. Required before tracking can begin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bootstrap results.',
  })
  async bootstrapCompleted() {
    return this.completedTracker.bootstrap();
  }

  @Get('completed/stats')
  @Scopes('integrations:airtable:read')
  @ApiOperation({
    summary: 'Get completed tracker statistics',
    description:
      'Returns current tracking statistics including total processed, last check time, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tracker statistics.',
  })
  async getCompletedStats() {
    return this.completedTracker.getStats();
  }
}
