import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PdfGeneratorService } from '../services/pdf-generator.service';

interface PdfJobData {
  template: string;
  data: Record<string, any>;
  filename?: string;
  options?: {
    format?: 'A4' | 'Letter';
    orientation?: 'portrait' | 'landscape';
  };
  workflowId?: string;
  url?: string; // For URL-based PDF generation
}

@Injectable()
export class PdfProcessor {
  private readonly logger = new Logger(PdfProcessor.name);

  constructor(private readonly pdfGenerator: PdfGeneratorService) {}

  async process(job: Job<PdfJobData>) {
    const { template, data, filename, options, workflowId, url } = job.data;

    this.logger.log(`Processing PDF generation job: ${job.id}`);
    this.logger.log(`Template: ${template || 'URL-based'}, Workflow: ${workflowId || 'none'}`);

    try {
      let result;

      if (url) {
        // Generate PDF from URL
        result = await this.pdfGenerator.generateFromUrl(url, options);
      } else if (template) {
        // Generate PDF from template
        // Include workflowId in data for storage path
        const enrichedData = {
          ...data,
          workflowId,
          generatedAt: new Date().toISOString(),
          jobId: job.id,
        };

        result = await this.pdfGenerator.generateFromTemplate(
          template,
          enrichedData,
          options
        );
      } else {
        throw new Error('Either template or url must be provided');
      }

      const response = {
        success: true,
        jobId: result.jobId,
        filename: result.filename,
        template: template || 'url',
        url: result.publicUrl,
        signedUrl: result.signedUrl,
        size: result.size,
        timestamp: new Date().toISOString(),
        workflowId,
      };

      this.logger.log(`PDF generated successfully: ${result.filename} (${result.size} bytes)`);
      return response;
    } catch (error) {
      this.logger.error('Failed to generate PDF:', error);
      throw error;
    }
  }
}