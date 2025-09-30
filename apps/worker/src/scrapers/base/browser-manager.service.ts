import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser, BrowserContext, Page, LaunchOptions } from 'playwright';
import { BrowserConfig } from '../types';

/**
 * Manages Playwright browser lifecycle with connection pooling
 * Provides browser instances for scrapers with automatic cleanup
 */
@Injectable()
export class BrowserManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserManagerService.name);
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();
  private isShuttingDown = false;

  private readonly DEFAULT_CONFIG: BrowserConfig = {
    headless: true,
    timeout: 60000,
    viewportWidth: 1920,
    viewportHeight: 1080,
    javascript: true,
    images: true,
  };

  /**
   * Initialize and launch browser if not already running
   */
  async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    this.logger.log('Launching Playwright browser (Chromium)');

    const launchOptions: LaunchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
      // Use system Chrome/Chromium in production (Railway)
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    };

    try {
      this.browser = await chromium.launch(launchOptions);
      this.logger.log('Browser launched successfully');
      return this.browser;
    } catch (error) {
      this.logger.error('Failed to launch browser:', error);
      throw new Error(`Failed to launch Playwright browser: ${error.message}`);
    }
  }

  /**
   * Create a new browser context with custom configuration
   * Contexts are isolated sessions (like incognito tabs)
   */
  async createContext(
    contextId: string,
    config: Partial<BrowserConfig> = {}
  ): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };

    this.logger.log(`Creating browser context: ${contextId}`);

    try {
      const context = await browser.newContext({
        viewport: {
          width: mergedConfig.viewportWidth,
          height: mergedConfig.viewportHeight,
        },
        userAgent: mergedConfig.userAgent,
        javaScriptEnabled: mergedConfig.javascript,
        bypassCSP: true,
        ignoreHTTPSErrors: true,
        ...mergedConfig.launchOptions,
      });

      // Set default timeout
      context.setDefaultTimeout(mergedConfig.timeout);

      // Optionally disable images for faster loading
      if (!mergedConfig.images) {
        await context.route('**/*.{png,jpg,jpeg,gif,svg,webp}', (route) => route.abort());
      }

      this.contexts.set(contextId, context);
      this.logger.log(`Context created: ${contextId}`);

      return context;
    } catch (error) {
      this.logger.error(`Failed to create context ${contextId}:`, error);
      throw error;
    }
  }

  /**
   * Get or create a page in a specific context
   */
  async getPage(contextId: string, config?: Partial<BrowserConfig>): Promise<Page> {
    let context = this.contexts.get(contextId);

    if (!context) {
      context = await this.createContext(contextId, config);
    }

    const page = await context.newPage();
    this.logger.log(`New page created in context: ${contextId}`);

    return page;
  }

  /**
   * Close a specific context and all its pages
   */
  async closeContext(contextId: string): Promise<void> {
    const context = this.contexts.get(contextId);
    if (context) {
      this.logger.log(`Closing context: ${contextId}`);
      try {
        await context.close();
        this.contexts.delete(contextId);
      } catch (error) {
        this.logger.error(`Error closing context ${contextId}:`, error);
      }
    }
  }

  /**
   * Close all contexts
   */
  async closeAllContexts(): Promise<void> {
    this.logger.log(`Closing ${this.contexts.size} contexts`);
    const promises = Array.from(this.contexts.keys()).map((contextId) =>
      this.closeContext(contextId)
    );
    await Promise.allSettled(promises);
  }

  /**
   * Close browser and all contexts
   */
  async closeBrowser(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logger.log('Shutting down browser manager');

    // Close all contexts first
    await this.closeAllContexts();

    // Close browser
    if (this.browser) {
      try {
        await this.browser.close();
        this.logger.log('Browser closed');
      } catch (error) {
        this.logger.error('Error closing browser:', error);
      }
      this.browser = null;
    }

    this.isShuttingDown = false;
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(page: Page, filename: string): Promise<Buffer> {
    try {
      const screenshot = await page.screenshot({
        path: filename,
        fullPage: true,
        type: 'png',
      });
      this.logger.log(`Screenshot saved: ${filename}`);
      return screenshot;
    } catch (error) {
      this.logger.error(`Failed to take screenshot ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Get browser status for health checks
   */
  async getStatus(): Promise<{
    browserConnected: boolean;
    activeContexts: number;
    browserVersion?: string;
  }> {
    const browserConnected = this.browser?.isConnected() ?? false;
    const browserVersion = browserConnected
      ? await this.browser?.version()
      : undefined;

    return {
      browserConnected,
      activeContexts: this.contexts.size,
      browserVersion,
    };
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.closeBrowser();
  }
}