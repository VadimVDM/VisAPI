import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  chromium,
  Browser,
  BrowserContext,
  Page,
  LaunchOptions,
} from 'playwright';
import { ConfigService } from '@visapi/core-config';
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

  constructor(private readonly configService: ConfigService) {
    if (this.configService.proxyEnabled) {
      this.logger.log(
        `Proxy configured for browser contexts: ${this.configService.proxyType}://${this.configService.proxyHost}:${this.configService.proxyPort}`,
      );
    }
  }

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
        // Anti-detection: Make headless browser appear more like a real browser
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-notifications',
        '--disable-popup-blocking',
        '--lang=en-US,en',
      ],
      // Use system Chrome/Chromium in production (Railway)
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    };

    try {
      this.browser = await chromium.launch(launchOptions);
      this.logger.log('Browser launched successfully');
      return this.browser;
    } catch (error: unknown) {
      const { message } = this.describeError(error);
      this.logger.error(`Failed to launch browser: ${message}`);
      throw new Error(`Failed to launch Playwright browser: ${message}`);
    }
  }

  /**
   * Create a new browser context with custom configuration
   * Contexts are isolated sessions (like incognito tabs)
   */
  async createContext(
    contextId: string,
    config: Partial<BrowserConfig> = {},
  ): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };

    this.logger.log(`Creating browser context: ${contextId}`);

    try {
      const contextOptions: Parameters<Browser['newContext']>[0] = {
        viewport: {
          width: mergedConfig.viewportWidth,
          height: mergedConfig.viewportHeight,
        },
        userAgent:
          mergedConfig.userAgent ||
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        javaScriptEnabled: mergedConfig.javascript,
        bypassCSP: true,
        ignoreHTTPSErrors: true,
        locale: 'en-US',
        timezoneId: 'America/New_York',
        ...mergedConfig.launchOptions,
      };

      // Add proxy configuration if enabled
      if (
        this.configService.proxyEnabled &&
        this.configService.proxyHost &&
        this.configService.proxyPort
      ) {
        // Standard proxy format: protocol://username:password@host:port
        const proxyServer = `${this.configService.proxyType}://${this.configService.proxyHost}:${this.configService.proxyPort}`;

        contextOptions.proxy = {
          server: proxyServer,
          bypass: 'localhost,127.0.0.1',
        };

        // Add authentication separately if provided
        if (
          this.configService.proxyUsername &&
          this.configService.proxyPassword
        ) {
          contextOptions.proxy.username = this.configService.proxyUsername;
          contextOptions.proxy.password = this.configService.proxyPassword;
        }

        this.logger.log(
          `Browser context ${contextId} will use proxy: ${proxyServer} (auth: ${contextOptions.proxy.username ? 'yes' : 'no'})`,
        );
      }

      let context: BrowserContext;
      try {
        context = await browser.newContext(contextOptions);

        // Test proxy connection with a simple request
        if (contextOptions.proxy) {
          this.logger.log(`Testing proxy connection for ${contextId}...`);
          const testPage = await context.newPage();
          try {
            await testPage.goto('https://api.ipify.org?format=json', {
              waitUntil: 'networkidle',
              timeout: 15000,
            });
            const content = await testPage.content();
            this.logger.log(
              `✅ Proxy test successful for ${contextId}: ${content}`,
            );
            await testPage.close();
          } catch (proxyError: unknown) {
            const { message } = this.describeError(proxyError);
            this.logger.warn(
              `⚠️ Proxy test failed for ${contextId}: ${message}. Proceeding anyway...`,
            );
            await testPage.close();
            // Don't throw - allow scraping to proceed
          }
        }
      } catch (error: unknown) {
        const { message, stack } = this.describeError(error);
        this.logger.error(
          `Failed to create context ${contextId}: ${message}`,
          stack,
        );
        // Log full proxy config for debugging
        this.logger.error(
          `Proxy config: ${JSON.stringify(contextOptions.proxy)}`,
        );
        throw error;
      }

      // Set default timeout
      context.setDefaultTimeout(mergedConfig.timeout);

      // Override navigator.webdriver to hide automation
      await context.addInitScript(() => {
        const nav = navigator as Navigator & {
          webdriver?: boolean;
          plugins?: unknown;
          languages?: readonly string[];
        };

        Object.defineProperty(nav, 'webdriver', {
          get: () => false,
        });

        Object.defineProperty(nav, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        Object.defineProperty(nav, 'languages', {
          get: () => ['en-US', 'en'],
        });

        const win = window as typeof window & {
          chrome?: { runtime?: Record<string, unknown> };
        };

        win.chrome = {
          runtime: {},
        };
      });

      // Optionally disable images for faster loading
      if (!mergedConfig.images) {
        await context.route('**/*.{png,jpg,jpeg,gif,svg,webp}', (route) =>
          route.abort(),
        );
      }

      this.contexts.set(contextId, context);
      this.logger.log(`Context created: ${contextId}`);

      return context;
    } catch (error: unknown) {
      const { message } = this.describeError(error);
      this.logger.error(`Failed to create context ${contextId}: ${message}`);
      throw error;
    }
  }

  /**
   * Get or create a page in a specific context
   */
  async getPage(
    contextId: string,
    config?: Partial<BrowserConfig>,
  ): Promise<Page> {
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
      } catch (error: unknown) {
        const { message } = this.describeError(error);
        this.logger.error(`Error closing context ${contextId}: ${message}`);
      }
    }
  }

  /**
   * Close all contexts
   */
  async closeAllContexts(): Promise<void> {
    this.logger.log(`Closing ${this.contexts.size} contexts`);
    const promises = Array.from(this.contexts.keys()).map((contextId) =>
      this.closeContext(contextId),
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
      } catch (error: unknown) {
        const { message } = this.describeError(error);
        this.logger.error(`Error closing browser: ${message}`);
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
    } catch (error: unknown) {
      const { message } = this.describeError(error);
      this.logger.error(`Failed to take screenshot ${filename}: ${message}`);
      throw error;
    }
  }

  /**
   * Get browser status for health checks
   */
  getStatus(): {
    browserConnected: boolean;
    activeContexts: number;
    browserVersion?: string;
  } {
    const browserConnected = this.browser?.isConnected() ?? false;
    let browserVersion: string | undefined;
    if (browserConnected && this.browser) {
      browserVersion = this.browser.version();
    }

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

  private describeError(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    try {
      return { message: JSON.stringify(error) };
    } catch {
      return { message: 'Unknown error' };
    }
  }
}
