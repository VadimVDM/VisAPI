import { Injectable } from '@nestjs/common';
import type { Locator } from 'playwright';
import { BaseScraper } from '../base/base-scraper';
import { BrowserManagerService } from '../base/browser-manager.service';
import { CaptchaSolverService } from '../base/captcha-solver.service';
import { ScraperError } from '../base/scraper-error';
import { ScraperJobData, ScraperJobResult, ScraperOptions } from '../types';
import { uploadDocumentToSupabase } from '../utils';

/**
 * ESTA (Electronic System for Travel Authorization) Scraper
 * Scrapes approved ESTA documents from the U.S. CBP website
 *
 * Website: https://esta.cbp.dhs.gov/
 *
 * TODO: Implement actual scraping logic
 * Required credentials:
 * - Application Number
 * - Passport Number
 * - Date of Birth
 */
type RecaptchaInfo = {
  siteKey: string;
  action: string | null;
  isEnterprise: boolean;
  isInvisible: boolean;
  isV3: boolean;
  dataS: string | null;
  clientKey: string | null;
};

type GrecaptchaParams = {
  action?: string;
  s?: string;
  [key: string]: unknown;
};

type GrecaptchaClient = {
  sitekey?: string;
  S?: string;
  H?: GrecaptchaClient;
  R?: GrecaptchaClient;
  aa?: GrecaptchaClient;
  widget?: { data?: GrecaptchaClient };
  client?: GrecaptchaClient;
  data?: GrecaptchaClient;
  config?: { sitekey?: string; params?: GrecaptchaParams };
  params?: GrecaptchaParams;
  callback?: (token: string) => void;
  [key: string]: unknown;
};

type GrecaptchaConfig = {
  clients?: Record<string, GrecaptchaClient>;
};

type GrecaptchaAPI = {
  getResponse?: () => string;
  execute?: () => Promise<string>;
  [key: string]: unknown;
};

type GrecaptchaGlobal = GrecaptchaAPI & {
  enterprise?: GrecaptchaAPI;
};

@Injectable()
export class EstaScraper extends BaseScraper {
  constructor(
    browserManager: BrowserManagerService,
    private readonly captchaSolver: CaptchaSolverService,
  ) {
    super(browserManager, 'esta');
  }

