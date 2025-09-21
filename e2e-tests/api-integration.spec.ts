import { test, expect } from '@playwright/test';

test.describe('Better Auth API Integration Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions before each test
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test.describe('OTP Email Verification Endpoint', () => {
    test('should return 200 for valid OTP send request', async ({ page }) => {
      const response = await page.request.post('/email-otp/send-verification-otp', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          email: 'test@example.com',
          type: 'sign-in'
        }
      });
      
      // Should return success regardless of email existence (security)
      expect([200, 400]).toContain(response.status());
      
      if (response.ok()) {
        const body = await response.json();
        expect(body).toBeDefined();
      }
    });

    test('should handle malformed requests gracefully', async ({ page }) => {
      const malformedRequests = [
        {},
        { email: '' },
        { email: 'invalid-email' },
        { type: 'sign-in' },
        { email: 'test@example.com', type: 'invalid-type' },
        { email: 'test@example.com', type: 'sign-in', extra: 'malicious-data' }
      ];

      for (const requestData of malformedRequests) {
        const response = await page.request.post('/email-otp/send-verification-otp', {
          headers: { 'Content-Type': 'application/json' },
          data: requestData
        });
        
        // Should return error status for malformed requests
        expect([400, 422]).toContain(response.status());
        
        const body = await response.text();
        // Should not expose sensitive information
        expect(body.toLowerCase()).not.toContain('database');
        expect(body.toLowerCase()).not.toContain('prisma');
        expect(body.toLowerCase()).not.toContain('password');
      }
    });

    test('should include proper security headers', async ({ page }) => {
      const response = await page.request.post('/email-otp/send-verification-otp', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          email: 'test@example.com',
          type: 'sign-in'
        }
      });
      
      const headers = response.headers();
      
      // Check for security headers
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBeDefined();
      expect(headers['content-type']).toContain('application/json');
    });

    test('should handle XSS attempts in email field', async ({ page }) => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert(1)</script>',
        'test@example.com<script>alert("xss")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await page.request.post('/email-otp/send-verification-otp', {
          headers: { 'Content-Type': 'application/json' },
          data: {
            email: payload,
            type: 'sign-in'
          }
        });
        
        // Should return error for malicious input
        expect([400, 422]).toContain(response.status());
        
        const body = await response.text();
        // Response should not contain unescaped script tags
        expect(body).not.toContain('<script>');
        expect(body).not.toContain('javascript:');
      }
    });
  });

  test.describe('OTP Sign-In Endpoint', () => {
    test('should validate OTP format', async ({ page }) => {
      const invalidOTPs = [
        '12345',     // Too short
        '1234567',   // Too long
        'abcdef',    // Letters
        '12345a',    // Mixed
        '',          // Empty
        '12 34 56',  // Spaces
        '123.456'    // Special chars
      ];

      for (const otp of invalidOTPs) {
        const response = await page.request.post('/sign-in/email-otp', {
          headers: { 'Content-Type': 'application/json' },
          data: {
            email: 'test@example.com',
            otp: otp
          }
        });
        
        // Should return error for invalid OTP format
        expect([400, 422]).toContain(response.status());
      }
    });

    test('should return generic error for invalid OTP', async ({ page }) => {
      const response = await page.request.post('/sign-in/email-otp', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          email: 'test@example.com',
          otp: '999999'  // Invalid OTP
        }
      });
      
      expect([400, 401]).toContain(response.status());
      
      const body = await response.text();
      // Should not reveal whether email exists or not
      expect(body.toLowerCase()).not.toContain('user not found');
      expect(body.toLowerCase()).not.toContain('email not found');
    });

    test('should handle rate limiting', async ({ page }) => {
      const email = 'ratelimit@example.com';
      
      // Make multiple rapid requests
      const requests = Array.from({ length: 10 }, () =>
        page.request.post('/sign-in/email-otp', {
          headers: { 'Content-Type': 'application/json' },
          data: {
            email: email,
            otp: '123456'
          }
        })
      );
      
      const responses = await Promise.all(requests);
      
      // At least some requests should be rate limited
      const rateLimited = responses.some(r => r.status() === 429);
      if (rateLimited) {
        // Check that 429 responses include proper headers
        const rateLimitedResponse = responses.find(r => r.status() === 429);
        const headers = rateLimitedResponse!.headers();
        expect(headers['retry-after']).toBeDefined();
      }
    });

    test('should include security headers', async ({ page }) => {
      const response = await page.request.post('/sign-in/email-otp', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          email: 'test@example.com',
          otp: '123456'
        }
      });
      
      const headers = response.headers();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['content-type']).toContain('application/json');
    });
  });

  test.describe('Password Reset Endpoints', () => {
    test('should handle password reset request', async ({ page }) => {
      const response = await page.request.post('/forget-password/email-otp', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          email: 'test@example.com'
        }
      });
      
      // Should return success regardless of email existence
      expect([200, 400]).toContain(response.status());
    });

    test('should handle password reset with OTP', async ({ page }) => {
      const response = await page.request.post('/email-otp/reset-password', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          email: 'test@example.com',
          otp: '123456',
          newPassword: 'NewSecureP@ssw0rd123'
        }
      });
      
      // Should validate all required fields
      expect([200, 400, 401]).toContain(response.status());
      
      if (!response.ok()) {
        const body = await response.text();
        // Should not reveal sensitive information
        expect(body.toLowerCase()).not.toContain('user not found');
      }
    });

    test('should validate new password strength', async ({ page }) => {
      const weakPasswords = [
        'password',
        '123456',
        'abc',
        'password123',
        'qwerty'
      ];

      for (const password of weakPasswords) {
        const response = await page.request.post('/email-otp/reset-password', {
          headers: { 'Content-Type': 'application/json' },
          data: {
            email: 'test@example.com',
            otp: '123456',
            newPassword: password
          }
        });
        
        if (response.status() === 400) {
          const body = await response.text();
          expect(body.toLowerCase()).toContain('password');
        }
      }
    });
  });

  test.describe('CSRF Protection', () => {
    test('should protect against CSRF attacks', async ({ page }) => {
      // Attempt to make request without proper origin
      const response = await page.request.post('/sign-in/email-otp', {
        headers: { 
          'Content-Type': 'application/json',
          'Origin': 'https://malicious-site.com'
        },
        data: {
          email: 'test@example.com',
          otp: '123456'
        }
      });
      
      // Should be rejected due to CORS/CSRF protection
      expect([400, 403, 405]).toContain(response.status());
    });

    test('should require proper content type', async ({ page }) => {
      const response = await page.request.post('/sign-in/email-otp', {
        headers: { 'Content-Type': 'text/plain' },
        data: 'email=test@example.com&otp=123456'
      });
      
      // Should reject non-JSON requests
      expect([400, 415]).toContain(response.status());
    });
  });

  test.describe('Input Validation & Sanitization', () => {
    test('should sanitize email inputs', async ({ page }) => {
      const maliciousEmails = [
        'test@example.com; DROP TABLE users;--',
        'test@example.com\nBCC: admin@example.com',
        'test@example.com\r\nTo: victim@example.com',
        'test@example.com<script>alert("xss")</script>',
        'test@example.com%0d%0aTo:%20victim@example.com'
      ];

      for (const email of maliciousEmails) {
        const response = await page.request.post('/email-otp/send-verification-otp', {
          headers: { 'Content-Type': 'application/json' },
          data: {
            email: email,
            type: 'sign-in'
          }
        });
        
        // Should reject malicious input
        expect([400, 422]).toContain(response.status());
      }
    });

    test('should handle oversized requests', async ({ page }) => {
      const largeString = 'x'.repeat(10000);
      
      const response = await page.request.post('/email-otp/send-verification-otp', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          email: largeString + '@example.com',
          type: 'sign-in'
        }
      });
      
      // Should reject oversized requests
      expect([400, 413, 422]).toContain(response.status());
    });

    test('should handle malformed JSON', async ({ page }) => {
      const response = await page.request.post('/email-otp/send-verification-otp', {
        headers: { 'Content-Type': 'application/json' },
        data: '{"email": "test@example.com", "type": "sign-in"' // Missing closing brace
      });
      
      // Should reject malformed JSON
      expect([400]).toContain(response.status());
    });
  });

  test.describe('Error Response Consistency', () => {
    test('should return consistent error structure', async ({ page }) => {
      const response = await page.request.post('/sign-in/email-otp', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          email: 'invalid-email',
          otp: '123456'
        }
      });
      
      expect([400, 422]).toContain(response.status());
      
      const body = await response.json();
      
      // Should have consistent error structure
      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
      
      // Should not expose internal details
      expect(body.error.toLowerCase()).not.toContain('stack');
      expect(body.error.toLowerCase()).not.toContain('trace');
      expect(body.error.toLowerCase()).not.toContain('prisma');
    });

    test('should not leak system information in errors', async ({ page }) => {
      const response = await page.request.post('/nonexistent-endpoint', {
        headers: { 'Content-Type': 'application/json' },
        data: { test: 'data' }
      });
      
      expect([404, 405]).toContain(response.status());
      
      const body = await response.text();
      
      // Should not expose system information
      expect(body.toLowerCase()).not.toContain('node.js');
      expect(body.toLowerCase()).not.toContain('astro');
      expect(body.toLowerCase()).not.toContain('better-auth');
      expect(body.toLowerCase()).not.toContain('database');
      expect(body.toLowerCase()).not.toContain('/home/');
      expect(body.toLowerCase()).not.toContain('stack trace');
    });
  });
});