import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PdfService } from './pdf.service';
import { PdfStatusService } from './services/pdf-status.service';
import { GeneratePdfDto } from './dto/generate-pdf.dto';
import { PdfJobResponseDto } from './dto/pdf-job-response.dto';
import { PdfJobStatusDto } from './dto/pdf-job-status.dto';
import { PdfPreviewResponseDto } from './dto/pdf-preview-response.dto';

@ApiTags('PDF Generation')
@Controller('v1/pdf')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly pdfStatusService: PdfStatusService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ 
    summary: 'Generate PDF from template or URL',
    description: 'Queues a PDF generation job and returns job ID for tracking'
  })
  @ApiResponse({ 
    status: HttpStatus.ACCEPTED, 
    description: 'PDF generation job queued successfully',
    type: PdfJobResponseDto 
  })
  async generatePdf(
    @Body(ValidationPipe) dto: GeneratePdfDto,
  ): Promise<PdfJobResponseDto> {
    const job = await this.pdfService.generatePdf(dto);
    const jobId = job.id || job.opts?.jobId || `job-${Date.now()}`;

    return {
      jobId,
      status: 'queued',
      createdAt: new Date().toISOString(),
      estimatedCompletionTime: this.calculateEstimatedTime(dto.priority),
      trackingUrl: `/api/v1/pdf/status/${jobId}`,
    };
  }

  @Get('status/:jobId')
  @ApiOperation({ 
    summary: 'Get PDF generation job status',
    description: 'Returns current status and result of a PDF generation job'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Job status retrieved successfully',
    type: PdfJobStatusDto 
  })
  async getJobStatus(
    @Param('jobId') jobId: string,
  ): Promise<PdfJobStatusDto> {
    return this.pdfStatusService.getJobStatus(jobId);
  }

  @Post('generate/batch')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ 
    summary: 'Generate multiple PDFs in batch',
    description: 'Queues multiple PDF generation jobs and returns job IDs'
  })
  async generateBatch(
    @Body(ValidationPipe) dtos: GeneratePdfDto[],
  ): Promise<PdfJobResponseDto[]> {
    const jobs = await this.pdfService.generateBatch(dtos);
    
    return jobs.map(job => {
      const jobId = job.id || job.opts?.jobId || `job-${Date.now()}-${Math.random()}`;
      return {
        jobId,
        status: 'queued',
        createdAt: new Date().toISOString(),
        estimatedCompletionTime: this.calculateEstimatedTime('normal'),
        trackingUrl: `/api/v1/pdf/status/${jobId}`,
      };
    });
  }

  @Get('templates')
  @ApiOperation({ 
    summary: 'List available PDF templates',
    description: 'Returns list of available PDF templates with their variables'
  })
  getTemplates() {
    return this.pdfService.getAvailableTemplates();
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Preview PDF without saving',
    description: 'Generates a preview PDF and returns as base64 or URL'
  })
  async previewPdf(
    @Body(ValidationPipe) dto: GeneratePdfDto,
    @Query('format') format: 'base64' | 'url' = 'url',
  ): Promise<PdfPreviewResponseDto> {
    return this.pdfService.previewPdf(dto, format);
  }

  private calculateEstimatedTime(priority?: string): string {
    const now = new Date();
    const minutes = priority === 'high' ? 1 : priority === 'low' ? 10 : 5;
    now.setMinutes(now.getMinutes() + minutes);
    return now.toISOString();
  }
}