  protected async executeScrape(
    jobData: ScraperJobData,
    options: ScraperOptions,
  ): Promise<ScraperJobResult> {
    this.logger.log(`[ESTA] Starting scrape for job ${jobData.jobId}`);
    this.logger.log(
      `[ESTA] Credentials: ${JSON.stringify(jobData.credentials)}`,
    );

    try {
      // Step 1: Navigate to ESTA homepage
      this.logger.log('[ESTA] Navigating to homepage...');
      await this.navigateTo('https://esta.cbp.dhs.gov/esta', 'load');
      await this.page.waitForTimeout(2000); // Wait for JS to initialize
      await this.captureScreenshot('esta-01-homepage');

      // Step 2: Close mobile app popup if present
      await this.closeMobileAppPopup();

      // Step 3: Open "Check ESTA Status" menu
      this.logger.log('[ESTA] Opening Check ESTA Status menu...');
      await this.page
        .getByRole('button', { name: /Check ESTA Status/i })
        .click();
      await this.page.waitForTimeout(500);

      // Step 4: Click "Check Individual Status"
      this.logger.log('[ESTA] Clicking Check Individual Status...');
      await this.page.getByText('Check Individual Status').click();
      await this.page.waitForTimeout(1000);

      // Step 5: Handle security notification popup (first time only)
      await this.handleSecurityNotification();

      // Step 6: If redirected back to home, retry navigation
      const currentUrl = this.page.url();
      if (!currentUrl.includes('individualStatusLookup')) {
        this.logger.log('[ESTA] Redirected to home, retrying navigation...');

        // Reload page to get fresh state (use 'load' instead of 'networkidle' to avoid timeout)
        await this.page.reload({ waitUntil: 'load', timeout: 30000 });
        await this.page.waitForTimeout(2000); // Extra wait for JS to initialize
        await this.captureScreenshot('esta-02-after-reload');

        // Close mobile app popup again if present
        await this.closeMobileAppPopup();

        // Navigate to status lookup again
        await this.page
          .getByRole('button', { name: /Check ESTA Status/i })
          .click();
        await this.page.waitForTimeout(500);
        await this.page.getByText('Check Individual Status').click();
        await this.page.waitForTimeout(1000);
      }

      // Step 7: Verify we're on the lookup page
      await this.page.waitForURL('**/individualStatusLookup', {
        timeout: 10000,
      });
      this.logger.log(
        '[ESTA] Successfully reached Individual Status Lookup page',
      );
      await this.captureScreenshot('esta-03-lookup-page');

      // Step 8: Fill in the form
      await this.fillLookupForm(jobData.credentials);

      // Step 9: Wait for reCAPTCHA to load (invisible captcha loads after form interaction)
      this.logger.log('[ESTA] Waiting for reCAPTCHA to load...');

      // First, try to wait for iframe (optional - may not exist for v3/Enterprise programmatic mode)
      await this.waitForRecaptchaIframe();

      // Wait for grecaptcha.enterprise global to be available (required for v3/Enterprise)
      this.logger.log('[ESTA] Waiting for grecaptcha.enterprise API to load...');
      await this.page.waitForFunction(
        () => {
          const w = window as typeof window & {
            grecaptcha?: Record<string, unknown>;
            ___grecaptcha_cfg?: unknown;
          };
          return (
            (w.grecaptcha && 'enterprise' in w.grecaptcha) ||
            typeof w.___grecaptcha_cfg !== 'undefined'
          );
        },
        { timeout: 30000 }
      ).catch((error: unknown) => {
        const { message } = this.describeError(error);
        this.logger.warn(`[ESTA] grecaptcha.enterprise API not detected: ${message}`);
      });

      // Then try to detect full reCAPTCHA configuration over time
      // Use extended polling for production proxy environments
      let recaptchaDetected = false;
      const maxAttempts = 30; // 15 seconds with 500ms intervals
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await this.page.waitForTimeout(500);
        const recaptchaInfo = await this.detectRecaptchaInfo();
        if (recaptchaInfo) {
          this.logger.log(`[ESTA] reCAPTCHA detected after ${(attempt + 1) * 500}ms`);
          this.logger.log(`[ESTA] reCAPTCHA details: siteKey=${recaptchaInfo.siteKey?.substring(0, 20)}..., version=${recaptchaInfo.isV3 ? 'v3' : 'v2'}, enterprise=${recaptchaInfo.isEnterprise}, invisible=${recaptchaInfo.isInvisible}`);
          recaptchaDetected = true;
          break;
        }
      }

      if (!recaptchaDetected) {
        this.logger.warn(`[ESTA] No reCAPTCHA configuration detected after ${maxAttempts * 0.5} seconds - form submission may fail`);
        // Log additional debugging information
        const scriptTags = await this.page.evaluate(() => {
          return Array.from(document.querySelectorAll('script[src*="recaptcha"], script[src*="gstatic"]')).map(
            (script) => (script as HTMLScriptElement).src
          );
        });
        this.logger.warn(`[ESTA] reCAPTCHA-related scripts on page: ${scriptTags.length > 0 ? scriptTags.join(', ') : 'none found'}`);
      }

      // Step 10: Solve reCAPTCHA (if present) and prepare for submission
      const submitButton = this.page.locator(
        'button:has-text("RETRIEVE APPLICATION")',
      );
      const recaptchaSolved = await this.solveRecaptchaIfPresent();

      // Check button state before submission
      const isEnabled = await submitButton.isEnabled().catch(() => false);
      const isVisible = await submitButton.isVisible().catch(() => false);
      this.logger.log(
        `[ESTA] Submit button state - enabled: ${isEnabled}, visible: ${isVisible}`,
      );

      if (!isEnabled) {
        this.logger.warn('[ESTA] Submit button is disabled - checking for validation errors');
        const validationErrors = await this.page.locator('[role="alert"], .error, .validation-error, .field-error').allTextContents();
        if (validationErrors.length > 0) {
          this.logger.error(`[ESTA] Validation errors found: ${validationErrors.join(', ')}`);
        }
      }

      // Scroll submit button into view and ensure it's ready
      await submitButton.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(1000);

      // Keep subtle human-like behaviour regardless of solver usage
      await this.mimicHumanBeforeSubmit(
        submitButton,
        recaptchaSolved ? 750 : 5000,
      );

      // Step 11: Submit the form and wait for navigation
      await this.captureScreenshot('esta-05-before-submit');
      this.logger.log('[ESTA] Submitting form...');

      try {
        await Promise.all([
          this.page.waitForURL('**/estaStatus**', {
            timeout: recaptchaSolved ? 45000 : 25000,
          }),
          submitButton.click(),
        ]);
      } catch (navError: unknown) {
        // Capture state on failure
        await this.captureScreenshot('esta-ERROR-submit-failed');
        const currentUrl = this.page.url();
        const { message } = this.describeError(navError);
        this.logger.error(
          `[ESTA] Navigation failed. Current URL: ${currentUrl}, Error: ${message}`,
        );

        // Perform detailed diagnostics
        await this.diagnoseSubmissionFailure();

        throw navError;
      }

      this.logger.log('[ESTA] Successfully navigated to status page');
      await this.captureScreenshot('esta-06-status-page');

      // Step 12: Verify we're on the status page
      const statusPageUrl = this.page.url();
      if (!statusPageUrl.includes('estaStatus')) {
        this.logger.error('[ESTA] Form submission failed - not on status page');
        return this.createErrorResult(
          jobData,
          new Error('Form submission failed'),
          options,
        );
      }

      // Step 13: Check for authorization status
      const authApproved = await this.page
        .locator('text=AUTHORIZATION APPROVED')
        .isVisible()
        .catch(() => false);
      if (!authApproved) {
        this.logger.warn('[ESTA] Authorization not approved or not found');
        return this.createNotFoundResult(
          jobData,
          'ESTA application not approved or not found',
          new Date(Date.now() + 3600000).toISOString(),
        );
      }

      this.logger.log('[ESTA] Authorization found - opening detailed view...');

      // Step 14: Click View button to open detailed page
      await this.clickElement('text=View');
      await this.page.waitForTimeout(2000);

      // Step 15: Switch to the new tab/page
      const pages = this.context.pages();
      const detailPage = pages[pages.length - 1];
      if (detailPage !== this.page) {
        this.page = detailPage;
        await this.page.waitForLoadState('networkidle');
      }

      await this.captureScreenshot('esta-07-detail-view');

      // Step 16: Generate PDF with content limited to first section
      // Hide everything from "Personal Information" heading onwards
      this.logger.log('[ESTA] Generating PDF...');

      // Use a custom evaluate to find the "Personal Information" heading
      await this.page.evaluate(() => {
        const allH2 = Array.from(document.querySelectorAll('h2'));
        const personalInfoHeading = allH2.find((h) =>
          h.textContent?.includes('Personal Information'),
        );

        if (personalInfoHeading) {
          // Hide the heading and everything after it
          personalInfoHeading.style.display = 'none';

          let sibling = personalInfoHeading.nextElementSibling;
          while (sibling) {
            (sibling as HTMLElement).style.display = 'none';
            sibling = sibling.nextElementSibling;
          }

          let parent = personalInfoHeading.parentElement;
          while (parent && parent !== document.body) {
            let parentSibling = parent.nextElementSibling;
            while (parentSibling) {
              (parentSibling as HTMLElement).style.display = 'none';
              parentSibling = parentSibling.nextElementSibling;
            }
            parent = parent.parentElement;
          }
        }
      });

      const pdfBuffer = await this.generatePdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      });

      // Step 17: Upload to Supabase
      const applicationNumber = this.getOptionalCredentialString(
        jobData.credentials,
        'applicationNumber',
      );
      const baseFilename = this.sanitizeFilenameSegment(
        applicationNumber ?? 'esta',
      );
      const filename = `${baseFilename}.pdf`;
      this.logger.log(`[ESTA] Uploading PDF: ${filename}`);

      const { url, signedUrl, path } = await uploadDocumentToSupabase(
        pdfBuffer,
        filename,
      );

      this.logger.log(`[ESTA] PDF uploaded successfully: ${path}`);

      // Step 18: Return success result
      return this.createSuccessResult(
        jobData,
        url,
        signedUrl,
        filename,
        pdfBuffer.length,
      );
    } catch (error: unknown) {
      const { message, stack } = this.describeError(error);
      this.logger.error(`[ESTA] Scrape failed for job ${jobData.jobId}: ${message}`, stack);
      return this.createErrorResult(jobData, error, options);
    }
  }

  private async mimicHumanBeforeSubmit(
    submitButton: Locator,
    pauseMs: number,
  ): Promise<void> {
    if (!this.page) {
      return;
    }

    try {
      const clampedPause = Math.max(250, pauseMs);
      const boundingBox = await submitButton.boundingBox();
      if (boundingBox) {
        await this.page.mouse.move(
          boundingBox.x + boundingBox.width / 2,
          boundingBox.y + boundingBox.height / 2,
          { steps: 12 },
        );
        await this.page.waitForTimeout(Math.min(750, clampedPause));
      }

      await this.page.waitForTimeout(clampedPause);
    } catch (error: unknown) {
      const { message } = this.describeError(error);
      this.logger.warn(
        `[ESTA] Unable to perform pre-submit humanisation gesture: ${message}`,
      );
    }
  }

  private async solveRecaptchaIfPresent(): Promise<boolean> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const recaptchaInfo = await this.detectRecaptchaInfo();
    if (!recaptchaInfo) {
      this.logger.log('[ESTA] No reCAPTCHA widget detected on lookup page');
      return false;
    }

    this.logger.log(
      `[ESTA] reCAPTCHA detected (version=${recaptchaInfo.isV3 ? 'v3' : 'v2'}, enterprise=${recaptchaInfo.isEnterprise}, action=${recaptchaInfo.action ?? 'n/a'}) - requesting solver token`,
    );

    try {
      const userAgent = await this.page.evaluate(() => navigator.userAgent);
      const token = await this.captchaSolver.solveRecaptchaV2({
        siteKey: recaptchaInfo.siteKey,
        url: this.page.url(),
        action: recaptchaInfo.action,
        invisible: recaptchaInfo.isInvisible,
        enterprise: recaptchaInfo.isEnterprise,
        dataS: recaptchaInfo.dataS,
        userAgent,
        // For v3, request score of 0.7 (government sites typically require decent scores)
        minScore: recaptchaInfo.isV3 ? 0.7 : undefined,
      });

      await this.injectRecaptchaToken(token, recaptchaInfo);
      this.logger.log('[ESTA] reCAPTCHA token injected successfully');
      return true;
    } catch (error: unknown) {
      if (error instanceof ScraperError) {
        throw error;
      }

      const { message, stack } = this.describeError(error);
      this.logger.error(
        `[ESTA] Unexpected failure while solving reCAPTCHA: ${message}`,
        stack,
      );
      throw new ScraperError('Failed to solve reCAPTCHA challenge', {
        code: 'CAPTCHA_SOLVER_FAILED',
        retryable: false,
      });
    }
  }

  private async detectRecaptchaInfo(): Promise<RecaptchaInfo | null> {
    if (!this.page) {
      return null;
    }

    try {
      return await this.page.evaluate(() => {
        const result = {
          siteKey: null as string | null,
          action: null as string | null,
          isEnterprise: false,
          isInvisible: true,
          isV3: false,
          dataS: null as string | null,
          clientKey: null as string | null,
        };

        // FIRST: Search page source for grecaptcha.execute calls to find action parameter
        // This is the most reliable way to find v3 action
        const pageSource = document.documentElement.outerHTML;

        // Pattern 1: grecaptcha.enterprise.execute('sitekey', {action: 'value'})
        const enterpriseExecutePattern = /grecaptcha\.enterprise\.execute\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{[^}]*action\s*:\s*['"]([^'"]+)['"]/;
        const enterpriseMatch = pageSource.match(enterpriseExecutePattern);
        if (enterpriseMatch) {
          result.siteKey = enterpriseMatch[1];
          result.action = enterpriseMatch[2];
          result.isEnterprise = true;
          result.isV3 = true;
          console.debug(`[reCAPTCHA] Found v3 Enterprise via execute call: action=${result.action}`);
        }

        // Pattern 2: grecaptcha.execute('sitekey', {action: 'value'})
        if (!result.action) {
          const executePattern = /grecaptcha\.execute\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{[^}]*action\s*:\s*['"]([^'"]+)['"]/;
          const executeMatch = pageSource.match(executePattern);
          if (executeMatch) {
            if (!result.siteKey) result.siteKey = executeMatch[1];
            result.action = executeMatch[2];
            result.isV3 = true;
            console.debug(`[reCAPTCHA] Found v3 via execute call: action=${result.action}`);
          }
        }

        // Method 1: Check for widget with data-sitekey attribute
        const widget = document.querySelector(
          '[data-sitekey]',
        );
        if (widget) {
          result.siteKey = widget.getAttribute('data-sitekey');
          result.action = widget.getAttribute('data-action');
          const size = widget.getAttribute('data-size');
          if (size) {
            result.isInvisible = size === 'invisible';
          }
          const dataS = widget.getAttribute('data-s');
          if (dataS) {
            result.dataS = dataS;
          }
        }

        // Method 2: Check for reCAPTCHA iframe and extract sitekey from URL
        const iframeElement = document.querySelector<HTMLIFrameElement>(
          'iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"]',
        );
        if (iframeElement?.src) {
          try {
            const url = new URL(iframeElement.src);
            if (!result.siteKey) {
              result.siteKey =
                url.searchParams.get('k') ||
                url.searchParams.get('sitekey') ||
                url.searchParams.get('render');
            }
            const sizeParam = url.searchParams.get('size');
            if (sizeParam) {
              result.isInvisible = sizeParam === 'invisible';
            }
            if (url.pathname.includes('/enterprise/')) {
              result.isEnterprise = true;
            }
          } catch (error) {
            console.debug('Failed to parse reCAPTCHA iframe URL', error);
          }
        }

        // Method 3: Check for reCAPTCHA script tags and extract from render= parameter
        // This handles programmatic v3/Enterprise reCAPTCHA that doesn't create iframes
        const scriptElements = Array.from(
          document.querySelectorAll<HTMLScriptElement>('script[src*="recaptcha"]'),
        );
        for (const scriptNode of scriptElements) {
          const src = scriptNode.getAttribute('src');
          if (!src) continue;

          try {
            const url = new URL(src, window.location.origin);

            // Check for enterprise mode
            if (url.pathname.includes('/enterprise')) {
              result.isEnterprise = true;
            }

            // Extract site key from render= parameter (used in v3/Enterprise programmatic mode)
            if (!result.siteKey) {
              const renderParam = url.searchParams.get('render');
              if (renderParam && renderParam !== 'explicit') {
                result.siteKey = renderParam;
                result.isV3 = true; // render= parameter indicates v3
                console.debug(`[reCAPTCHA] v3 site key extracted from script render parameter: ${renderParam}`);
              }
            }
          } catch (error) {
            console.debug('Failed to parse reCAPTCHA script URL', error);
          }
        }

        // Method 4: Check window.___grecaptcha_cfg configuration object
        const cfg = (window as typeof window & { ___grecaptcha_cfg?: GrecaptchaConfig })
          .___grecaptcha_cfg;
        if (cfg?.clients) {
          const entries = Object.entries(cfg.clients);

          for (const [key, client] of entries) {
            if (!result.clientKey) {
              result.clientKey = key;
            }

            // Detect v3 by client ID (>= 100000 indicates v3)
            const clientId = parseInt(key, 10);
            if (!isNaN(clientId) && clientId >= 100000) {
              result.isV3 = true;
            }

            const candidateSiteKey =
              client.sitekey ??
              client.S ??
              client.H?.sitekey ??
              client.R?.sitekey ??
              client.config?.sitekey;
            if (!result.siteKey && typeof candidateSiteKey === 'string') {
              result.siteKey = candidateSiteKey;
            }

            const nestedSources: Array<GrecaptchaClient | undefined> = [
              client,
              client.client,
              client.data,
              client.R,
              client.H,
              client.aa,
              client.widget?.data,
            ];

            nestedSources.forEach((source) => {
              if (!source) {
                return;
              }

              if (!result.siteKey && typeof source.sitekey === 'string') {
                result.siteKey = source.sitekey;
              }
              if (!result.action && typeof source.action === 'string') {
                result.action = source.action;
              }
              if (!result.dataS && typeof source.s === 'string') {
                result.dataS = source.s;
              }

              const params = source.params;
              if (params) {
                if (!result.action && typeof params.action === 'string') {
                  result.action = params.action;
                }
                if (!result.dataS && typeof params.s === 'string') {
                  result.dataS = params.s;
                }
              }
            });
          }
        }

        if (!result.siteKey) {
          return null;
        }

        return {
          siteKey: result.siteKey,
          action: result.action,
          isEnterprise: result.isEnterprise,
          isInvisible: result.isInvisible,
          isV3: result.isV3,
          dataS: result.dataS,
          clientKey: result.clientKey,
        };
      });
    } catch (error: unknown) {
      const { message } = this.describeError(error);
      console.warn('Failed to inspect reCAPTCHA configuration', message);
      return null;
    }
  }

  private async injectRecaptchaToken(
    token: string,
    info: RecaptchaInfo,
  ): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      await this.page.evaluate(
        ({ response, clientKey, isEnterprise, isV3 }) => {
          // For v3, we need to set the token in a different way
          // v3 doesn't use hidden textareas, it calls callbacks directly
          if (isV3) {
            // Set window.__recaptcha_token for any code that might read it
            (window as typeof window & { __recaptcha_token?: string }).__recaptcha_token = response;

            // For v3, we need to make grecaptcha.enterprise.execute() return our token
            // Use bracket notation to avoid TypeScript unsafe member access errors
            const w = window as typeof window & Record<string, unknown>;

            if (isEnterprise && w['grecaptcha'] && typeof w['grecaptcha'] === 'object') {
              // Patch grecaptcha.enterprise.execute to return our token
              const grecaptcha = w['grecaptcha'] as Record<string, unknown>;
              if (grecaptcha['enterprise'] && typeof grecaptcha['enterprise'] === 'object') {
                const enterprise = grecaptcha['enterprise'] as Record<string, unknown>;
                enterprise['execute'] = () => Promise.resolve(response);
                console.debug('[reCAPTCHA] Patched grecaptcha.enterprise.execute to return 2captcha token');
              }
            } else if (w['grecaptcha'] && typeof w['grecaptcha'] === 'object') {
              // Patch regular grecaptcha.execute for non-enterprise v3
              const grecaptcha = w['grecaptcha'] as Record<string, unknown>;
              grecaptcha['execute'] = () => Promise.resolve(response);
              console.debug('[reCAPTCHA] Patched grecaptcha.execute to return 2captcha token');
            }
          }

          // For v2 or as fallback, also set the traditional hidden fields
          const updateElementValue = (element: Element | null) => {
            if (!element) {
              return;
            }
            const input = element as HTMLInputElement;
            input.value = response;
            input.setAttribute('value', response);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          };

          const selectors = [
            'textarea#g-recaptcha-response',
            'textarea[name="g-recaptcha-response"]',
            'input[name="g-recaptcha-response"]',
          ];
          selectors.forEach((selector) => {
            document
              .querySelectorAll(selector)
              .forEach((node) => updateElementValue(node));
          });

          const ensureHiddenField = () => {
            const form =
              document.querySelector('form[action*="retrieve"]') ||
              document.querySelector('form');
            if (!form) {
              return;
            }
            let hidden = form.querySelector<HTMLTextAreaElement>(
              'textarea[name="g-recaptcha-response"]',
            );
            if (!hidden) {
              hidden = document.createElement('textarea');
              hidden.name = 'g-recaptcha-response';
              hidden.style.display = 'none';
              hidden.value = response;
              form.appendChild(hidden);
            }
            updateElementValue(hidden);
          };
          ensureHiddenField();

          const traverseCallbacks = (node: unknown) => {
            if (!node || typeof node !== 'object') {
              return;
            }
            const maybeCallback = (node as { callback?: unknown }).callback;
            if (typeof maybeCallback === 'function') {
              try {
                const callback = maybeCallback as (token: string) => void;
                callback(response);
              } catch (invokeError) {
                console.debug('reCAPTCHA callback invocation failed', invokeError);
              }
            }
            Object.values(node as Record<string, unknown>).forEach((value) => {
              if (value && typeof value === 'object') {
                traverseCallbacks(value);
              }
            });
          };

          const cfg = (window as typeof window & { ___grecaptcha_cfg?: GrecaptchaConfig }).___grecaptcha_cfg;
          if (cfg?.clients) {
            const keys = clientKey ? [clientKey] : Object.keys(cfg.clients);
            keys.forEach((key) => traverseCallbacks(cfg.clients[key]));
          }

          const patchApi = (api: GrecaptchaAPI | undefined) => {
            if (!api) {
              return;
            }
            if (typeof api.getResponse === 'function') {
              api.getResponse = () => response;
            }
            if (typeof api.execute === 'function') {
              api.execute = () => Promise.resolve(response);
            }
          };

          const grecaptchaGlobal = (window as typeof window & {
            grecaptcha?: GrecaptchaGlobal;
          }).grecaptcha as GrecaptchaGlobal | undefined;

          if (grecaptchaGlobal) {
            patchApi(grecaptchaGlobal);
            if (isEnterprise && grecaptchaGlobal.enterprise) {
              patchApi(grecaptchaGlobal.enterprise);
            }
          }

          window.dispatchEvent(new Event('recaptcha-token-injected'));
        },
        {
          response: token,
          clientKey: info.clientKey,
          isEnterprise: info.isEnterprise,
          isV3: info.isV3,
        },
      );
    } catch (error: unknown) {
      const { message, stack } = this.describeError(error);
      this.logger.error(
        `[ESTA] Failed to inject reCAPTCHA token: ${message}`,
        stack,
      );
      throw new ScraperError('Unable to inject reCAPTCHA token', {
        code: 'CAPTCHA_INJECTION_FAILED',
        retryable: false,
      });
    }
  }

  /**
   * Close the mobile app download popup if present
   */
  private async closeMobileAppPopup(): Promise<void> {
    if (!this.page) {
      return;
    }
    try {
      // Wait a bit for popup to fully render
      await this.page.waitForTimeout(1000);

      // Check if popup exists - use aria label which is more reliable
      const popup = this.page.getByLabel('Download the ESTA App').first();
      const isVisible = await popup.isVisible().catch(() => false);

      if (isVisible) {
        this.logger.log('[ESTA] Closing mobile app popup...');

        // Click the bottom CLOSE button (more reliable than X)
        const closeButton = popup
          .getByRole('button', { name: /^CLOSE$/i })
          .last();
        await closeButton.click();

        this.logger.log('[ESTA] Mobile app popup closed');
        await this.page.waitForTimeout(500);
      } else {
        this.logger.log('[ESTA] No mobile app popup present');
      }
    } catch (error: unknown) {
      const { message } = this.describeError(error);
      this.logger.warn(
        `[ESTA] Failed to close mobile app popup (may not exist): ${message}`,
      );
      // Non-critical, continue execution
    }
  }

  /**
   * Handle security notification popup (appears on first navigation)
   */
  private async handleSecurityNotification(): Promise<void> {
    if (!this.page) {
      return;
    }
    try {
      // Wait for potential security dialog
      await this.page.waitForTimeout(1000);

      // Check if security notification exists using getByLabel
      const securityDialog = this.page
        .getByLabel('SECURITY NOTIFICATION')
        .first();
      const isVisible = await securityDialog.isVisible().catch(() => false);

      if (isVisible) {
        this.logger.log(
          '[ESTA] Security notification detected, clicking CONFIRM & CONTINUE...',
        );

        // Click "CONFIRM & CONTINUE" button
        const confirmButton = securityDialog
          .getByRole('button', { name: /CONFIRM.*CONTINUE/i })
          .first();
        await confirmButton.click();

        this.logger.log('[ESTA] Security notification accepted');
        await this.page.waitForTimeout(1000);
      } else {
        this.logger.log(
          '[ESTA] No security notification present (already accepted)',
        );
      }
    } catch (error: unknown) {
      const { message } = this.describeError(error);
      this.logger.warn(
        `[ESTA] Failed to handle security notification (may not exist): ${message}`,
      );
      // Non-critical, continue execution
    }
  }

  /**
   * Diagnose why form submission failed
   */
  private async diagnoseSubmissionFailure(): Promise<void> {
    if (!this.page) {
      return;
    }

    try {
      // Check for validation errors
      const validationErrors = await this.page
        .locator('[role="alert"], .error, .alert-danger, .validation-error, .field-error')
        .allTextContents();
      if (validationErrors.length > 0) {
        this.logger.error(`[ESTA] Validation errors: ${validationErrors.join(', ')}`);
      }

      // Check if reCAPTCHA challenge appeared
      const recaptchaChallenge = await this.page
        .locator('iframe[title*="recaptcha challenge"], .recaptcha-checkbox')
        .isVisible()
        .catch(() => false);
      if (recaptchaChallenge) {
        this.logger.error('[ESTA] reCAPTCHA challenge appeared after submit - token may be invalid or expired');
      }

      // Check for any error messages on the page
      const errorElements = await this.page.locator('text=/error|failed|invalid/i').allTextContents();
      if (errorElements.length > 0) {
        this.logger.error(`[ESTA] Error messages found: ${errorElements.slice(0, 3).join(', ')}`);
      }

      // Check if reCAPTCHA was detected at all
      const recaptchaInfo = await this.detectRecaptchaInfo();
      if (!recaptchaInfo) {
        this.logger.error('[ESTA] CRITICAL: No reCAPTCHA detected on page - form submission blocked');

        // Check if iframe exists but wasn't detected
        const iframeExists = await this.page
          .locator('iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"]')
          .count();
        this.logger.error(`[ESTA] reCAPTCHA iframes found: ${iframeExists}`);
      } else {
        this.logger.log(`[ESTA] reCAPTCHA was detected: siteKey=${recaptchaInfo.siteKey?.substring(0, 20)}...`);
      }

      // Log current URL and page title
      const pageTitle = await this.page.title();
      this.logger.error(`[ESTA] Page title: ${pageTitle}`);
      this.logger.error(`[ESTA] Current URL: ${this.page.url()}`);
    } catch (error: unknown) {
      const { message } = this.describeError(error);
      this.logger.warn(`[ESTA] Diagnostic check failed: ${message}`);
    }
  }

  /**
   * Wait for reCAPTCHA iframe to appear and load
   * Uses extended timeout for production proxy environments
   */
  private async waitForRecaptchaIframe(): Promise<void> {
    if (!this.page) {
      return;
    }

    try {
      this.logger.log('[ESTA] Waiting for reCAPTCHA iframe to appear...');

      // Try to trigger reCAPTCHA by simulating user interaction
      // Sometimes reCAPTCHA only loads after user interaction
      try {
        const passportInput = this.page.getByLabel(/Passport Number/i);
        await passportInput.focus();
        await this.page.waitForTimeout(500);
        await passportInput.blur();
        this.logger.log('[ESTA] Triggered potential reCAPTCHA load via form interaction');
      } catch {
        this.logger.warn('[ESTA] Could not trigger reCAPTCHA via form interaction');
      }

      // Wait longer for production proxy environment (30s instead of 10s)
      // Proxies add significant latency to external script loading
      const iframeTimeout = 30000;

      // Try multiple selectors - iframe might load without src initially
      const iframeSelectors = [
        'iframe[src*="recaptcha"]',
        'iframe[src*="google.com/recaptcha"]',
        'iframe[title*="reCAPTCHA"]',
        'iframe[name^="a-"]', // Google reCAPTCHA often uses names like "a-xxxxxxxx"
      ];

      this.logger.log(`[ESTA] Checking for reCAPTCHA iframe with ${iframeTimeout}ms timeout...`);

      let iframeFound = false;
      for (const selector of iframeSelectors) {
        try {
          await this.page.waitForSelector(selector, {
            timeout: iframeTimeout / iframeSelectors.length,
            state: 'attached',
          });
          this.logger.log(`[ESTA] reCAPTCHA iframe found with selector: ${selector}`);
          iframeFound = true;
          break;
        } catch {
          // Try next selector
        }
      }

      if (!iframeFound) {
        throw new Error('No reCAPTCHA iframe found with any selector');
      }

      // Wait for iframe to have src attribute populated
      await this.page.waitForTimeout(2000);

      // Wait for the grecaptcha script to load and initialize
      this.logger.log('[ESTA] Waiting for grecaptcha script to initialize...');
      await this.page.waitForFunction(
        () => {
          return (
            typeof (window as typeof window & { grecaptcha?: unknown }).grecaptcha !== 'undefined' ||
            typeof (window as typeof window & { ___grecaptcha_cfg?: unknown }).___grecaptcha_cfg !== 'undefined'
          );
        },
        { timeout: 15000 }
      ).catch(() => {
        this.logger.warn('[ESTA] grecaptcha global not detected, but iframe exists');
      });

      this.logger.log('[ESTA] reCAPTCHA iframe initialized successfully');
    } catch (error: unknown) {
      const { message } = this.describeError(error);
      this.logger.warn(`[ESTA] reCAPTCHA iframe not found or failed to load: ${message}`);

      // Check if there are ANY iframes on the page for debugging
      const iframeCount = await this.page.locator('iframe').count();
      this.logger.warn(`[ESTA] Total iframes on page: ${iframeCount}`);

      // Log all iframe sources for debugging
      if (iframeCount > 0) {
        const iframeSrcs = await this.page.evaluate(() => {
          return Array.from(document.querySelectorAll('iframe')).map(
            (iframe) => iframe.src || iframe.getAttribute('src') || '(no src)'
          );
        });
        this.logger.warn(`[ESTA] Iframe sources: ${iframeSrcs.join(', ')}`);
      }

      // Non-fatal - continue and let the detection logic handle it
    }
  }

  /**
   * Fill in the Individual Status Lookup form
   */
  private async fillLookupForm(
    credentials: ScraperJobData['credentials'],
  ): Promise<void> {
    if (!this.page) {
      throw new ScraperError('Page not initialized');
    }
    this.logger.log('[ESTA] Filling lookup form...');

    // Parse date of birth (expecting ISO format: YYYY-MM-DD or Date object)
    const dateOfBirth = this.getCredentialString(credentials, 'dateOfBirth');
    const dob = new Date(dateOfBirth);
    const dobDay = dob.getUTCDate().toString(); // Use UTC to avoid timezone issues
    const dobMonth = dob.toLocaleString('en-US', {
      month: 'long',
      timeZone: 'UTC',
    }); // e.g., "January"
    const dobYear = dob.getUTCFullYear().toString();

    this.logger.log(`[ESTA] DOB parsed: ${dobDay} ${dobMonth} ${dobYear}`);

    // Fill Passport Number (find by label)
    this.logger.log('[ESTA] Filling passport number...');
    const passportNumber = this.getCredentialString(credentials, 'passportNumber');
    const passportInput = this.page.getByLabel(/Passport Number/i);
    await passportInput.fill(passportNumber);

    // Fill Date of Birth dropdowns
    this.logger.log('[ESTA] Filling date of birth...');

    // Find DOB section - there are multiple date sections on the page
    const dobSection = this.page
      .locator('div:has(> div:has-text("Date of Birth"))')
      .first();

    // Select day within DOB section
    const dayDropdown = dobSection.getByRole('combobox', { name: /Day/i });
    await dayDropdown.selectOption(dobDay);

    // Select month within DOB section
    const monthDropdown = dobSection.getByRole('combobox', { name: /Month/i });
    await monthDropdown.selectOption(dobMonth);

    // Select year within DOB section
    const yearDropdown = dobSection.getByRole('combobox', { name: /Year/i });
    await yearDropdown.selectOption(dobYear);

    // Fill Application Number (find by label)
    this.logger.log('[ESTA] Filling application number...');
    const applicationNumber = this.getCredentialString(credentials, 'applicationNumber');
    const applicationInput = this.page.getByLabel(/Application Number/i);
    await applicationInput.fill(applicationNumber);

    this.logger.log('[ESTA] Form filled successfully');
    await this.captureScreenshot('esta-04-form-filled');
  }

  private getCredentialString(
    credentials: ScraperJobData['credentials'],
    key: string,
  ): string {
    const record = (credentials ?? {}) as Record<string, unknown>;
    const value = record[key];
    const stringValue = this.stringifyValue(value).trim();
    if (stringValue.length > 0) {
      return stringValue;
    }

    throw new ScraperError(`Missing credential: ${key}`, {
      code: 'INVALID_CREDENTIALS',
      retryable: false,
    });
  }

  private getOptionalCredentialString(
    credentials: ScraperJobData['credentials'],
    key: string,
  ): string | null {
    const record = (credentials ?? {}) as Record<string, unknown>;
    const value = record[key];
    if (value === undefined || value === null) {
      return null;
    }
    const stringValue = this.stringifyValue(value).trim();
    return stringValue.length > 0 ? stringValue : null;
  }

  private sanitizeFilenameSegment(value: string): string {
    const cleaned = value.replace(/[^a-z0-9_-]+/gi, '_').replace(/_{2,}/g, '_');
    const trimmed = cleaned.replace(/^_+|_+$/g, '');
    return trimmed.length > 0 ? trimmed.toLowerCase() : 'document';
  }

  private stringifyValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    try {
      return JSON.stringify(value);
    } catch {
      return '[Complex Object]';
    }
  }
}
