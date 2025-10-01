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
  dataS: string | null;
  clientKey: string | null;
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
      await this.navigateTo('https://esta.cbp.dhs.gov/esta', 'networkidle');
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

        // Reload page to get fresh state
        await this.page.reload({ waitUntil: 'networkidle' });
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

      // Step 9: Solve reCAPTCHA (if present) and prepare for submission
      const submitButton = this.page.locator(
        'button:has-text("RETRIEVE APPLICATION")',
      );
      const recaptchaSolved = await this.solveRecaptchaIfPresent();

      // Keep subtle human-like behaviour regardless of solver usage
      await this.mimicHumanBeforeSubmit(
        submitButton,
        recaptchaSolved ? 750 : 5000,
      );

      // Step 10: Submit the form and wait for navigation
      this.logger.log('[ESTA] Submitting form...');

      await Promise.all([
        this.page.waitForURL('**/estaStatus**', {
          timeout: recaptchaSolved ? 45000 : 25000,
        }),
        submitButton.click(),
      ]);

      this.logger.log('[ESTA] Successfully navigated to status page');
      await this.captureScreenshot('esta-05-status-page');

      // Step 11: Verify we're on the status page
      const statusPageUrl = this.page.url();
      if (!statusPageUrl.includes('estaStatus')) {
        this.logger.error('[ESTA] Form submission failed - not on status page');
        return this.createErrorResult(
          jobData,
          new Error('Form submission failed'),
          options,
        );
      }

      // Step 12: Check for authorization status
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

      // Step 13: Click View button to open detailed page
      await this.clickElement('text=View');
      await this.page.waitForTimeout(2000);

      // Step 14: Switch to the new tab/page
      const pages = this.context!.pages();
      const detailPage = pages[pages.length - 1];
      if (detailPage !== this.page) {
        this.page = detailPage;
        await this.page.waitForLoadState('networkidle');
      }

      await this.captureScreenshot('esta-06-detail-view');

      // Step 15: Generate PDF with content limited to first section
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

      // Step 16: Upload to Supabase
      const filename = `${jobData.credentials.applicationNumber || 'esta'}.pdf`;
      this.logger.log(`[ESTA] Uploading PDF: ${filename}`);

      const { url, signedUrl, path } = await uploadDocumentToSupabase(
        pdfBuffer,
        filename,
      );

      this.logger.log(`[ESTA] PDF uploaded successfully: ${path}`);

      // Step 17: Return success result
      return this.createSuccessResult(
        jobData,
        url,
        signedUrl,
        filename,
        pdfBuffer.length,
      );
    } catch (error) {
      this.logger.error(
        `[ESTA] Scrape failed for job ${jobData.jobId}:`,
        error,
      );
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
    } catch (error) {
      this.logger.warn(
        '[ESTA] Unable to perform pre-submit humanisation gesture:',
        (error as Error).message,
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
      `[ESTA] reCAPTCHA detected (enterprise=${recaptchaInfo.isEnterprise}, action=${recaptchaInfo.action ?? 'n/a'}) - requesting solver token`,
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
      });

      await this.injectRecaptchaToken(token, recaptchaInfo);
      this.logger.log('[ESTA] reCAPTCHA token injected successfully');
      return true;
    } catch (error) {
      if (error instanceof ScraperError) {
        throw error;
      }

      this.logger.error(
        '[ESTA] Unexpected failure while solving reCAPTCHA',
        error,
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
          dataS: null as string | null,
          clientKey: null as string | null,
        };

        const widget = document.querySelector(
          '[data-sitekey]',
        ) as HTMLElement | null;
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

        const iframe = document.querySelector(
          'iframe[src*="recaptcha"]',
        ) as HTMLIFrameElement | null;
        if (iframe) {
          try {
            const url = new URL(iframe.src);
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

        const enterpriseScript = Array.from(
          document.querySelectorAll('script[src*="recaptcha"]'),
        ).some((node) => node.getAttribute('src')?.includes('/enterprise'));
        if (enterpriseScript) {
          result.isEnterprise = true;
        }

        const grecaptchaCfg = (window as any).___grecaptcha_cfg;
        if (grecaptchaCfg?.clients) {
          const entries = Object.entries(grecaptchaCfg.clients) as Array<
            [string, any]
          >;

          for (const [key, client] of entries) {
            if (!result.clientKey) {
              result.clientKey = key;
            }

            const candidateSiteKey =
              client?.sitekey ||
              client?.S ||
              client?.H?.sitekey ||
              client?.R?.sitekey ||
              client?.config?.sitekey;
            if (!result.siteKey && typeof candidateSiteKey === 'string') {
              result.siteKey = candidateSiteKey;
            }

            const nestedSources = [
              client,
              client?.client,
              client?.data,
              client?.R,
              client?.H,
              client?.aa,
              client?.widget?.data,
            ];

            nestedSources.forEach((source: any) => {
              if (!source || typeof source !== 'object') {
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

              if (source.params && typeof source.params === 'object') {
                if (
                  !result.action &&
                  typeof source.params.action === 'string'
                ) {
                  result.action = source.params.action;
                }
                if (!result.dataS && typeof source.params.s === 'string') {
                  result.dataS = source.params.s;
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
          dataS: result.dataS,
          clientKey: result.clientKey,
        };
      });
    } catch (error) {
      console.warn('Failed to inspect reCAPTCHA configuration', error);
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
        ({ response, clientKey, isEnterprise }) => {
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
            let hidden = form.querySelector(
              'textarea[name="g-recaptcha-response"]',
            ) as HTMLTextAreaElement | null;
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

          const traverseCallbacks = (node: any) => {
            if (!node || typeof node !== 'object') {
              return;
            }
            if (typeof node.callback === 'function') {
              try {
                node.callback(response);
              } catch (error) {
                console.debug('reCAPTCHA callback invocation failed', error);
              }
            }
            Object.values(node).forEach((value: any) => {
              if (value && typeof value === 'object') {
                traverseCallbacks(value);
              }
            });
          };

          const cfg = (window as any).___grecaptcha_cfg;
          if (cfg?.clients) {
            const keys = clientKey ? [clientKey] : Object.keys(cfg.clients);
            keys.forEach((key) => traverseCallbacks(cfg.clients[key]));
          }

          const patchApi = (api: any) => {
            if (!api || typeof api !== 'object') {
              return;
            }
            if (typeof api.getResponse === 'function') {
              api.getResponse = () => response;
            }
            if (typeof api.execute === 'function') {
              api.execute = () => Promise.resolve(response);
            }
          };

          const grecaptchaGlobal = (window as any).grecaptcha;
          patchApi(grecaptchaGlobal);
          if (isEnterprise && grecaptchaGlobal?.enterprise) {
            patchApi(grecaptchaGlobal.enterprise);
          }

          window.dispatchEvent(new Event('recaptcha-token-injected'));
        },
        {
          response: token,
          clientKey: info.clientKey,
          isEnterprise: info.isEnterprise,
        },
      );
    } catch (error) {
      this.logger.error('[ESTA] Failed to inject reCAPTCHA token', error);
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
    } catch (error) {
      this.logger.warn(
        '[ESTA] Failed to close mobile app popup (may not exist):',
        error.message,
      );
      // Non-critical, continue execution
    }
  }

  /**
   * Handle security notification popup (appears on first navigation)
   */
  private async handleSecurityNotification(): Promise<void> {
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
    } catch (error) {
      this.logger.warn(
        '[ESTA] Failed to handle security notification (may not exist):',
        error.message,
      );
      // Non-critical, continue execution
    }
  }

  /**
   * Fill in the Individual Status Lookup form
   */
  private async fillLookupForm(
    credentials: ScraperJobData['credentials'],
  ): Promise<void> {
    this.logger.log('[ESTA] Filling lookup form...');

    // Parse date of birth (expecting ISO format: YYYY-MM-DD or Date object)
    const dob = new Date(credentials.dateOfBirth);
    const dobDay = dob.getUTCDate().toString(); // Use UTC to avoid timezone issues
    const dobMonth = dob.toLocaleString('en-US', {
      month: 'long',
      timeZone: 'UTC',
    }); // e.g., "January"
    const dobYear = dob.getUTCFullYear().toString();

    this.logger.log(`[ESTA] DOB parsed: ${dobDay} ${dobMonth} ${dobYear}`);

    // Fill Passport Number (find by label)
    this.logger.log('[ESTA] Filling passport number...');
    const passportInput = this.page.getByLabel(/Passport Number/i);
    await passportInput.fill(credentials.passportNumber);

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
    const applicationInput = this.page.getByLabel(/Application Number/i);
    await applicationInput.fill(credentials.applicationNumber);

    this.logger.log('[ESTA] Form filled successfully');
    await this.captureScreenshot('esta-04-form-filled');
  }
}
