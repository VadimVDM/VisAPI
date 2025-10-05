import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '@visapi/shared-types';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { PdfTemplateService } from '../services/pdf-template.service';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface PdfJobData {
  jobId: string;
  source: 'template' | 'url' | 'html';
  template?: string;
  url?: string;
  html?: string;
  data: Record<string, JsonValue>;
  filename: string;
  options: {
    format: string;
    orientation: 'portrait' | 'landscape';
    margins: { top: number; bottom: number; left: number; right: number };
    pageNumbers: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
    printBackground: boolean;
  };
  webhookUrl?: string;
  metadata: Record<string, JsonValue>;
  timestamp: string;
  preview?: boolean;
  format?: 'base64' | 'url';
}

export interface PdfJobResult {
  success: boolean;
  jobId: string;
  filename: string;
  url?: string;
  signedUrl?: string;
  base64?: string;
  size: number;
  mimeType: string;
  generatedAt: string;
  duration: number;
  metadata: Record<string, JsonValue>;
}

interface PdfGenerationResult {
  filename: string;
  url?: string | null;
  signedUrl?: string | null;
  base64?: string | null;
  size: number;
  storagePath?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.PDF, {
  concurrency: 3, // Process 3 PDFs simultaneously
  maxStalledCount: 3,
  stalledInterval: 30000,
})
export class PdfProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfProcessor.name);

  constructor(
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly templateService: PdfTemplateService,
  ) {
    super();
  }

  async process(job: Job<PdfJobData>): Promise<PdfJobResult> {
    const startTime = Date.now();
    const { data } = job;

    this.logger.log(`Processing PDF job ${job.id} - Source: ${data.source}`);

    try {
      // Update progress
      await job.updateProgress(10);

      let result: PdfGenerationResult;

      switch (data.source) {
        case 'template':
          result = await this.generateFromTemplate(job);
          break;
        case 'url':
          result = await this.generateFromUrl(job);
          break;
        case 'html':
          result = await this.generateFromHtml(job);
          break;
        default: {
          const invalidSource: never = data.source;
          throw new Error(`Invalid PDF source: ${String(invalidSource)}`);
        }
      }

      await job.updateProgress(100);

      const response: PdfJobResult = {
        success: true,
        jobId: data.jobId,
        filename: result.filename,
        url: data.preview ? undefined : result.url,
        signedUrl: data.preview ? undefined : result.signedUrl,
        base64:
          data.preview && data.format === 'base64' ? result.base64 : undefined,
        size: result.size,
        mimeType: 'application/pdf',
        generatedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        metadata: data.metadata,
      };

      this.logger.log(
        `PDF generated successfully: ${result.filename} (${result.size} bytes) in ${response.duration}ms`,
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to generate PDF for job ${job.id}:`, error);
      throw error;
    }
  }

  private async generateFromTemplate(job: Job<PdfJobData>) {
    const { data } = job;

    await job.updateProgress(20);

    // Compile template with data
    const html = await this.templateService.compileTemplate(
      data.template,
      data.data,
    );

    await job.updateProgress(40);

    // Generate PDF from compiled HTML
    const result = await this.pdfGenerator.generateFromHtml(html, {
      filename: data.filename,
      options: data.options,
      preview: data.preview,
    });

    await job.updateProgress(90);

    return result;
  }

  private async generateFromUrl(job: Job<PdfJobData>) {
    const { data } = job;

    await job.updateProgress(30);

    const result = await this.pdfGenerator.generateFromUrl(data.url, {
      filename: data.filename,
      options: data.options,
      preview: data.preview,
    });

    await job.updateProgress(90);

    return result;
  }

  private async generateFromHtml(job: Job<PdfJobData>) {
    const { data } = job;

    await job.updateProgress(30);

    // Process HTML with template engine if it contains variables
    const processedHtml = this.templateService.processHtml(
      data.html,
      data.data,
    );

    await job.updateProgress(50);

    const result = await this.pdfGenerator.generateFromHtml(processedHtml, {
      filename: data.filename,
      options: data.options,
      preview: data.preview,
    });

    await job.updateProgress(90);

    return result;
  }

  async onCompleted(job: Job<PdfJobData>, result: PdfJobResult) {
    this.logger.log(`Job ${job.id} completed successfully`);

    // Clean up temporary files if any
    if (result.success && !job.data.preview) {
      await this.pdfGenerator.cleanupTempFiles(job.id);
    }
  }

  async onFailed(job: Job<PdfJobData>, error: Error) {
    this.logger.error(`Job ${job.id} failed:`, error);

    // Clean up any partial files
    await this.pdfGenerator.cleanupTempFiles(job.id);
  }

  onActive(job: Job<PdfJobData>) {
    this.logger.log(`Job ${job.id} started processing`);
  }

  onStalled(job: Job<PdfJobData>) {
    this.logger.warn(`Job ${job.id} stalled and will be retried`);
  }
}
