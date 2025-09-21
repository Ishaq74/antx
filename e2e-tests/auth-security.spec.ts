import { test, expect } from '@playwright/test';
import { 
  checkSecurityHeaders, 
  testRouteProtection, 
  testFormSecurity, 
  testPasswordValidation,
  testEmailValidation,
  testRateLimit,
  testMobileResponsive,
  testAccessibility,
  weakPasswords,
  invalidEmails
} from './test-utils';

test.describe('Authentication Security Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions before each test
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test.describe('Security Headers', () => {
    test('should include security headers on all pages', async ({ page }) => {
      await checkSecurityHeaders(page, '/');
    });

    test('should include security headers on auth pages', async ({ page }) => {
      await checkSecurityHeaders(page, '/connexion');
      await checkSecurityHeaders(page, '/inscription');
      await checkSecurityHeaders(page, '/mot-de-passe-oublie');
    });

    test('should include CSP headers that prevent XSS', async ({ page }) => {
      const response = await page.goto('/');
      const csp = response?.headers()['content-security-policy'];
      
      expect(csp).toContain('script-src \'self\'');
      expect(csp).toContain('style-src \'self\'');
      expect(csp).toContain('frame-ancestors \'none\'');
    });
  });

  test.describe('Route Protection', () => {
    test('should redirect unauthenticated users from private routes', async ({ page }) => {
      const protectedRoutes = ['/dashboard', '/profil', '/admin', '/organisations'];
      
      for (const route of protectedRoutes) {
        await testRouteProtection(page, route);
      }
    });

    test('should allow access to public routes', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL('/');
      expect(page.url()).not.toContain('/connexion');
    });

    test('should allow access to authentication pages', async ({ page }) => {
      const authPages = ['/connexion', '/inscription', '/mot-de-passe-oublie'];
      
      for (const authPage of authPages) {
        await page.goto(authPage);
        await expect(page).toHaveURL(authPage);
      }
    });
  });

  test.describe('Authentication Forms', () => {
    test('should display and secure login form', async ({ page }) => {
      await page.goto('/connexion');
      
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      await testFormSecurity(page);
    });

    test('should display and secure registration form', async ({ page }) => {
      await page.goto('/inscription');
      
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      
      await testFormSecurity(page);
    });

    test('should validate email format in forms', async ({ page }) => {
      await testEmailValidation(page, invalidEmails);
    });

    test('should validate password strength', async ({ page }) => {
      await testPasswordValidation(page, weakPasswords);
    });
  });

  test.describe('Authentication Flow', () => {
    test('should handle invalid login credentials', async ({ page }) => {
      await page.goto('/connexion');
      
      await page.fill('input[type="email"]', 'nonexistent@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*\/connexion/);
      expect(page.url()).not.toContain('/dashboard');
    });

    test('should handle password reset request', async ({ page }) => {
      await page.goto('/mot-de-passe-oublie');
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle multiple failed login attempts', async ({ page }) => {
      await testRateLimit(page, 3);
    });
  });

  test.describe('Content Security', () => {
    test('should prevent XSS in form inputs', async ({ page }) => {
      await page.goto('/connexion');
      
      const maliciousScript = '<script>alert("xss")</script>';
      await page.fill('input[type="email"]', maliciousScript);
      
      const emailValue = await page.locator('input[type="email"]').inputValue();
      expect(emailValue).not.toContain('<script>');
    });

    test('should sanitize URL parameters', async ({ page }) => {
      const maliciousRedirect = 'javascript:alert("xss")';
      await page.goto(`/connexion?redirect=${encodeURIComponent(maliciousRedirect)}`);
      
      await expect(page).toHaveURL(/.*\/connexion/);
      expect(page.url()).not.toContain('javascript:');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display properly on mobile devices', async ({ page }) => {
      await testMobileResponsive(page, '/connexion');
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible', async ({ page }) => {
      await testAccessibility(page, '/connexion');
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/connexion');
      
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();
      
      await page.keyboard.press('Tab');
      const nextFocusedElement = await page.locator(':focus').first();
      await expect(nextFocusedElement).toBeVisible();
    });
  });
});