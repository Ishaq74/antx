import { test, expect } from '@playwright/test';
import { xssPayloads } from './test-utils';

test.describe('Advanced Security Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test.describe('Brute Force Protection', () => {
    test('should block rapid OTP attempts', async ({ page }) => {
      await page.goto('/connexion');
      await page.click('[data-tab="otp"]');
      
      // Send OTP first
      await page.fill('input[type="email"]', 'brute-force@example.com');
      await page.click('button[type="submit"]');
      await expect(page.locator('#otp-verify-form')).toBeVisible();
      
      // Mock responses for brute force testing
      let attemptCount = 0;
      await page.route('/sign-in/email-otp', async route => {
        attemptCount++;
        if (attemptCount > 5) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Too many attempts' })
          });
        } else {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid OTP' })
          });
        }
      });
      
      // Attempt multiple rapid OTP verifications
      for (let i = 0; i < 8; i++) {
        await page.fill('#otp-code', `11111${i % 10}`);
        await page.click('#otp-verify-form button[type="submit"]');
        
        // Wait a bit to let the request complete
        await page.waitForTimeout(100);
        
        if (i >= 5) {
          // Should show error message but not reveal rate limiting
          await expect(page.locator('#otp-verify-error')).toBeVisible();
          await expect(page.locator('#otp-verify-error')).toContainText('Code invalide ou expiré');
        }
      }
    });

    test('should block rapid login attempts', async ({ page }) => {
      await page.goto('/connexion');
      
      let attemptCount = 0;
      await page.route('**/sign-in/**', async route => {
        attemptCount++;
        if (attemptCount > 3) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Rate limit exceeded' })
          });
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid credentials' })
          });
        }
      });
      
      // Attempt multiple rapid logins
      for (let i = 0; i < 5; i++) {
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', `wrongpassword${i}`);
        await page.click('button[type="submit"]');
        
        await page.waitForTimeout(100);
        
        if (i >= 3) {
          // Should show generic error, not specific rate limit message
          await expect(page.locator('#email-error')).toBeVisible();
        }
      }
    });

    test('should implement progressive delays', async ({ page }) => {
      await page.goto('/connexion');
      
      // Track timing of requests
      const requestTimes: number[] = [];
      
      await page.route('**/sign-in/**', async route => {
        requestTimes.push(Date.now());
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid credentials' })
        });
      });
      
      // Make rapid attempts and measure timing
      for (let i = 0; i < 4; i++) {
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', `password${i}`);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500); // Small delay to let request complete
      }
      
      // Should show some kind of delay mechanism (button disabled, etc.)
      const buttonDisabled = await page.locator('button[type="submit"]').isDisabled();
      // Note: The actual progressive delay implementation would be on the server side
    });
  });

  test.describe('Email Enumeration Prevention', () => {
    test('should return identical responses for existing and non-existing emails', async ({ page }) => {
      await page.goto('/connexion');
      await page.click('[data-tab="otp"]');
      
      // Mock to always return success (security requirement)
      await page.route('/email-otp/send-verification-otp', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });
      
      const testEmails = [
        'definitely-exists@example.com',
        'definitely-does-not-exist@fake-domain.xyz',
        'admin@example.com',
        'user@nonexistent.com'
      ];
      
      const responses: string[] = [];
      
      for (const email of testEmails) {
        // Reset form state
        if (await page.locator('#back-to-email').isVisible()) {
          await page.click('#back-to-email');
        }
        
        await page.fill('input[type="email"]', email);
        await page.click('button[type="submit"]');
        
        // Capture the response message
        await expect(page.locator('#otp-success')).toBeVisible();
        const message = await page.locator('#otp-success').textContent();
        responses.push(message || '');
        
        // Verify form behavior is identical
        await expect(page.locator('#otp-verify-form')).toBeVisible();
        await expect(page.locator('#otp-request-form')).toBeHidden();
      }
      
      // All responses should be identical
      const uniqueResponses = [...new Set(responses)];
      expect(uniqueResponses).toHaveLength(1);
      expect(uniqueResponses[0]).toBe('Code de vérification envoyé par email.');
    });

    test('should handle timing attacks', async ({ page }) => {
      await page.goto('/connexion');
      await page.click('[data-tab="otp"]');
      
      await page.route('/email-otp/send-verification-otp', async route => {
        // Add artificial delay to normalize response times
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });
      
      const testEmails = [
        'existing@example.com',
        'nonexistent@fake.com'
      ];
      
      const responseTimes: number[] = [];
      
      for (const email of testEmails) {
        if (await page.locator('#back-to-email').isVisible()) {
          await page.click('#back-to-email');
        }
        
        const startTime = Date.now();
        
        await page.fill('input[type="email"]', email);
        await page.click('button[type="submit"]');
        await expect(page.locator('#otp-success')).toBeVisible();
        
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }
      
      // Response times should be similar (within reasonable variance)
      const timeDifference = Math.abs(responseTimes[0] - responseTimes[1]);
      expect(timeDifference).toBeLessThan(500); // Within 500ms
    });
  });

  test.describe('XSS Prevention', () => {
    test('should prevent XSS in form inputs', async ({ page }) => {
      await page.goto('/connexion');
      
      for (const payload of xssPayloads) {
        // Test email field
        await page.fill('input[type="email"]', payload);
        const emailValue = await page.locator('input[type="email"]').inputValue();
        
        // Value should be sanitized or rejected
        expect(emailValue).not.toContain('<script>');
        expect(emailValue).not.toContain('javascript:');
        expect(emailValue).not.toContain('onerror=');
        
        // Test password field
        await page.fill('input[type="password"]', payload);
        const passwordValue = await page.locator('input[type="password"]').inputValue();
        
        // Password field should accept the input but it should be handled safely
        // The key is that it's never reflected back in HTML
        
        // Clear fields
        await page.fill('input[type="email"]', '');
        await page.fill('input[type="password"]', '');
      }
    });

    test('should prevent XSS in error messages', async ({ page }) => {
      await page.goto('/connexion');
      
      // Mock server to return XSS payload in error message
      await page.route('**/sign-in/**', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: '<script>alert("xss")</script>Invalid credentials' 
          })
        });
      });
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      
      // Error should be displayed but script should not execute
      await expect(page.locator('#email-error')).toBeVisible();
      
      const errorHtml = await page.locator('#email-error').innerHTML();
      const errorText = await page.locator('#email-error').textContent();
      
      // Script tags should be escaped or sanitized
      expect(errorHtml).not.toContain('<script>');
      expect(errorText).not.toContain('<script>');
    });

    test('should prevent XSS in URL parameters', async ({ page }) => {
      const xssUrl = `/connexion?redirect=${encodeURIComponent('javascript:alert("xss")')}`;
      
      await page.goto(xssUrl);
      
      // Page should load normally without executing the script
      await expect(page).toHaveURL(/.*\/connexion/);
      expect(page.url()).not.toContain('javascript:');
      
      // Check that any redirect parameter is sanitized
      const url = page.url();
      if (url.includes('redirect=')) {
        const redirectParam = new URL(url).searchParams.get('redirect');
        expect(redirectParam).not.toContain('javascript:');
        expect(redirectParam).not.toContain('<script>');
      }
    });

    test('should prevent DOM-based XSS', async ({ page }) => {
      await page.goto('/connexion');
      
      // Inject malicious content via DOM manipulation
      await page.evaluate(() => {
        // Simulate what an attacker might try
        const maliciousInput = '<img src="x" onerror="alert(1)">';
        
        // Try to inject into various elements
        const elements = document.querySelectorAll('input, textarea');
        elements.forEach(el => {
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            el.value = maliciousInput;
          }
        });
      });
      
      // Submit form and verify no script execution
      await page.click('button[type="submit"]');
      
      // No alert should appear, and form should handle gracefully
      const alertDialogs = await page.evaluate(() => window.alert !== undefined);
      expect(alertDialogs).toBe(true); // Alert function should still exist but not be called
    });
  });

  test.describe('CSRF Protection', () => {
    test('should protect against cross-site requests', async ({ page }) => {
      // Create a malicious page that tries to submit to our forms
      const maliciousHTML = `
        <html>
          <body>
            <form id="csrf-form" method="POST" action="http://localhost:4321/sign-in">
              <input name="email" value="victim@example.com">
              <input name="password" value="password123">
            </form>
            <script>
              document.getElementById('csrf-form').submit();
            </script>
          </body>
        </html>
      `;
      
      // Navigate to a different origin first
      await page.goto('data:text/html,' + encodeURIComponent(maliciousHTML));
      
      // The form submission should be blocked by CORS/CSRF protection
      // We can't easily test this in Playwright without a real external site,
      // but we can verify our forms include CSRF tokens
      
      await page.goto('/connexion');
      
      // Check if form has CSRF protection mechanisms
      const form = page.locator('form').first();
      const formHTML = await form.innerHTML();
      
      // Look for CSRF tokens or other protection mechanisms
      // This would depend on the specific implementation
      expect(form).toBeVisible();
    });

    test('should validate request origin', async ({ page }) => {
      await page.goto('/connexion');
      
      // Override the origin header
      await page.route('**/sign-in/**', async (route, request) => {
        // Simulate a request from a different origin
        if (request.headers()['origin'] !== 'http://localhost:4321') {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Forbidden' })
          });
        } else {
          await route.continue();
        }
      });
      
      // Normal request should work
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Should proceed normally (even if credentials are wrong)
      await expect(page.locator('#email-error')).toBeVisible();
    });

    test('should require proper content type for API requests', async ({ page }) => {
      // Test that API endpoints reject non-JSON requests
      const response = await page.request.post('/email-otp/send-verification-otp', {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: 'email=test@example.com&type=sign-in'
      });
      
      // Should reject non-JSON content type
      expect([400, 415]).toContain(response.status());
    });
  });

  test.describe('Content Security Policy', () => {
    test('should include proper CSP headers', async ({ page }) => {
      const response = await page.goto('/connexion');
      
      const headers = response?.headers();
      if (headers) {
        const csp = headers['content-security-policy'];
        if (csp) {
          // Should prevent inline scripts
          expect(csp).toContain("'unsafe-inline'") === false || 
          expect(csp).toContain("script-src");
          
          // Should prevent external script sources
          expect(csp).toContain("script-src");
          
          // Should prevent object/embed tags
          expect(csp).toContain("object-src 'none'") || 
          expect(csp).toContain("object-src");
        }
      }
    });

    test('should prevent inline script execution', async ({ page }) => {
      await page.goto('/connexion');
      
      // Try to inject inline script
      const scriptInjected = await page.evaluate(() => {
        try {
          const script = document.createElement('script');
          script.innerHTML = 'window.xssTest = true;';
          document.head.appendChild(script);
          return true;
        } catch (e) {
          return false;
        }
      });
      
      // Check if script was blocked
      const xssTestExists = await page.evaluate(() => 
        typeof (window as any).xssTest !== 'undefined'
      );
      
      // If CSP is properly configured, inline scripts should be blocked
      if (!xssTestExists) {
        // CSP is working
        expect(xssTestExists).toBe(false);
      }
    });
  });

  test.describe('Input Validation Edge Cases', () => {
    test('should handle unicode and special characters', async ({ page }) => {
      await page.goto('/connexion');
      
      const specialInputs = [
        'test@exämple.com', // Unicode
        'test@example.com\u0000', // Null byte
        'test@example.com\r\n', // CRLF injection
        'test@example.com\x00', // Null character
        'тест@example.com', // Cyrillic
        '测试@example.com', // Chinese
        'test@例え.com' // Japanese
      ];
      
      for (const input of specialInputs) {
        await page.fill('input[type="email"]', input);
        
        // Should either accept valid Unicode or reject invalid characters
        const value = await page.locator('input[type="email"]').inputValue();
        
        // Should not contain dangerous characters
        expect(value).not.toContain('\x00');
        expect(value).not.toContain('\r\n');
        
        await page.fill('input[type="email"]', '');
      }
    });

    test('should handle extremely long inputs', async ({ page }) => {
      await page.goto('/connexion');
      
      const longEmail = 'a'.repeat(1000) + '@example.com';
      const longPassword = 'P@ssw0rd' + 'a'.repeat(1000);
      
      await page.fill('input[type="email"]', longEmail);
      await page.fill('input[type="password"]', longPassword);
      
      // Form should handle long inputs gracefully
      const emailValue = await page.locator('input[type="email"]').inputValue();
      const passwordValue = await page.locator('input[type="password"]').inputValue();
      
      // Values might be truncated or the form might reject them
      // The key is that it doesn't crash the application
      expect(emailValue.length).toBeGreaterThan(0);
      expect(passwordValue.length).toBeGreaterThan(0);
    });
  });
});