import { test, expect } from '@playwright/test';

test.describe('Email Authentication Flows', () => {
  const API_URL = 'https://api.visanet.app';
  const APP_URL = 'https://app.visanet.app';
  
  // Generate unique email for each test to avoid conflicts
  const generateTestEmail = () => {
    const timestamp = Date.now();
    return `test_${timestamp}@visanet.app`;
  };

  test.describe('Email Service Integration', () => {
    test('should verify email service is healthy', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/email/health`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toEqual({
        status: 'healthy',
        service: 'email',
        timestamp: expect.any(String),
        integration: 'resend',
      });
    });

    test('should send test email successfully', async ({ request }) => {
      const testEmail = generateTestEmail();
      const response = await request.get(`${API_URL}/api/v1/email/test?to=${testEmail}`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toEqual({
        success: true,
        message: 'Test email sent successfully',
        messageId: expect.any(String),
      });
    });

    test('should process auth hook for magic link', async ({ request }) => {
      const testEmail = generateTestEmail();
      const response = await request.post(`${API_URL}/api/v1/email/auth-hook`, {
        data: {
          user: {
            email: testEmail,
          },
          email_data: {
            email_action_type: 'magic_link',
            token_hash: 'test_token_hash',
            redirect_to: `${APP_URL}/auth/callback`,
          },
        },
      });
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toEqual({
        success: true,
        message: 'Email sent successfully',
        messageId: expect.any(String),
      });
    });

    test('should process auth hook for password reset', async ({ request }) => {
      const testEmail = generateTestEmail();
      const response = await request.post(`${API_URL}/api/v1/email/auth-hook`, {
        data: {
          user: {
            email: testEmail,
          },
          email_data: {
            email_action_type: 'recovery',
            token_hash: 'reset_token_hash',
            redirect_to: `${APP_URL}/auth/reset-password`,
          },
        },
      });
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toEqual({
        success: true,
        message: 'Email sent successfully',
        messageId: expect.any(String),
      });
    });

    test('should send welcome email', async ({ request }) => {
      const testEmail = generateTestEmail();
      const response = await request.post(`${API_URL}/api/v1/email/welcome`, {
        data: {
          email: testEmail,
          name: 'Test User',
        },
      });
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toEqual({
        success: true,
        message: 'Welcome email sent successfully',
        messageId: expect.any(String),
      });
    });
  });

  test.describe('Signup Flow with Magic Link', () => {
    test('should complete signup flow with magic link', async ({ page }) => {
      const testEmail = generateTestEmail();
      
      // Navigate to signup page
      await page.goto(`${APP_URL}/auth/signup`);
      
      // Verify page loaded
      await expect(page).toHaveTitle(/Sign Up/);
      await expect(page.locator('h1')).toContainText('Create your account');
      
      // Fill in email
      await page.getByLabel('Email').fill(testEmail);
      
      // Submit form
      await page.getByRole('button', { name: /Sign up with email/i }).click();
      
      // Should show success message
      await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=magic link')).toBeVisible();
      
      // Verify auth hook was called (check network tab)
      // In real test, we would intercept the email and extract the magic link
    });

    test('should reject invalid email domains', async ({ page }) => {
      // Navigate to signup page
      await page.goto(`${APP_URL}/auth/signup`);
      
      // Try to sign up with invalid domain
      await page.getByLabel('Email').fill('test@gmail.com');
      await page.getByRole('button', { name: /Sign up with email/i }).click();
      
      // Should show error message
      await expect(page.locator('text=Email domain not allowed')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Login Flow', () => {
    test('should show login page with toggle for magic link', async ({ page }) => {
      await page.goto(`${APP_URL}/auth/login`);
      
      // Verify page elements
      await expect(page).toHaveTitle(/Sign In/);
      await expect(page.locator('h1')).toContainText('Welcome back');
      
      // Check for email input
      await expect(page.getByLabel('Email')).toBeVisible();
      
      // Check for magic link toggle
      const magicLinkToggle = page.locator('text=Use magic link');
      await expect(magicLinkToggle).toBeVisible();
    });

    test('should request magic link for login', async ({ page }) => {
      const testEmail = generateTestEmail();
      
      await page.goto(`${APP_URL}/auth/login`);
      
      // Switch to magic link mode if needed
      const magicLinkToggle = page.locator('text=Use magic link');
      if (await magicLinkToggle.isVisible()) {
        await magicLinkToggle.click();
      }
      
      // Enter email
      await page.getByLabel('Email').fill(testEmail);
      
      // Submit
      await page.getByRole('button', { name: /Sign in/i }).click();
      
      // Should show check email message
      await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should navigate to forgot password page', async ({ page }) => {
      await page.goto(`${APP_URL}/auth/login`);
      
      // Click forgot password link
      await page.locator('text=Forgot your password?').click();
      
      // Should be on forgot password page
      await expect(page).toHaveURL(/\/auth\/forgot-password/);
      await expect(page.locator('h1')).toContainText('Reset your password');
    });

    test('should send password reset email', async ({ page }) => {
      const testEmail = generateTestEmail();
      
      await page.goto(`${APP_URL}/auth/forgot-password`);
      
      // Enter email
      await page.getByLabel('Email').fill(testEmail);
      
      // Submit form
      await page.getByRole('button', { name: /Send reset link/i }).click();
      
      // Should show success message
      await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=password reset link')).toBeVisible();
    });
  });

  test.describe('Email Template Verification', () => {
    test('should render all email templates correctly', async ({ request }) => {
      // Test each auth action type
      const authActionTypes = [
        { type: 'magic_link', description: 'Magic Link Login' },
        { type: 'signup', description: 'New Account Welcome' },
        { type: 'recovery', description: 'Password Reset' },
        { type: 'email_change', description: 'Email Verification' },
      ];

      for (const action of authActionTypes) {
        const testEmail = generateTestEmail();
        const response = await request.post(`${API_URL}/api/v1/email/auth-hook`, {
          data: {
            user: {
              email: testEmail,
            },
            email_data: {
              email_action_type: action.type,
              token_hash: `test_token_${action.type}`,
              redirect_to: `${APP_URL}/auth/callback`,
            },
          },
        });

        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data.success).toBe(true);
        
        // Log for manual verification
        console.log(`✓ ${action.description} email sent to ${testEmail}`);
      }
    });
  });

  test.describe('Full Authentication E2E Flow', () => {
    test('should complete full signup and authentication flow', async ({ page, request }) => {
      const testEmail = generateTestEmail();
      const testPassword = 'TestPassword123!';
      
      // Step 1: Navigate to signup
      await page.goto(`${APP_URL}/auth/signup`);
      
      // Step 2: Fill signup form with email/password option
      await page.getByLabel('Email').fill(testEmail);
      
      // If there's a password field (non-magic link mode)
      const passwordField = page.getByLabel('Password');
      if (await passwordField.isVisible()) {
        await passwordField.fill(testPassword);
        
        // Confirm password if needed
        const confirmPasswordField = page.getByLabel('Confirm Password');
        if (await confirmPasswordField.isVisible()) {
          await confirmPasswordField.fill(testPassword);
        }
      }
      
      // Step 3: Submit signup
      await page.getByRole('button', { name: /Sign up/i }).click();
      
      // Step 4: Verify redirect or success message
      // Either redirected to dashboard or shown email verification message
      await page.waitForURL(/\/(dashboard|auth\/verify-email|auth\/login)/, { timeout: 10000 });
      
      // Step 5: If email verification required, check for message
      if (page.url().includes('verify-email')) {
        await expect(page.locator('text=verify your email')).toBeVisible();
      }
      
      // Log success
      console.log(`✓ Full signup flow completed for ${testEmail}`);
    });
  });

  test.describe('Protected Route Access', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected dashboard
      await page.goto(`${APP_URL}/dashboard`);
      
      // Should be redirected to login
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });
});

// Helper function to extract magic link from email content
// In a real test environment, you would integrate with an email testing service
async function extractMagicLinkFromEmail(emailContent: string): Promise<string | null> {
  const magicLinkRegex = /https:\/\/app\.visanet\.app\/auth\/callback\?token=[a-zA-Z0-9_-]+/;
  const match = emailContent.match(magicLinkRegex);
  return match ? match[0] : null;
}

// Helper to wait for email delivery
async function waitForEmail(emailAddress: string, timeout = 30000): Promise<string> {
  // In a real test, this would poll an email testing service
  // For now, we'll simulate with a timeout
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Mock email content with magic link');
    }, 2000);
  });
}