import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.context().clearPermissions();
    
    // Mock external resources to ensure consistent snapshots
    await page.route('**/*.woff2', route => route.fulfill({ 
      status: 200, 
      body: '', 
      contentType: 'font/woff2' 
    }));
    await page.route('**/*.woff', route => route.fulfill({ 
      status: 200, 
      body: '', 
      contentType: 'font/woff' 
    }));
  });

  test.describe('Authentication Pages Snapshots', () => {
    test('should match connexion page snapshot', async ({ page }) => {
      await page.goto('/connexion');
      
      // Wait for any potential loading states to complete
      await page.waitForLoadState('networkidle');
      
      // Take full page screenshot
      await expect(page).toHaveScreenshot('connexion-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match inscription page snapshot', async ({ page }) => {
      await page.goto('/inscription');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('inscription-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match password reset page snapshot', async ({ page }) => {
      await page.goto('/mot-de-passe-oublie');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('password-reset-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match connexion page with OTP tab active', async ({ page }) => {
      await page.goto('/connexion');
      await page.waitForLoadState('networkidle');
      
      // Switch to OTP tab
      await page.click('[data-tab="otp"]');
      await page.waitForTimeout(500); // Wait for tab switch animation
      
      await expect(page).toHaveScreenshot('connexion-otp-tab.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match OTP verification form', async ({ page }) => {
      await page.goto('/connexion');
      await page.click('[data-tab="otp"]');
      
      // Mock successful OTP send to get to verification state
      await page.route('/email-otp/send-verification-otp', route => 
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      );
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button[type="submit"]');
      
      // Wait for form transition
      await expect(page.locator('#otp-verify-form')).toBeVisible();
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('otp-verification-form.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Error States Snapshots', () => {
    test('should match error state on connexion page', async ({ page }) => {
      await page.goto('/connexion');
      
      // Mock error response
      await page.route('**/sign-in/**', route => 
        route.fulfill({ 
          status: 401, 
          contentType: 'application/json', 
          body: JSON.stringify({ error: 'Invalid credentials' })
        })
      );
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Wait for error to appear
      await expect(page.locator('#email-error')).toBeVisible();
      
      await expect(page).toHaveScreenshot('connexion-error-state.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match OTP error state', async ({ page }) => {
      await page.goto('/connexion');
      await page.click('[data-tab="otp"]');
      
      // Mock OTP send success and verification error
      await page.route('/email-otp/send-verification-otp', route => 
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      );
      await page.route('/sign-in/email-otp', route => 
        route.fulfill({ 
          status: 400, 
          contentType: 'application/json', 
          body: JSON.stringify({ error: 'Invalid OTP' })
        })
      );
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button[type="submit"]');
      await expect(page.locator('#otp-verify-form')).toBeVisible();
      
      await page.fill('#otp-code', '123456');
      await page.click('#otp-verify-form button[type="submit"]');
      
      await expect(page.locator('#otp-verify-error')).toBeVisible();
      
      await expect(page).toHaveScreenshot('otp-error-state.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match validation error state', async ({ page }) => {
      await page.goto('/connexion');
      
      // Trigger HTML5 validation by submitting empty form
      await page.click('button[type="submit"]');
      
      // Wait for validation to appear
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('validation-error-state.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Loading States Snapshots', () => {
    test('should match loading state during login', async ({ page }) => {
      await page.goto('/connexion');
      
      // Mock slow response to capture loading state
      await page.route('**/sign-in/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({ 
          status: 200, 
          contentType: 'application/json', 
          body: JSON.stringify({ success: true })
        });
      });
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      
      // Start the request and immediately capture loading state
      const submitPromise = page.click('button[type="submit"]');
      
      // Wait for loading state to appear
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      await page.waitForTimeout(100);
      
      await expect(page).toHaveScreenshot('login-loading-state.png', {
        fullPage: true,
        animations: 'disabled'
      });
      
      await submitPromise;
    });

    test('should match loading state during OTP send', async ({ page }) => {
      await page.goto('/connexion');
      await page.click('[data-tab="otp"]');
      
      // Mock slow response
      await page.route('/email-otp/send-verification-otp', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      });
      
      await page.fill('input[type="email"]', 'test@example.com');
      
      const submitPromise = page.click('button[type="submit"]');
      
      // Capture loading state
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      await page.waitForTimeout(100);
      
      await expect(page).toHaveScreenshot('otp-send-loading-state.png', {
        fullPage: true,
        animations: 'disabled'
      });
      
      await submitPromise;
    });
  });

  test.describe('Mobile Snapshots', () => {
    test('should match mobile connexion page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/connexion');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('connexion-mobile.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match tablet connexion page', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/connexion');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('connexion-tablet.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match mobile OTP verification', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/connexion');
      await page.click('[data-tab="otp"]');
      
      await page.route('/email-otp/send-verification-otp', route => 
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      );
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button[type="submit"]');
      await expect(page.locator('#otp-verify-form')).toBeVisible();
      
      await expect(page).toHaveScreenshot('otp-verification-mobile.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Theme Variations', () => {
    test('should match dark theme if available', async ({ page }) => {
      await page.goto('/connexion');
      
      // Try to activate dark theme if theme switcher exists
      const themeSwitcher = page.locator('[data-theme="dark"], .theme-toggle, .dark-mode-toggle');
      if (await themeSwitcher.count() > 0) {
        await themeSwitcher.click();
        await page.waitForTimeout(500); // Wait for theme transition
        
        await expect(page).toHaveScreenshot('connexion-dark-theme.png', {
          fullPage: true,
          animations: 'disabled'
        });
      } else {
        // Manually apply dark theme styles for testing
        await page.addStyleTag({
          content: `
            body {
              background: #1a1a1a !important;
              color: #ffffff !important;
            }
            input, button {
              background: #333333 !important;
              color: #ffffff !important;
              border-color: #555555 !important;
            }
          `
        });
        
        await expect(page).toHaveScreenshot('connexion-simulated-dark.png', {
          fullPage: true,
          animations: 'disabled'
        });
      }
    });

    test('should match high contrast mode', async ({ page }) => {
      await page.goto('/connexion');
      
      // Apply high contrast styles
      await page.addStyleTag({
        content: `
          * {
            background: white !important;
            color: black !important;
            border: 2px solid black !important;
          }
          button {
            background: black !important;
            color: white !important;
          }
        `
      });
      
      await expect(page).toHaveScreenshot('connexion-high-contrast.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Component Snapshots', () => {
    test('should match form components individually', async ({ page }) => {
      await page.goto('/connexion');
      
      // Snapshot the main form
      await expect(page.locator('form').first()).toHaveScreenshot('auth-form-component.png', {
        animations: 'disabled'
      });
      
      // Snapshot tab navigation if present
      const tabContainer = page.locator('.tab-container, [role="tablist"]');
      if (await tabContainer.count() > 0) {
        await expect(tabContainer).toHaveScreenshot('tab-navigation-component.png', {
          animations: 'disabled'
        });
      }
      
      // Snapshot individual input groups
      const inputGroups = page.locator('.form-group, .input-group');
      const groupCount = await inputGroups.count();
      
      if (groupCount > 0) {
        await expect(inputGroups.first()).toHaveScreenshot('input-group-component.png', {
          animations: 'disabled'
        });
      }
    });

    test('should match button variations', async ({ page }) => {
      await page.goto('/connexion');
      
      // Capture different button states
      const submitButton = page.locator('button[type="submit"]').first();
      
      // Normal state
      await expect(submitButton).toHaveScreenshot('button-normal.png', {
        animations: 'disabled'
      });
      
      // Hover state
      await submitButton.hover();
      await expect(submitButton).toHaveScreenshot('button-hover.png', {
        animations: 'disabled'
      });
      
      // Focus state
      await submitButton.focus();
      await expect(submitButton).toHaveScreenshot('button-focus.png', {
        animations: 'disabled'
      });
    });

    test('should match alert/message components', async ({ page }) => {
      await page.goto('/connexion');
      
      // Show error state
      await page.route('**/sign-in/**', route => 
        route.fulfill({ 
          status: 401, 
          contentType: 'application/json', 
          body: JSON.stringify({ error: 'Test error' })
        })
      );
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('#email-error')).toBeVisible();
      await expect(page.locator('#email-error')).toHaveScreenshot('error-alert-component.png', {
        animations: 'disabled'
      });
    });
  });
});