import { Logger } from '@nestjs/common';
import { Page, BrowserContext } from 'playwright';
import { BrowserManagerService } from './browser-manager.service';
import { ScraperError } from './scraper-error';
import {
  ScraperJobData,
  ScraperJobResult,
  ScraperOptions,
  ScraperStatus,
  ScraperType,
} from '../types';

/**
 * Abstract base class for all visa document scrapers
 * Provides common functionality for browser management, error handling, and result formatting
 */
export abstract class BaseScraper {
  protected readonly logger: Logger;
  protected page: Page | null = null;
  protected context: BrowserContext | null = null;
  protected startTime: number = 0;
  protected screenshots: string[] = [];

  constructor(
    protected readonly browserManager: BrowserManagerService,
    protected readonly scraperType: ScraperType,
  ) {
    this.logger = new Logger(`${this.constructor.name}`);
  }

  /**
   * Main entry point for scraping
   * Handles browser lifecycle and error handling
   */
  async scrape(
    jobData: ScraperJobData,
    options: ScraperOptions = {},
  ): Promise<ScraperJobResult> {
    this.startTime = Date.now();
    const contextId = `${this.scraperType}-${jobData.jobId}`;

    try {
      this.logger.log(`Starting scrape job: ${jobData.jobId}`);

      // Create browser context and page
      this.context = await this.browserManager.createContext(
        contextId,
        options.browserConfig,
      );
      this.page = await this.context.newPage();

      // Configure page delays if specified
      if (options.actionDelay) {
        await this.page.waitForTimeout(options.actionDelay);
      }

      // Execute scraping logic (implemented by subclass)
      const result = await this.executeScrape(jobData, options);

      this.logger.log(`Scrape job completed: ${jobData.jobId}`);
      return result;
    } catch (error) {
      this.logger.error(`Scrape job failed: ${jobData.jobId}`, error);

      // Take screenshot on error if enabled
      if (options.screenshotsOnError && this.page) {
        await this.captureScreenshot('error-final');
      }

      return this.createErrorResult(jobData, error, options);
    } finally {
      // Cleanup
      await this.cleanup(contextId);
    }
  }

  /**
   * Abstract method that must be implemented by each scraper
   * Contains the actual scraping logic specific to each visa type
   */
  protected abstract executeScrape(
    jobData: ScraperJobData,
    options: ScraperOptions,
  ): Promise<ScraperJobResult>;

