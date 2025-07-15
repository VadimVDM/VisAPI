import { ApiProperty } from '@nestjs/swagger';

export class LogEntryDto {
  @ApiProperty({
    description: 'Unique log entry ID',
    example: 12345,
  })
  id: number;

  @ApiProperty({
    description: 'Log level',
    example: 'info',
    enum: ['debug', 'info', 'warn', 'error'],
  })
  level: string;

  @ApiProperty({
    description: 'Log message',
    example: 'Workflow processed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Structured metadata',
    example: { duration: 1250, steps: 3 },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Associated workflow ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  workflow_id?: string;

  @ApiProperty({
    description: 'Associated job ID',
    example: 'job_12345',
    required: false,
  })
  job_id?: string;

  @ApiProperty({
    description: 'Whether PII was redacted from this log entry',
    example: false,
  })
  pii_redacted: boolean;

  @ApiProperty({
    description: 'Log creation timestamp',
    example: '2025-07-15T10:30:00Z',
  })
  created_at: string;
}

export class PaginatedLogsDto {
  @ApiProperty({
    description: 'Array of log entries',
    type: [LogEntryDto],
  })
  logs: LogEntryDto[];

  @ApiProperty({
    description: 'Total number of logs matching the filters',
    example: 250,
  })
  total: number;

  @ApiProperty({
    description: 'Current offset',
    example: 0,
  })
  offset: number;

  @ApiProperty({
    description: 'Number of results per page',
    example: 50,
  })
  limit: number;

  @ApiProperty({
    description: 'Whether there are more results available',
    example: true,
  })
  has_more: boolean;
}

export class LogStatsDto {
  @ApiProperty({
    description: 'Total number of logs',
    example: 1500,
  })
  total: number;

  @ApiProperty({
    description: 'Log count by level',
    example: { debug: 500, info: 800, warn: 150, error: 50 },
  })
  by_level: Record<string, number>;

  @ApiProperty({
    description: 'Number of logs with PII redacted',
    example: 45,
  })
  with_pii: number;

  @ApiProperty({
    description: 'Number of logs in the last 24 hours',
    example: 125,
  })
  recent_count: number;
}