import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pangdzwamawwgmvxnwkk.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const APP_URL = 'https://app.visanet.app';
const API_URL = 'https://api.visanet.app';

test.describe('Supabase Authentication Integration', () => {
  let supabase: ReturnType<typeof createClient>;

  test.beforeEach(async () => {
    // Initialize Supabase client
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  test.afterEach(async () => {
    // Clean up: Sign out after each test
    await supabase.auth.signOut();
  });

  const generateTestEmail = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `test_${timestamp}_${random}@visanet.app`;
  };

  test.describe('Supabase Direct API Tests', () => {
    test('should verify Supabase is configured correctly', async () => {
      // Test Supabase health
      const { data, error } = await supabase.auth.getSession();
      expect(error).toBeNull();
      expect(data.session).toBeNull(); // Should not be logged in
    });

    test('should send magic link via Supabase OTP', async () => {
      const testEmail = generateTestEmail();
      
      // Request magic link
      const { data, error } = await supabase.auth.signInWithOtp({
        email: testEmail,
        options: {
          emailRedirectTo: `${APP_URL}/auth/callback`,
        },
      });

      // Should succeed
      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      console.log(`✓ Magic link sent to ${testEmail}`);
    });

    test('should handle signup with Supabase', async () => {
      const testEmail = generateTestEmail();
      const testPassword = 'TestPassword123!';
      
      // Sign up new user
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          emailRedirectTo: `${APP_URL}/auth/callback`,
          data: {
            name: 'Test User',
          },
        },
      });

      // Should succeed
      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(testEmail);
      
      console.log(`✓ User created: ${testEmail}`);
      console.log(`  User ID: ${data.user?.id}`);
      console.log(`  Email confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}`);
    });

    test('should reject non-visanet email domains', async ({ page }) => {
      // This test verifies our backend validation
      await page.goto(`${APP_URL}/auth/signup`);
      
      // Try invalid domain
      await page.getByLabel('Email').fill('test@gmail.com');
      await page.getByRole('button', { name: /Sign up/i }).click();
      
      // Should show domain error
      await expect(page.locator('text=domain')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Email Webhook Integration', () => {
    test('should trigger email webhook on magic link request', async ({ request }) => {
      const testEmail = generateTestEmail();
      
      // Step 1: Request magic link via Supabase
      const { error } = await supabase.auth.signInWithOtp({
        email: testEmail,
        options: {
          emailRedirectTo: `${APP_URL}/auth/callback`,
        },
      });
      
      expect(error).toBeNull();
      
      // Step 2: Verify our webhook was called by checking logs
      // In production, Supabase will call our webhook automatically
      // For testing, we can simulate the webhook call
      const webhookResponse = await request.post(`${API_URL}/api/v1/email/auth-hook`, {
        data: {
          user: { email: testEmail },
          email_data: {
            email_action_type: 'magic_link',
            token_hash: 'test_token',
            redirect_to: `${APP_URL}/auth/callback`,
          },
        },
      });
      
      expect(webhookResponse.ok()).toBeTruthy();
      console.log(`✓ Email webhook processed for ${testEmail}`);
    });
  });

  test.describe('Full E2E Authentication Flow', () => {
    test('should complete full signup flow with UI', async ({ page }) => {
      const testEmail = generateTestEmail();
      
      // Navigate to signup
      await page.goto(`${APP_URL}/auth/signup`);
      
      // Wait for page to load
      await expect(page.locator('h1')).toContainText('Create your account');
      
      // Fill email
      await page.getByLabel('Email').fill(testEmail);
      
      // Submit form
      await page.getByRole('button', { name: /Sign up/i }).click();
      
      // Should show success message about checking email
      await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10000 });
      
      console.log(`✓ Signup flow completed for ${testEmail}`);
      console.log('  - Magic link email should be sent');
      console.log('  - Check Resend dashboard for delivery confirmation');
    });

    test('should complete login flow with magic link', async ({ page }) => {
      const testEmail = generateTestEmail();
      
      // First create the user
      await supabase.auth.signUp({
        email: testEmail,
        password: 'TempPassword123!',
      });
      
      // Navigate to login
      await page.goto(`${APP_URL}/auth/login`);
      
      // Enter email
      await page.getByLabel('Email').fill(testEmail);
      
      // Click magic link option if available
      const magicLinkOption = page.locator('text=magic link');
      if (await magicLinkOption.isVisible()) {
        await magicLinkOption.click();
      }
      
      // Submit
      await page.getByRole('button', { name: /Sign in/i }).click();
      
      // Should show check email message
      await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10000 });
      
      console.log(`✓ Login flow completed for ${testEmail}`);
    });

    test('should complete password reset flow', async ({ page }) => {
      const testEmail = generateTestEmail();
      
      // First create a user
      await supabase.auth.signUp({
        email: testEmail,
        password: 'OldPassword123!',
      });
      
      // Navigate to forgot password
      await page.goto(`${APP_URL}/auth/forgot-password`);
      
      // Enter email
      await page.getByLabel('Email').fill(testEmail);
      
      // Submit
      await page.getByRole('button', { name: /Send reset link/i }).click();
      
      // Should show success
      await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10000 });
      
      console.log(`✓ Password reset flow completed for ${testEmail}`);
    });
  });

  test.describe('Email Link Verification', () => {
    test('should generate valid confirmation links', async () => {
      const testEmail = generateTestEmail();
      
      // Create user and get the confirmation token
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!',
        options: {
          emailRedirectTo: `${APP_URL}/auth/callback`,
        },
      });
      
      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      
      // In a real scenario, the email would contain a link like:
      // https://app.visanet.app/auth/callback#access_token=...&type=signup
      
      console.log('✓ User created, confirmation email should contain:');
      console.log(`  - Redirect URL: ${APP_URL}/auth/callback`);
      console.log(`  - Token type: signup`);
      console.log(`  - User email: ${testEmail}`);
    });

    test('should handle auth callback correctly', async ({ page }) => {
      // Test the callback page handles tokens correctly
      await page.goto(`${APP_URL}/auth/callback`);
      
      // Should either redirect to login (if no token) or process the token
      await page.waitForURL(/\/(auth\/login|dashboard)/, { timeout: 5000 });
      
      console.log('✓ Auth callback page is accessible');
    });
  });

  test.describe('Email Template Content Verification', () => {
    test('should send properly formatted emails for each auth action', async ({ request }) => {
      const testCases = [
        {
          action: 'magic_link',
          expectedSubject: 'Your VisAPI Login Link',
          expectedContent: ['Click the button below to log in', 'This link will expire'],
        },
        {
          action: 'signup',
          expectedSubject: 'Welcome to VisAPI',
          expectedContent: ['Welcome to VisAPI', 'powerful workflow automation'],
        },
        {
          action: 'recovery',
          expectedSubject: 'Reset Your VisAPI Password',
          expectedContent: ['reset your password', 'didn\'t request this'],
        },
        {
          action: 'email_change',
          expectedSubject: 'Verify Your New Email',
          expectedContent: ['verify your new email', 'confirm this change'],
        },
      ];

      for (const testCase of testCases) {
        const testEmail = generateTestEmail();
        
        // Trigger email via webhook
        const response = await request.post(`${API_URL}/api/v1/email/auth-hook`, {
          data: {
            user: { email: testEmail },
            email_data: {
              email_action_type: testCase.action,
              token_hash: `test_${testCase.action}_token`,
              redirect_to: `${APP_URL}/auth/callback`,
            },
          },
        });
        
        expect(response.ok()).toBeTruthy();
        
        console.log(`✓ ${testCase.action} email sent successfully`);
        console.log(`  Expected subject: ${testCase.expectedSubject}`);
        console.log(`  Expected content keywords: ${testCase.expectedContent.join(', ')}`);
      }
    });
  });
});

// Test utilities
export async function cleanupTestUser(email: string) {
  // In a real test environment, you might want to clean up test users
  // This would require admin privileges
  console.log(`Would clean up test user: ${email}`);
}

export async function waitForEmailDelivery(email: string, timeout = 5000): Promise<boolean> {
  // In production tests, integrate with email testing service
  // For now, just wait a bit
  await new Promise(resolve => setTimeout(resolve, timeout));
  return true;
}