  /**
   * Navigate to URL with retry logic
   */
  protected async navigateTo(
    url: string,
    waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'load',
  ): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    this.logger.log(`Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil });
  }

  /**
   * Wait for element with timeout
   */
  protected async waitForElement(
    selector: string,
    timeout: number = 30000,
  ): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    this.logger.log(`Waiting for element: ${selector}`);
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * Fill input field
   */
  protected async fillInput(selector: string, value: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    this.logger.log(`Filling input: ${selector}`);
    await this.page.fill(selector, value);
  }

  /**
   * Click element
   */
  protected async clickElement(selector: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    this.logger.log(`Clicking element: ${selector}`);
    await this.page.click(selector);
  }

  /**
   * Download file from page
   */
  protected async downloadFile(selector?: string): Promise<Buffer> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    this.logger.log('Initiating file download');

    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      selector ? this.page.click(selector) : Promise.resolve(),
    ]);

    const buffer = await download.createReadStream().then(
      (stream) =>
        new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
        }),
    );

    this.logger.log(`File downloaded: ${buffer.length} bytes`);
    return buffer;
  }

  /**
   * Take screenshot for debugging
   */
  protected async captureScreenshot(label: string): Promise<void> {
    if (!this.page) {
      return;
    }

    try {
      const screenshot = await this.page.screenshot({
        fullPage: true,
        type: 'png',
      });
      const base64 = screenshot.toString('base64');
      this.screenshots.push(`data:image/png;base64,${base64}`);
      this.logger.log(`Screenshot captured: ${label}`);
    } catch (error) {
      this.logger.error(`Failed to capture screenshot ${label}:`, error);
    }
  }

  /**
   * Generate PDF from current page
   * @param options PDF generation options
   * @param hideAfterSelector Optional CSS selector - hides all content after this element
   * @returns PDF buffer
   */
  protected async generatePdf(
    options?: {
      format?: 'A4' | 'Letter';
      printBackground?: boolean;
      margin?: { top?: string; bottom?: string; left?: string; right?: string };
    },
    hideAfterSelector?: string,
  ): Promise<Buffer> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    this.logger.log('Generating PDF from current page');

    // Hide content after specified selector if provided
    if (hideAfterSelector) {
      await this.page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (element) {
          // Hide all siblings after this element
          let sibling = element.nextElementSibling;
          while (sibling) {
            (sibling as HTMLElement).style.display = 'none';
            sibling = sibling.nextElementSibling;
          }

          // Hide all parent's siblings after parent
          let parent = element.parentElement;
          while (parent && parent !== document.body) {
            let parentSibling = parent.nextElementSibling;
            while (parentSibling) {
              (parentSibling as HTMLElement).style.display = 'none';
              parentSibling = parentSibling.nextElementSibling;
            }
            parent = parent.parentElement;
          }
        }
      }, hideAfterSelector);

      this.logger.log(`Content after "${hideAfterSelector}" hidden`);
    }

    // Generate PDF
    const pdfBuffer = await this.page.pdf({
      format: options?.format || 'A4',
      printBackground: options?.printBackground ?? true,
      margin: options?.margin || {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px',
      },
    });

    this.logger.log(`PDF generated: ${pdfBuffer.length} bytes`);
    return Buffer.from(pdfBuffer);
  }

  /**
   * Wait for specified time
   */
  protected async wait(ms: number): Promise<void> {
    this.logger.log(`Waiting for ${ms}ms`);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create success result
   */
  protected createSuccessResult(
    jobData: ScraperJobData,
    documentUrl: string,
    signedUrl: string,
    filename: string,
    size: number,
  ): ScraperJobResult {
    return {
      success: true,
      jobId: jobData.jobId,
      scraperType: this.scraperType,
      status: 'completed',
      documentUrl,
      signedUrl,
      filename,
      size,
      mimeType: 'application/pdf',
      downloadedAt: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      screenshots: this.screenshots,
      metadata: jobData.metadata,
    };
  }

  /**
   * Create not found result (document not ready yet)
   */
  protected createNotFoundResult(
    jobData: ScraperJobData,
    message: string,
    retryAfter?: string,
  ): ScraperJobResult {
    return {
      success: false,
      jobId: jobData.jobId,
      scraperType: this.scraperType,
      status: 'not_found',
      duration: Date.now() - this.startTime,
      error: message,
      errorCode: 'DOCUMENT_NOT_READY',
      shouldRetry: true,
      retryAfter: retryAfter || new Date(Date.now() + 3600000).toISOString(), // Retry in 1 hour
      screenshots: this.screenshots,
      metadata: jobData.metadata,
    };
  }

  /**
   * Create error result
   */
  protected createErrorResult(
    jobData: ScraperJobData,
    error: any,
    options: ScraperOptions,
  ): ScraperJobResult {
    const maxRetries = jobData.maxRetries ?? 3;
    const currentRetry = jobData.retryCount ?? 0;
    const canRetry = currentRetry < maxRetries;

    let shouldRetry = canRetry;
    if (error instanceof ScraperError) {
      shouldRetry = error.retryable ? canRetry : false;
    } else if (typeof error?.retryable === 'boolean') {
      shouldRetry = error.retryable ? canRetry : false;
    }

    return {
      success: false,
      jobId: jobData.jobId,
      scraperType: this.scraperType,
      status: 'failed',
      duration: Date.now() - this.startTime,
      error: error.message || String(error),
      errorCode: this.categorizeError(error),
      shouldRetry,
      retryAfter: shouldRetry
        ? new Date(Date.now() + 300000).toISOString() // Retry in 5 minutes
        : undefined,
      screenshots: this.screenshots,
      metadata: jobData.metadata,
    };
  }

  /**
   * Categorize error for better handling
   */
  protected categorizeError(error: any): string {
    if (error instanceof ScraperError && error.code) {
      return error.code;
    }

    if (typeof error?.code === 'string') {
      return error.code;
    }

    const message = error.message?.toLowerCase() || '';

    if (message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('navigation')) return 'NAVIGATION_ERROR';
    if (message.includes('selector')) return 'ELEMENT_NOT_FOUND';
    if (message.includes('network')) return 'NETWORK_ERROR';
    if (message.includes('credentials')) return 'INVALID_CREDENTIALS';

    return 'UNKNOWN_ERROR';
  }

  /**
   * Cleanup resources
   */
  protected async cleanup(contextId: string): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      await this.browserManager.closeContext(contextId);
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }
}
