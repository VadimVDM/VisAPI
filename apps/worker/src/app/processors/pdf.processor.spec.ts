import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { PdfProcessor } from './pdf.processor';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { PdfTemplateService } from '../services/pdf-template.service';
import type { PdfJobData, PdfJobResult } from './pdf.processor';

type GenerateFromHtml = PdfGeneratorService['generateFromHtml'];
type GenerateFromUrl = PdfGeneratorService['generateFromUrl'];
type CleanupTempFiles = PdfGeneratorService['cleanupTempFiles'];
type CompileTemplate = PdfTemplateService['compileTemplate'];
type ProcessHtml = PdfTemplateService['processHtml'];
type PdfGenerationResult = Awaited<ReturnType<GenerateFromHtml>>;

interface PdfGeneratorServiceMock {
  generateFromHtml: jest.MockedFunction<GenerateFromHtml>;
  generateFromUrl: jest.MockedFunction<GenerateFromUrl>;
  cleanupTempFiles: jest.MockedFunction<CleanupTempFiles>;
}

interface PdfTemplateServiceMock {
  compileTemplate: jest.MockedFunction<CompileTemplate>;
  processHtml: jest.MockedFunction<ProcessHtml>;
}

describe('PdfProcessor', () => {
  let processor: PdfProcessor;
  let mockPdfGenerator: PdfGeneratorServiceMock;
  let mockPdfTemplate: PdfTemplateServiceMock;

  const createJob = (data: PdfJobData): Job<PdfJobData> =>
    ({
      id: data.jobId,
      data,
      updateProgress: jest.fn().mockResolvedValue(undefined),
    }) as unknown as Job<PdfJobData>;

  beforeEach(async () => {
    mockPdfGenerator = {
      generateFromHtml: jest.fn<ReturnType<GenerateFromHtml>, Parameters<GenerateFromHtml>>() as jest.MockedFunction<GenerateFromHtml>,
      generateFromUrl: jest.fn<ReturnType<GenerateFromUrl>, Parameters<GenerateFromUrl>>() as jest.MockedFunction<GenerateFromUrl>,
      cleanupTempFiles: jest.fn<ReturnType<CleanupTempFiles>, Parameters<CleanupTempFiles>>() as jest.MockedFunction<CleanupTempFiles>,
    };

    mockPdfTemplate = {
      compileTemplate: jest.fn<ReturnType<CompileTemplate>, Parameters<CompileTemplate>>() as jest.MockedFunction<CompileTemplate>,
      processHtml: jest.fn<ReturnType<ProcessHtml>, Parameters<ProcessHtml>>() as jest.MockedFunction<ProcessHtml>,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfProcessor,
        {
          provide: PdfGeneratorService,
          useValue: mockPdfGenerator,
        },
        {
          provide: PdfTemplateService,
          useValue: mockPdfTemplate,
        },
      ],
    }).compile();

    processor = module.get<PdfProcessor>(PdfProcessor);
  });

  describe('process', () => {
    it('should generate PDF from template', async () => {
      const pdfJob: PdfJobData = {
        jobId: 'pdf-789',
        source: 'template',
        template: 'visa_approved',
        data: {
          applicant: { fullName: 'John Doe' },
          visa: { type: 'Tourist' },
        },
        filename: 'visa_approved-123456.pdf',
        options: {
          format: 'A4',
          orientation: 'portrait',
          margins: { top: 10, bottom: 10, left: 10, right: 10 },
          pageNumbers: false,
          printBackground: true,
        },
        metadata: { workflowId: 'workflow-456' },
        timestamp: new Date().toISOString(),
      };

      const mockResult: PdfGenerationResult = {
        filename: 'visa_approved-123456.pdf',
        url: 'https://example.com/public/visa.pdf',
        signedUrl: 'https://example.com/signed/visa.pdf',
        size: 50000,
        base64: null,
      };

      mockPdfTemplate.compileTemplate.mockResolvedValue(
        '<html>compiled</html>',
      );
      mockPdfGenerator.generateFromHtml.mockResolvedValue(mockResult);

      const job = createJob(pdfJob);
      const result = await processor.process(job);

      expect(result).toMatchObject({
        success: true,
        jobId: 'pdf-789',
        filename: 'visa_approved-123456.pdf',
        url: 'https://example.com/public/visa.pdf',
        signedUrl: 'https://example.com/signed/visa.pdf',
        size: 50000,
        metadata: { workflowId: 'workflow-456' },
      } satisfies Partial<PdfJobResult>);

      expect(mockPdfTemplate.compileTemplate).toHaveBeenCalledWith(
        'visa_approved',
        pdfJob.data,
      );
      expect(mockPdfGenerator.generateFromHtml).toHaveBeenCalledWith(
        '<html>compiled</html>',
        {
          filename: 'visa_approved-123456.pdf',
          options: pdfJob.options,
          preview: undefined,
        },
      );
    });

    it('should generate PDF from URL', async () => {
      const pdfJob: PdfJobData = {
        jobId: 'pdf-web-1',
        source: 'url',
        url: 'https://example.com/page-to-pdf',
        data: {},
        filename: 'web-123456.pdf',
        options: {
          format: 'Letter',
          orientation: 'landscape',
          margins: { top: 5, bottom: 5, left: 5, right: 5 },
          pageNumbers: false,
          printBackground: true,
        },
        metadata: {},
        timestamp: new Date().toISOString(),
      };

      const mockResult: PdfGenerationResult = {
        filename: 'web-123456.pdf',
        url: 'https://example.com/public/web.pdf',
        signedUrl: 'https://example.com/signed/web.pdf',
        size: 75000,
        base64: null,
      };

      mockPdfGenerator.generateFromUrl.mockResolvedValue(mockResult);

      const job = createJob(pdfJob);
      const result = await processor.process(job);

      expect(result).toMatchObject({
        success: true,
        jobId: 'pdf-web-1',
        filename: 'web-123456.pdf',
        url: 'https://example.com/public/web.pdf',
        signedUrl: 'https://example.com/signed/web.pdf',
        size: 75000,
      } satisfies Partial<PdfJobResult>);

      expect(mockPdfGenerator.generateFromUrl).toHaveBeenCalledWith(
        'https://example.com/page-to-pdf',
        {
          filename: 'web-123456.pdf',
          options: pdfJob.options,
          preview: undefined,
        },
      );
    });

    it('should throw error for unsupported source', async () => {
      const pdfJob = {
        jobId: 'job-unsupported',
        source: 'unsupported',
        data: {},
        filename: 'broken.pdf',
        options: {
          format: 'A4',
          orientation: 'portrait',
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          pageNumbers: false,
          printBackground: false,
        },
        metadata: {},
        timestamp: new Date().toISOString(),
      } as unknown as PdfJobData;

      const job = createJob(pdfJob);
      await expect(processor.process(job)).rejects.toThrow(
        'Invalid PDF source: unsupported',
      );
    });

    it('should handle generation errors', async () => {
      const pdfJob: PdfJobData = {
        jobId: 'pdf-error',
        source: 'template',
        template: 'visa_error',
        data: {},
        filename: 'error.pdf',
        options: {
          format: 'A4',
          orientation: 'portrait',
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          pageNumbers: false,
          printBackground: false,
        },
        metadata: {},
        timestamp: new Date().toISOString(),
      };

      const mockError = new Error('PDF generation failed');
      mockPdfTemplate.compileTemplate.mockResolvedValue('<html />');
      mockPdfGenerator.generateFromHtml.mockRejectedValue(mockError);

      const job = createJob(pdfJob);
      await expect(processor.process(job)).rejects.toThrow(mockError);
    });
  });
});
