import { Injectable } from '@nestjs/common';
import { BaseScraper } from '../base/base-scraper';
import { BrowserManagerService } from '../base/browser-manager.service';
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
@Injectable()
export class EstaScraper extends BaseScraper {
  constructor(browserManager: BrowserManagerService) {
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

      // Wait for reCAPTCHA to load and validate (invisible reCAPTCHA needs time)
      this.logger.log('[ESTA] Waiting for reCAPTCHA validation...');
      await this.page.waitForTimeout(3000);

      // Step 9: Submit the form and wait for navigation
      this.logger.log('[ESTA] Submitting form...');

      // Click submit button and wait for navigation to status page
      await Promise.all([
        this.page.waitForURL('**/estaStatus**', { timeout: 15000 }),
        this.clickElement('button:has-text("RETRIEVE APPLICATION")'),
      ]);

      this.logger.log('[ESTA] Successfully navigated to status page');
      await this.captureScreenshot('esta-05-status-page');

      // Step 10: Verify we're on the status page
      const statusPageUrl = this.page.url();
      if (!statusPageUrl.includes('estaStatus')) {
        this.logger.error('[ESTA] Form submission failed - not on status page');
        return this.createErrorResult(
          jobData,
          new Error('Form submission failed'),
          options,
        );
      }

      // Step 11: Check for authorization status
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

      // Step 12: Click View button to open detailed page
      await this.clickElement('text=View');
      await this.page.waitForTimeout(2000);

      // Step 13: Switch to the new tab/page
      const pages = this.context!.pages();
      const detailPage = pages[pages.length - 1];
      if (detailPage !== this.page) {
        this.page = detailPage;
        await this.page.waitForLoadState('networkidle');
      }

      await this.captureScreenshot('esta-06-detail-view');

      // Step 14: Generate PDF with content limited to first section
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

      // Step 15: Upload to Supabase
      const filename = `${jobData.credentials.applicationNumber || 'esta'}.pdf`;
      this.logger.log(`[ESTA] Uploading PDF: ${filename}`);

      const { url, signedUrl, path } = await uploadDocumentToSupabase(
        pdfBuffer,
        filename,
      );

      this.logger.log(`[ESTA] PDF uploaded successfully: ${path}`);

      // Step 16: Return success result
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
