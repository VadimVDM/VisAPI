import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AirtableLookupStatus {
  NONE = 'none',
  FOUND = 'found',
  MULTIPLE = 'multiple',
}

export class AirtableRecordDto {
  @ApiProperty({ description: 'Airtable record identifier.' })
  id!: string;

  @ApiProperty({ description: 'Field values returned from Airtable.', type: Object })
  fields!: Record<string, unknown>;

  @ApiProperty({ description: 'Record creation timestamp in Airtable.' })
  createdTime!: string;
}

export class AirtableLookupResponseDto {
  @ApiProperty({ enum: AirtableLookupStatus })
  status!: AirtableLookupStatus;

  @ApiProperty({ description: 'Human-friendly outcome message.' })
  message!: string;

  @ApiPropertyOptional({ type: AirtableRecordDto })
  record?: AirtableRecordDto;
}
