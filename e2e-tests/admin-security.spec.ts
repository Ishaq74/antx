import { test, expect } from '@playwright/test';
import { 
  checkSecurityHeaders, 
  testAdminAccess, 
  testRouteProtection,
  testMobileResponsive,
  testLogout
} from './test-utils';

test.describe('Admin Access Control Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions before each test
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test.describe('Admin Route Protection', () => {
    test('should block non-authenticated users from admin pages', async ({ page }) => {
      await testAdminAccess(page, '/admin');
    });

    test('should block access to admin API endpoints', async ({ page }) => {
      const adminApiRoutes = [
        '/api/admin/users',
        '/api/admin/settings', 
        '/api/admin/logs'
      ];

      for (const route of adminApiRoutes) {
        const response = await page.goto(route);
        
        if (response) {
          const status = response.status();
          expect([302, 401, 403]).toContain(status);
          
          if (status === 302) {
            await expect(page).toHaveURL(/.*\/connexion/);
          }
        }
      }
    });

    test('should protect various admin routes', async ({ page }) => {
      const adminRoutes = [
        '/admin/dashboard',
        '/admin/users', 
        '/admin/settings',
        '/admin/reports'
      ];

      for (const route of adminRoutes) {
        await testRouteProtection(page, route);
      }
    });
  });

  test.describe('Admin Interface Security', () => {
    test('should include security headers on admin pages', async ({ page }) => {
      const response = await page.goto('/admin');
      
      // Should still get security headers even if redirected
      const headers = response?.headers();
      if (headers) {
        expect(headers['x-frame-options']).toBe('DENY');
        expect(headers['x-content-type-options']).toBe('nosniff');
      }
    });

    test('should prevent clickjacking on admin pages', async ({ page }) => {
      const response = await page.goto('/admin');
      
      const headers = response?.headers();
      if (headers) {
        expect(headers['x-frame-options']).toBe('DENY');
        expect(headers['content-security-policy']).toContain('frame-ancestors \'none\'');
      }
    });
  });

  test.describe('Admin Data Access Control', () => {
    test('should protect sensitive admin API data', async ({ page }) => {
      const sensitiveEndpoints = [
        '/api/admin/users/list',
        '/api/admin/audit-logs',
        '/api/admin/system-info',
        '/api/admin/security-settings'
      ];

      for (const endpoint of sensitiveEndpoints) {
        const response = await page.goto(endpoint);
        
        if (response) {
          const status = response.status();
          expect([302, 401, 403]).toContain(status);
          
          // Should not leak sensitive data in error responses
          const text = await response.text();
          expect(text).not.toContain('password');
          expect(text).not.toContain('secret');
          expect(text).not.toContain('token');
        }
      }
    });

    test('should not expose admin endpoints in robots.txt', async ({ page }) => {
      const response = await page.goto('/robots.txt');
      
      if (response && response.status() === 200) {
        const content = await response.text();
        
        // Admin paths should be disallowed in robots.txt
        expect(content).toContain('Disallow: /admin');
        expect(content).toContain('Disallow: /api/admin');
      }
    });
  });

  test.describe('Admin Session Security', () => {
    test('should enforce secure session handling for admin', async ({ page }) => {
      await page.goto('/admin');
      
      const cookies = await page.context().cookies();
      
      // Look for session-related cookies and verify their security
      const sessionCookies = cookies.filter(cookie => 
        cookie.name.toLowerCase().includes('session') ||
        cookie.name.toLowerCase().includes('auth') ||
        cookie.name.toLowerCase().includes('token')
      );

      for (const cookie of sessionCookies) {
        expect(cookie.httpOnly).toBe(true);
        if (page.url().startsWith('https://')) {
          expect(cookie.secure).toBe(true);
        }
      }
    });

    test('should handle admin session timeout properly', async ({ page }) => {
      await testRouteProtection(page, '/admin/dashboard');
    });

    test('should clear admin session on logout', async ({ page }) => {
      await testLogout(page);
    });
  });

  test.describe('Admin Error Handling', () => {
    test('should handle admin route errors gracefully', async ({ page }) => {
      const response = await page.goto('/admin/nonexistent');
      
      if (response) {
        const status = response.status();
        expect([302, 403, 404]).toContain(status);
      }
    });

    test('should not expose sensitive error information', async ({ page }) => {
      const response = await page.goto('/api/admin/invalid-endpoint');
      
      if (response) {
        const text = await response.text();
        
        // Error responses should not expose sensitive information
        expect(text).not.toContain('database');
        expect(text).not.toContain('stack trace');
        expect(text).not.toContain('internal server error');
      }
    });
  });

  test.describe('Admin Content Security Policy', () => {
    test('should enforce strict CSP for admin pages', async ({ page }) => {
      const response = await page.goto('/admin');
      
      const headers = response?.headers();
      if (headers) {
        const csp = headers['content-security-policy'];
        
        if (csp) {
          expect(csp).toContain('default-src \'self\'');
          expect(csp).toContain('script-src \'self\'');
          expect(csp).toContain('frame-ancestors \'none\'');
        }
      }
    });

    test('should prevent admin page embedding', async ({ page }) => {
      const response = await page.goto('/admin');
      
      const headers = response?.headers();
      if (headers) {
        expect(headers['x-frame-options']).toBe('DENY');
        
        const csp = headers['content-security-policy'];
        if (csp) {
          expect(csp).toContain('frame-ancestors \'none\'');
        }
      }
    });
  });

  test.describe('Admin Mobile Security', () => {
    test('should maintain security on mobile admin interface', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const response = await page.goto('/admin');
      
      // Should still enforce security measures on mobile
      const headers = response?.headers();
      if (headers) {
        expect(headers['x-frame-options']).toBe('DENY');
        expect(headers['x-content-type-options']).toBe('nosniff');
      }
    });

    test('should handle mobile admin authentication properly', async ({ page }) => {
      await testMobileResponsive(page, '/admin');
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*\/connexion/);
    });
  });
});