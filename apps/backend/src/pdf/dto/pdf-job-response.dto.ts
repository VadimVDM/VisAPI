import { ApiProperty } from '@nestjs/swagger';

export class PdfJobResponseDto {
  @ApiProperty({ description: 'Unique job identifier', example: 'pdf_job_1234567890' })
  jobId: string;

  @ApiProperty({ description: 'Current job status', example: 'queued' })
  status: string;

  @ApiProperty({ description: 'Job creation timestamp', example: '2025-09-03T12:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: 'Estimated completion time', example: '2025-09-03T12:05:00Z' })
  estimatedCompletionTime: string;

  @ApiProperty({ description: 'URL to track job status', example: '/api/v1/pdf/status/pdf_job_1234567890' })
  trackingUrl: string;
}