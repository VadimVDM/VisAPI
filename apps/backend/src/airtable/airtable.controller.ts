import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';
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
    summary: 'Lookup Airtable record by Email or Order ID',
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
  ): Promise<AirtableLookupResponseDto> {
    const field: AirtableLookupField =
      dto.field === 'email' ? 'email' : 'orderId';
    const value = dto.key.trim();
    return this.airtableLookupService.lookup(field, value);
  }
}
