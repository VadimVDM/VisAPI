import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import * as puppeteer from 'puppeteer-core';
import { promises as fs } from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';

interface GenerateOptions {
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
  preview?: boolean;
}

@Injectable()
export class PdfGeneratorService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private readonly tempDir = '/tmp/pdf-generator';
  private browser: puppeteer.Browser | null = null;

  constructor(private readonly supabase: SupabaseService) {
    this.ensureTempDir();
  }

  async generateFromHtml(html: string, options: GenerateOptions) {
    const page = await this.getPage();
    
    try {
      // Set content
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Add page numbers if requested
      if (options.options.pageNumbers) {
        await page.addStyleTag({
          content: `
            @page {
              @bottom-right {
                content: counter(page) " / " counter(pages);
              }
            }
          `,
        });
      }

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options.options.format as any,
        landscape: options.options.orientation === 'landscape',
        margin: options.options.margins,
        displayHeaderFooter: !!(options.options.headerTemplate || options.options.footerTemplate),
        headerTemplate: options.options.headerTemplate || '',
        footerTemplate: options.options.footerTemplate || '',
        printBackground: options.options.printBackground,
        preferCSSPageSize: false,
      });

      return await this.savePdf(pdfBuffer, options);
    } finally {
      await page.close();
    }
  }

  async generateFromUrl(url: string, options: GenerateOptions) {
    const page = await this.getPage();
    
    try {
      // Navigate to URL
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait for any dynamic content
      await page.waitForTimeout(2000);

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options.options.format as any,
        landscape: options.options.orientation === 'landscape',
        margin: options.options.margins,
        displayHeaderFooter: !!(options.options.headerTemplate || options.options.footerTemplate),
        headerTemplate: options.options.headerTemplate || '',
        footerTemplate: options.options.footerTemplate || '',
        printBackground: options.options.printBackground,
        preferCSSPageSize: false,
      });

      return await this.savePdf(pdfBuffer, options);
    } finally {
      await page.close();
    }
  }

  private async getPage(): Promise<puppeteer.Page> {
    if (!this.browser) {
      this.browser = await this.launchBrowser();
    }

    const page = await this.browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    return page;
  }

  private async launchBrowser(): Promise<puppeteer.Browser> {
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Required for Docker
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--allow-running-insecure-content',
      ],
    });

    this.logger.log('Puppeteer browser launched');
    return browser;
  }

  private async savePdf(buffer: Buffer, options: GenerateOptions) {
    const filename = `${options.filename}.pdf`;
    const size = buffer.length;

    if (options.preview) {
      // For preview, return base64 or temp URL
      return {
        filename,
        size,
        base64: buffer.toString('base64'),
        url: null,
        signedUrl: null,
      };
    }

    // Save to Supabase Storage
    const storagePath = `pdfs/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${filename}`;
    
    const { data, error } = await this.supabase
      .getClient()
      .storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      this.logger.error('Failed to upload PDF to storage:', error);
      throw error;
    }

    // Generate signed URL (valid for 1 hour)
    const { data: urlData } = await this.supabase
      .getClient()
      .storage
      .from('documents')
      .createSignedUrl(storagePath, 3600);

    const publicUrl = this.supabase
      .getClient()
      .storage
      .from('documents')
      .getPublicUrl(storagePath).data.publicUrl;

    return {
      filename,
      size,
      base64: null,
      url: publicUrl,
      signedUrl: urlData?.signedUrl,
      storagePath,
    };
  }

  async cleanupTempFiles(jobId: string) {
    try {
      const tempPath = path.join(this.tempDir, jobId);
      if (await this.fileExists(tempPath)) {
        await fs.rmdir(tempPath, { recursive: true });
        this.logger.log(`Cleaned up temp files for job ${jobId}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp files for job ${jobId}:`, error);
    }
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      this.logger.warn('Failed to create temp directory:', error);
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('Puppeteer browser closed');
    }
  }
}