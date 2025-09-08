import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '@visapi/shared-types';
import { GeneratePdfDto, PdfSource, PdfPriority } from './dto/generate-pdf.dto';
import { PdfJobService } from './services/pdf-job.service';
import { nanoid } from 'nanoid';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.PDF) private readonly pdfQueue: Queue,
    private readonly pdfJobService: PdfJobService,
  ) {}

  async generatePdf(dto: GeneratePdfDto) {
    this.validateDto(dto);

    const jobId = this.generateJobId();
    const jobData = this.prepareJobData(dto, jobId);

    const job = await this.pdfQueue.add(
      JOB_NAMES.GENERATE_PDF,
      jobData,
      {
        jobId,
        priority: this.getPriorityValue(dto.priority),
        delay: dto.priority === PdfPriority.LOW ? 5000 : 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    await this.pdfJobService.trackJob(jobId, dto);

    this.logger.log(`PDF generation job queued: ${jobId}`);
    return job;
  }

  async generateBatch(dtos: GeneratePdfDto[]) {
    const jobs = await Promise.all(
      dtos.map(dto => this.generatePdf(dto))
    );
    return jobs;
  }

  async previewPdf(dto: GeneratePdfDto, format: 'base64' | 'url') {
    this.validateDto(dto);

    // For preview, we generate synchronously with a timeout
    const previewData = {
      ...this.prepareJobData(dto, 'preview_' + nanoid()),
      preview: true,
      format,
    };

    // Add to high priority queue for immediate processing
    const job = await this.pdfQueue.add(
      JOB_NAMES.GENERATE_PDF,
      previewData,
      {
        priority: 1000, // Highest priority for previews
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    // Wait for completion (max 30 seconds for preview)
    const queueEvents = new QueueEvents(QUEUE_NAMES.PDF, {
      connection: this.pdfQueue.opts.connection,
    });
    
    const result = await job.waitUntilFinished(
      queueEvents,
      30000
    );

    return result;
  }

  getAvailableTemplates() {
    return [
      {
        name: 'invoice',
        description: 'Invoice template with line items',
        variables: [
          'invoiceNumber',
          'date',
          'dueDate',
          'companyName',
          'companyAddress',
          'customerName',
          'customerAddress',
          'items',
          'subtotal',
          'tax',
          'total',
        ],
        example: {
          invoiceNumber: 'INV-001',
          date: '2025-09-03',
          items: [
            { description: 'Service', quantity: 1, price: 100 }
          ],
        },
      },
      {
        name: 'receipt',
        description: 'Payment receipt template',
        variables: [
          'receiptNumber',
          'date',
          'paymentMethod',
          'amount',
          'customerName',
          'description',
        ],
      },
      {
        name: 'report',
        description: 'Generic report template with charts',
        variables: [
          'title',
          'subtitle',
          'date',
          'content',
          'charts',
          'tables',
        ],
      },
      {
        name: 'certificate',
        description: 'Certificate of completion template',
        variables: [
          'recipientName',
          'courseName',
          'completionDate',
          'certificateNumber',
          'instructorName',
        ],
      },
      {
        name: 'visa-confirmation',
        description: 'Visa order confirmation template',
        variables: [
          'orderNumber',
          'customerName',
          'visaCountry',
          'visaType',
          'processingDays',
          'travelDate',
          'amount',
        ],
      },
    ];
  }

  private validateDto(dto: GeneratePdfDto) {
    switch (dto.source) {
      case PdfSource.TEMPLATE:
        if (!dto.template) {
          throw new BadRequestException('Template name is required for template source');
        }
        break;
      case PdfSource.URL:
        if (!dto.url) {
          throw new BadRequestException('URL is required for URL source');
        }
        break;
      case PdfSource.HTML:
        if (!dto.html) {
          throw new BadRequestException('HTML content is required for HTML source');
        }
        break;
      default:
        throw new BadRequestException('Invalid PDF source type');
    }
  }

  private generateJobId(): string {
    return `pdf_${Date.now()}_${nanoid(10)}`;
  }

  private prepareJobData(dto: GeneratePdfDto, jobId: string) {
    return {
      jobId,
      source: dto.source,
      template: dto.template,
      url: dto.url,
      html: dto.html,
      data: dto.data || {},
      filename: dto.filename || `document_${Date.now()}`,
      options: {
        format: dto.options?.format || 'A4',
        orientation: dto.options?.orientation || 'portrait',
        margins: dto.options?.margins || { top: 20, bottom: 20, left: 20, right: 20 },
        pageNumbers: dto.options?.pageNumbers || false,
        headerTemplate: dto.options?.headerTemplate,
        footerTemplate: dto.options?.footerTemplate,
        printBackground: dto.options?.printBackground !== false,
      },
      webhookUrl: dto.webhookUrl,
      metadata: dto.metadata || {},
      timestamp: new Date().toISOString(),
    };
  }

  private getPriorityValue(priority?: PdfPriority): number {
    switch (priority) {
      case PdfPriority.HIGH:
        return 10;
      case PdfPriority.LOW:
        return 1;
      case PdfPriority.NORMAL:
      default:
        return 5;
    }
  }
}