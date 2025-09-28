import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  IsEnum,
} from 'class-validator';

export enum RetriggerMode {
  SINGLE = 'single',
  BULK = 'bulk',
}

export class RetriggerOrdersDto {
  @ApiProperty({
    enum: RetriggerMode,
    description: 'Mode of retriggering: single order or bulk',
    example: RetriggerMode.SINGLE,
  })
  @IsEnum(RetriggerMode)
  mode: RetriggerMode;

  @ApiProperty({
    description: 'Single order ID to retrigger (for single mode)',
    example: '123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({
    description: 'Array of order IDs to retrigger (for bulk mode)',
    example: ['123456', '789012'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  orderIds?: string[];

  @ApiProperty({
    description: 'Start date for bulk retriggering (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for bulk retriggering (ISO 8601)',
    example: '2025-01-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Skip orders that have already been processed successfully',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  skipProcessed?: boolean = true;
}

export class RetriggerResultDto {
  @ApiProperty({
    description: 'Number of orders successfully retriggered',
  })
  successful: number;

  @ApiProperty({
    description: 'Number of orders that failed to retrigger',
  })
  failed: number;

  @ApiProperty({
    description: 'Number of orders skipped (already processed)',
  })
  skipped: number;

  @ApiProperty({
    description: 'Details of each order processing',
    type: [Object],
  })
  details: Array<{
    orderId: string;
    status: 'success' | 'failed' | 'skipped';
    message?: string;
    error?: string;
  }>;
}
