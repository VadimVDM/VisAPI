import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export class LogFiltersDto {
  @ApiProperty({
    description: 'Filter by log level',
    enum: LogLevel,
    required: false,
    example: LogLevel.INFO,
  })
  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel;

  @ApiProperty({
    description: 'Filter by workflow ID',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  workflow_id?: string;

  @ApiProperty({
    description: 'Filter by job ID',
    required: false,
    example: 'job_12345',
  })
  @IsOptional()
  @IsString()
  job_id?: string;

  @ApiProperty({
    description: 'Filter logs from this date (ISO 8601 format)',
    required: false,
    example: '2025-07-15T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({
    description: 'Filter logs until this date (ISO 8601 format)',
    required: false,
    example: '2025-07-15T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({
    description: 'Filter by message content (case-insensitive)',
    required: false,
    example: 'workflow processed',
  })
  @IsOptional()
  @IsString()
  message_contains?: string;

  @ApiProperty({
    description: 'Number of results to return (1-100)',
    required: false,
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiProperty({
    description: 'Number of results to skip (pagination)',
    required: false,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  offset?: number = 0;
}