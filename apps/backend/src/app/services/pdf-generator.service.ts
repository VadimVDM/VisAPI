import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import * as puppeteer from 'puppeteer-core';
import { PdfTemplateService } from './pdf-template.service';
import { StorageService } from '@visapi/core-supabase';
import { v4 as uuidv4 } from 'uuid';

export interface PdfGenerationOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

export interface PdfGenerationResult {
  jobId: string;
  filename: string;
  publicUrl: string;
  signedUrl: string;
  size: number;
}

@Injectable()
export class PdfGeneratorService {
  private browser: puppeteer.Browser | null = null;

  constructor(
    private readonly logger: PinoLogger,
    private readonly templateService: PdfTemplateService,
    private readonly storageService: StorageService,
  ) {
    this.logger.setContext(PdfGeneratorService.name);
  }

  /**
   * Initialize Puppeteer browser
   */
  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      this.logger.info('Launching Puppeteer browser');

      // Use Chrome/Chromium executable path based on platform
      // Allow override via PUPPETEER_EXECUTABLE_PATH environment variable if needed
      const executablePath =
        process.platform === 'darwin'
          ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
          : process.platform === 'win32'
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            : '/usr/bin/google-chrome-stable'; // Linux

      this.browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process', // Important for containerized environments
          '--no-zygote',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Generate PDF from template
   */
  async generateFromTemplate(
    templateName: string,
    data: Record<string, unknown>,
    options: PdfGenerationOptions = {},
  ): Promise<PdfGenerationResult> {
    const jobId = uuidv4();
    const startTime = Date.now();

    try {
      // Render HTML from template
      const html = await this.templateService.renderTemplate(
        templateName,
        data,
      );

      // Generate PDF
      const pdfBuffer = await this.generatePdfFromHtml(html, options);

      // Upload to storage
      const filename = `${templateName}-${Date.now()}.pdf`;
      const storagePath = `${(data['workflowId'] as string) || 'general'}/${jobId}/${filename}`;

      const uploadResult = await this.storageService.uploadFile(
        storagePath,
        pdfBuffer,
        {
          contentType: 'application/pdf',
          cacheControl: '86400', // 24 hours
        },
      );

      const result: PdfGenerationResult = {
        jobId,
        filename,
        publicUrl: uploadResult.publicUrl,
        signedUrl: uploadResult.signedUrl || '',
        size: pdfBuffer.length,
      };

      this.logger.info(
        {
          jobId,
          templateName,
          size: pdfBuffer.length,
          duration: Date.now() - startTime,
        },
        'PDF generated successfully',
      );

      return result;
    } catch (error: unknown) {
      this.logger.error(
        { error, jobId, templateName },
        'Failed to generate PDF',
      );
      throw error;
    }
  }

  /**
   * Generate PDF from HTML string
   */
  async generatePdfFromHtml(
    html: string,
    options: PdfGenerationOptions = {},
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Set content
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // Default PDF options
      const pdfOptions: puppeteer.PDFOptions = {
        format: options.format || 'A4',
        landscape: options.orientation === 'landscape',
        margin: options.margin || {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm',
        },
        printBackground: options.printBackground !== false,
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate,
        footerTemplate: options.footerTemplate,
      };

      // Generate PDF
      const pdfBuffer = await page.pdf(pdfOptions);

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Generate PDF from URL
   */
  async generateFromUrl(
    url: string,
    options: PdfGenerationOptions = {},
  ): Promise<PdfGenerationResult> {
    const jobId = uuidv4();
    const startTime = Date.now();

    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      try {
        // Navigate to URL
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        // Generate PDF
        const pdfOptions: puppeteer.PDFOptions = {
          format: options.format || 'A4',
          landscape: options.orientation === 'landscape',
          margin: options.margin || {
            top: '1cm',
            right: '1cm',
            bottom: '1cm',
            left: '1cm',
          },
          printBackground: options.printBackground !== false,
          displayHeaderFooter: options.displayHeaderFooter || false,
          headerTemplate: options.headerTemplate,
          footerTemplate: options.footerTemplate,
        };

        const pdfBuffer = await page.pdf(pdfOptions);

        // Upload to storage
        const filename = `web-${Date.now()}.pdf`;
        const storagePath = `web/${jobId}/${filename}`;

        const uploadResult = await this.storageService.uploadFile(
          storagePath,
          Buffer.from(pdfBuffer),
          {
            contentType: 'application/pdf',
            cacheControl: '86400', // 24 hours
          },
        );

        const result: PdfGenerationResult = {
          jobId,
          filename,
          publicUrl: uploadResult.publicUrl,
          signedUrl: uploadResult.signedUrl || '',
          size: pdfBuffer.length,
        };

        this.logger.info(
          {
            jobId,
            url,
            size: pdfBuffer.length,
            duration: Date.now() - startTime,
          },
          'PDF generated from URL successfully',
        );

        return result;
      } finally {
        await page.close();
      }
    } catch (error: unknown) {
      this.logger.error(
        { error, jobId, url },
        'Failed to generate PDF from URL',
      );
      throw error;
    }
  }

  /**
   * Clean up browser on module destroy
   */
  async onModuleDestroy() {
    if (this.browser) {
      this.logger.info('Closing Puppeteer browser');
      await this.browser.close();
      this.browser = null;
    }
  }
}
