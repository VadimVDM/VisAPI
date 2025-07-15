import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { PdfProcessor } from './pdf.processor';
import { PdfGeneratorService } from '../services/pdf-generator.service';

describe('PdfProcessor', () => {
  let processor: PdfProcessor;
  let mockPdfGenerator: any;

  beforeEach(async () => {
    mockPdfGenerator = {
      generateFromTemplate: jest.fn(),
      generateFromUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfProcessor,
        {
          provide: PdfGeneratorService,
          useValue: mockPdfGenerator,
        },
      ],
    }).compile();

    processor = module.get<PdfProcessor>(PdfProcessor);
  });

  describe('process', () => {
    it('should generate PDF from template', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          template: 'visa_approved',
          data: {
            applicant: { fullName: 'John Doe' },
            visa: { type: 'Tourist' },
          },
          workflowId: 'workflow-456',
          options: {
            format: 'A4',
            orientation: 'portrait',
          },
        },
      } as Job;

      const mockResult = {
        jobId: 'pdf-789',
        filename: 'visa_approved-123456.pdf',
        publicUrl: 'https://example.com/public/visa.pdf',
        signedUrl: 'https://example.com/signed/visa.pdf',
        size: 50000,
      };

      mockPdfGenerator.generateFromTemplate.mockResolvedValue(mockResult);

      const result = await processor.process(mockJob);

      expect(result).toEqual({
        success: true,
        jobId: 'pdf-789',
        filename: 'visa_approved-123456.pdf',
        template: 'visa_approved',
        url: 'https://example.com/public/visa.pdf',
        signedUrl: 'https://example.com/signed/visa.pdf',
        size: 50000,
        timestamp: expect.any(String),
        workflowId: 'workflow-456',
      });

      expect(mockPdfGenerator.generateFromTemplate).toHaveBeenCalledWith(
        'visa_approved',
        expect.objectContaining({
          applicant: { fullName: 'John Doe' },
          visa: { type: 'Tourist' },
          workflowId: 'workflow-456',
          generatedAt: expect.any(String),
          jobId: 'job-123',
        }),
        {
          format: 'A4',
          orientation: 'portrait',
        }
      );
    });

    it('should generate PDF from URL', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          url: 'https://example.com/page-to-pdf',
          options: {
            format: 'Letter',
            orientation: 'landscape',
          },
        },
      } as Job;

      const mockResult = {
        jobId: 'pdf-789',
        filename: 'web-123456.pdf',
        publicUrl: 'https://example.com/public/web.pdf',
        signedUrl: 'https://example.com/signed/web.pdf',
        size: 75000,
      };

      mockPdfGenerator.generateFromUrl.mockResolvedValue(mockResult);

      const result = await processor.process(mockJob);

      expect(result).toEqual({
        success: true,
        jobId: 'pdf-789',
        filename: 'web-123456.pdf',
        template: 'url',
        url: 'https://example.com/public/web.pdf',
        signedUrl: 'https://example.com/signed/web.pdf',
        size: 75000,
        timestamp: expect.any(String),
        workflowId: undefined,
      });

      expect(mockPdfGenerator.generateFromUrl).toHaveBeenCalledWith(
        'https://example.com/page-to-pdf',
        {
          format: 'Letter',
          orientation: 'landscape',
        }
      );
    });

    it('should throw error if neither template nor url is provided', async () => {
      const mockJob = {
        id: 'job-123',
        data: {},
      } as Job;

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Either template or url must be provided'
      );
    });

    it('should handle generation errors', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          template: 'visa_approved',
          data: {},
        },
      } as Job;

      const mockError = new Error('PDF generation failed');
      mockPdfGenerator.generateFromTemplate.mockRejectedValue(mockError);

      await expect(processor.process(mockJob)).rejects.toThrow(mockError);
    });
  });
});