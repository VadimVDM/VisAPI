import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AirtableLookupStatus {
  NONE = 'none',
  FOUND = 'found',
  MULTIPLE = 'multiple',
}

export class AirtableRecordDto {
  @ApiProperty({ description: 'Airtable record identifier.' })
  id!: string;

  @ApiProperty({ description: 'Key fields from Airtable record (Status, ID, Email, Phone).', type: Object })
  fields!: Record<string, unknown>;

  @ApiProperty({ description: 'Record creation timestamp in Airtable.' })
  createdTime!: string;

  @ApiPropertyOptional({
    description: 'Expanded linked records from Applications, Applicants, and Transactions tables.',
    type: Object
  })
  expanded?: Record<string, unknown>;
}

export class AirtableLookupResponseDto {
  @ApiProperty({ enum: AirtableLookupStatus })
  status!: AirtableLookupStatus;

  @ApiProperty({ description: 'Human-friendly outcome message.' })
  message!: string;

  @ApiPropertyOptional({ type: AirtableRecordDto })
  record?: AirtableRecordDto;
}
