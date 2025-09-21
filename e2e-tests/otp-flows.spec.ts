import { test, expect } from '@playwright/test';
import { 
  testEmailValidation,
  testRateLimit,
  testMobileResponsive,
  testAccessibility,
  invalidEmails
} from './test-utils';

test.describe('OTP Authentication Flows', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions before each test
    await page.context().clearCookies();
    await page.context().clearPermissions();
    
    // Mock network requests to prevent actual emails being sent
    await page.route('/email-otp/send-verification-otp', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
    
    await page.route('/sign-in/email-otp', async route => {
      const request = route.request();
      const body = request.postDataJSON();
      
      // Simulate different OTP validation scenarios
      if (body.otp === '123456') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else if (body.otp === '999999') {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Too many OTP attempts' })
        });
      } else if (body.otp === '000000') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'OTP expired' })
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid OTP' })
        });
      }
    });
  });

  test.describe('OTP Request Flow', () => {
    test('should show generic success message regardless of email existence', async ({ page }) => {
      await page.goto('/connexion');
      
      // Switch to OTP tab
      await page.click('[data-tab="otp"]');
      
      // Test with non-existent email
      await page.fill('input[type="email"]', 'nonexistent@example.com');
      await page.click('button[type="submit"]');
      
      // Should always show generic success message
      await expect(page.locator('#otp-success')).toBeVisible();
      await expect(page.locator('#otp-success')).toContainText('Code de vérification envoyé par email');
      
      // Verify form switches to OTP verification
      await expect(page.locator('#otp-verify-form')).toBeVisible();
      await expect(page.locator('#otp-request-form')).toBeHidden();
    });

    test('should show same message for existing email', async ({ page }) => {
      await page.goto('/connexion');
      
      // Switch to OTP tab
      await page.click('[data-tab="otp"]');
      
      // Test with potentially existing email
      await page.fill('input[type="email"]', 'user@example.com');
      await page.click('button[type="submit"]');
      
      // Should show the same generic message
      await expect(page.locator('#otp-success')).toBeVisible();
      await expect(page.locator('#otp-success')).toContainText('Code de vérification envoyé par email');
      
      // Verify form switches to OTP verification
      await expect(page.locator('#otp-verify-form')).toBeVisible();
    });

    test('should validate email format before sending OTP', async ({ page }) => {
      await page.goto('/connexion');
      await page.click('[data-tab="otp"]');
      
      for (const invalidEmail of invalidEmails) {
        await page.fill('input[type="email"]', invalidEmail);
        await page.click('button[type="submit"]');
        
        // Should not proceed with invalid email
        const hasValidationError = await page.locator('input[type="email"]:invalid').count() > 0;
        if (!hasValidationError) {
          // If browser validation doesn't catch it, our JS should
          await expect(page.locator('#otp-error')).toBeVisible();
        }
        
        // Clear field for next test
        await page.fill('input[type="email"]', '');
      }
    });

    test('should show loading state during OTP request', async ({ page }) => {
      await page.goto('/connexion');
      await page.click('[data-tab="otp"]');
      
      await page.fill('input[type="email"]', 'test@example.com');
      
      // Click submit and immediately check loading state
      const submitPromise = page.click('button[type="submit"]');
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      await expect(page.locator('button[type="submit"]')).toContainText('Envoi du code');
      
      await submitPromise;
    });
  });

  test.describe('OTP Verification Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to OTP verification state
      await page.goto('/connexion');
      await page.click('[data-tab="otp"]');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button[type="submit"]');
      await expect(page.locator('#otp-verify-form')).toBeVisible();
    });

    test('should successfully verify valid OTP', async ({ page }) => {
      await page.fill('#otp-code', '123456');
      
      // Mock successful redirect
      await page.route('/', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<html><body>Dashboard</body></html>'
        });
      });
      
      await page.click('#otp-verify-form button[type="submit"]');
      
      // Should redirect to home page
      await expect(page).toHaveURL('/');
    });

    test('should show error for invalid OTP', async ({ page }) => {
      await page.fill('#otp-code', '111111');
      await page.click('#otp-verify-form button[type="submit"]');
      
      await expect(page.locator('#otp-verify-error')).toBeVisible();
      await expect(page.locator('#otp-verify-error')).toContainText('Code invalide ou expiré');
    });

    test('should show error for expired OTP', async ({ page }) => {
      await page.fill('#otp-code', '000000');
      await page.click('#otp-verify-form button[type="submit"]');
      
      await expect(page.locator('#otp-verify-error')).toBeVisible();
      await expect(page.locator('#otp-verify-error')).toContainText('Code invalide ou expiré');
    });

    test('should show rate limit error for too many attempts', async ({ page }) => {
      await page.fill('#otp-code', '999999');
      await page.click('#otp-verify-form button[type="submit"]');
      
      await expect(page.locator('#otp-verify-error')).toBeVisible();
      await expect(page.locator('#otp-verify-error')).toContainText('Code invalide ou expiré');
    });

    test('should validate OTP format', async ({ page }) => {
      const invalidOTPs = ['12345', '1234567', 'abcdef', '12345a', '', '12 34 56'];
      
      for (const invalidOTP of invalidOTPs) {
        await page.fill('#otp-code', invalidOTP);
        
        const input = page.locator('#otp-code');
        const isValid = await input.evaluate((el: HTMLInputElement) => el.checkValidity());
        
        if (invalidOTP === '') {
          // Empty should trigger required validation
          expect(isValid).toBe(false);
        } else if (invalidOTP.length !== 6 || !/^\d+$/.test(invalidOTP)) {
          // Should be invalid if not 6 digits
          expect(isValid).toBe(false);
        }
      }
    });

    test('should allow going back to email entry', async ({ page }) => {
      await page.click('#back-to-email');
      
      await expect(page.locator('#otp-request-form')).toBeVisible();
      await expect(page.locator('#otp-verify-form')).toBeHidden();
      
      // Error messages should be cleared
      await expect(page.locator('#otp-error')).toBeHidden();
      await expect(page.locator('#otp-verify-error')).toBeHidden();
    });

    test('should show loading state during OTP verification', async ({ page }) => {
      await page.fill('#otp-code', '123456');
      
      const submitPromise = page.click('#otp-verify-form button[type="submit"]');
      await expect(page.locator('#otp-verify-form button[type="submit"]')).toBeDisabled();
      await expect(page.locator('#otp-verify-form button[type="submit"]')).toContainText('Vérification');
      
      await submitPromise;
    });
  });

  test.describe('Security & UI Consistency', () => {
    test('should not leak email existence information', async ({ page }) => {
      await page.goto('/connexion');
      await page.click('[data-tab="otp"]');
      
      // Test multiple different email addresses
      const testEmails = [
        'definitely-exists@example.com',
        'definitely-does-not-exist@example.com',
        'admin@example.com',
        'nonexistent@fake-domain.com'
      ];
      
      for (const email of testEmails) {
        // Go back to initial state
        if (await page.locator('#back-to-email').isVisible()) {
          await page.click('#back-to-email');
        }
        
        await page.fill('input[type="email"]', email);
        await page.click('button[type="submit"]');
        
        // All should show the same generic message
        await expect(page.locator('#otp-success')).toBeVisible();
        await expect(page.locator('#otp-success')).toContainText('Code de vérification envoyé par email');
        
        // All should proceed to verification form
        await expect(page.locator('#otp-verify-form')).toBeVisible();
      }
    });

    test('should be mobile responsive', async ({ page }) => {
      await testMobileResponsive(page, '/connexion');
      
      // Test OTP-specific responsive behavior
      await page.click('[data-tab="otp"]');
      
      // Check if forms are still usable on mobile
      await expect(page.locator('#otp-request-form')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should be accessible', async ({ page }) => {
      await testAccessibility(page, '/connexion');
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('/email-otp/send-verification-otp', async route => {
        await route.abort('failed');
      });
      
      await page.goto('/connexion');
      await page.click('[data-tab="otp"]');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button[type="submit"]');
      
      // Should still show generic success (security requirement)
      await expect(page.locator('#otp-success')).toBeVisible();
      await expect(page.locator('#otp-success')).toContainText('Code de vérification envoyé par email');
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle rate limiting on OTP requests', async ({ page }) => {
      await testRateLimit(page, 3);
    });

    test('should handle rate limiting on OTP verification', async ({ page }) => {
      await page.goto('/connexion');
      await page.click('[data-tab="otp"]');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button[type="submit"]');
      await expect(page.locator('#otp-verify-form')).toBeVisible();
      
      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await page.fill('#otp-code', `11111${i}`);
        await page.click('#otp-verify-form button[type="submit"]');
        await expect(page.locator('#otp-verify-error')).toBeVisible();
      }
      
      // After rate limiting kicks in
      await page.fill('#otp-code', '999999');
      await page.click('#otp-verify-form button[type="submit"]');
      await expect(page.locator('#otp-verify-error')).toContainText('Code invalide ou expiré');
    });
  });
});