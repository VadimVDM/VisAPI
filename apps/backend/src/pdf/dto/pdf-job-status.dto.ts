import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobMetadata } from './generate-pdf.dto';

export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class PdfResultDto {
  @ApiProperty({ description: 'Generated PDF filename' })
  filename: string;

  @ApiProperty({ description: 'Public URL to access the PDF' })
  url: string;

  @ApiProperty({ description: 'Signed URL with temporary access' })
  signedUrl: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'Expiry time for signed URL' })
  expiresAt: string;
}

export class PdfJobStatusDto {
  @ApiProperty({ description: 'Job ID' })
  jobId: string;

  @ApiProperty({ enum: JobStatus, description: 'Current job status' })
  status: JobStatus;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  progress: number;

  @ApiProperty({ description: 'Job creation timestamp' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'Job start timestamp' })
  startedAt?: string;

  @ApiPropertyOptional({ description: 'Job completion timestamp' })
  completedAt?: string;

  @ApiPropertyOptional({ description: 'Processing duration in milliseconds' })
  duration?: number;

  @ApiPropertyOptional({
    type: PdfResultDto,
    description: 'Result data if completed',
  })
  result?: PdfResultDto;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;

  @ApiPropertyOptional({ description: 'Number of retry attempts' })
  attempts?: number;

  @ApiPropertyOptional({ description: 'Job metadata' })
  metadata?: JobMetadata;
}
