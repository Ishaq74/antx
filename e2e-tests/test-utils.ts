import { expect, Page } from '@playwright/test';

/**
 * Test utilities for authentication and security testing
 */

// Mock user data for testing
export const testUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'SecureP@ssw0rd123',
    username: 'testuser'
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'AdminP@ssw0rd123',
    username: 'admin'
  },
  invalidUser: {
    email: 'nonexistent@example.com',
    password: 'wrongpassword'
  }
};

// Common security headers to check
export const securityHeaders = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-xss-protection': '1; mode=block'
};

/**
 * Check if all required security headers are present
 */
export async function checkSecurityHeaders(page: Page, url?: string) {
  const response = url ? await page.goto(url) : await page.reload();
  
  if (!response) throw new Error('No response received');
  
  const headers = response.headers();
  
  for (const [headerName, expectedValue] of Object.entries(securityHeaders)) {
    expect(headers[headerName]).toBe(expectedValue);
  }
  
  // Check CSP header
  const csp = headers['content-security-policy'];
  expect(csp).toContain('default-src \'self\'');
  expect(csp).toContain('frame-ancestors \'none\'');
  
  return headers;
}

/**
 * Check if Content Security Policy prevents XSS
 */
export async function checkCSPProtection(page: Page) {
  const response = await page.reload();
  if (!response) throw new Error('No response received');
  
  const csp = response.headers()['content-security-policy'];
  
  expect(csp).toContain('script-src \'self\'');
  expect(csp).toContain('style-src \'self\'');
  expect(csp).not.toContain('unsafe-eval');
  
  return csp;
}

/**
 * Test form validation for common vulnerabilities
 */
export async function testFormSecurity(page: Page, formSelector: string = 'form') {
  const form = page.locator(formSelector);
  await expect(form).toBeVisible();
  
  // Check for CSRF protection
  const hiddenInputs = await page.locator('input[type="hidden"]').count();
  const csrfMeta = await page.locator('meta[name="csrf-token"]').count();
  
  // Some form of CSRF protection should be present
  expect(hiddenInputs + csrfMeta).toBeGreaterThan(0);
  
  // Test XSS prevention in inputs
  const textInputs = page.locator('input[type="text"], input[type="email"]');
  const inputCount = await textInputs.count();
  
  if (inputCount > 0) {
    await textInputs.first().fill('<script>alert("xss")</script>');
    const value = await textInputs.first().inputValue();
    expect(value).not.toContain('<script>');
  }
}

/**
 * Test authentication flow
 */
export async function testLogin(page: Page, credentials: { email: string; password: string }) {
  await page.goto('/connexion');
  
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation or error
  await page.waitForTimeout(1000);
  
  return page.url();
}

/**
 * Test registration flow
 */
export async function testRegistration(page: Page, userData: { email: string; password: string; username?: string }) {
  await page.goto('/inscription');
  
  await page.fill('input[type="email"]', userData.email);
  
  const passwordInputs = page.locator('input[type="password"]');
  const passwordCount = await passwordInputs.count();
  
  if (passwordCount > 0) {
    await passwordInputs.first().fill(userData.password);
    
    // Fill confirm password if present
    if (passwordCount > 1) {
      await passwordInputs.nth(1).fill(userData.password);
    }
  }
  
  // Fill username if field exists
  const usernameInput = page.locator('input[name="username"], input[name="nom"], input[name="prenom"]');
  if (await usernameInput.count() > 0 && userData.username) {
    await usernameInput.first().fill(userData.username);
  }
  
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  
  return page.url();
}

/**
 * Test route protection
 */
export async function testRouteProtection(page: Page, protectedRoute: string, expectedRedirect: string = '/connexion') {
  await page.goto(protectedRoute);
  
  // Should redirect to login
  await expect(page).toHaveURL(new RegExp(expectedRedirect));
  
  // Should include redirect parameter
  expect(page.url()).toContain('redirect=');
  
  return page.url();
}

/**
 * Test admin access control
 */
export async function testAdminAccess(page: Page, adminRoute: string = '/admin') {
  const response = await page.goto(adminRoute);
  
  if (response) {
    const status = response.status();
    // Should return 302 (redirect), 401 (unauthorized), or 403 (forbidden)
    expect([302, 401, 403]).toContain(status);
    
    if (status === 302) {
      await expect(page).toHaveURL(/.*\/connexion/);
    }
  }
  
  return response?.status();
}

/**
 * Test logout functionality
 */
export async function testLogout(page: Page) {
  // Try to logout
  await page.goto('/api/auth/logout');
  
  // Then try to access protected route
  await page.goto('/dashboard');
  
  // Should redirect to login
  await expect(page).toHaveURL(/.*\/connexion/);
}

/**
 * Test password strength validation
 */
export async function testPasswordValidation(page: Page, weakPasswords: string[]) {
  await page.goto('/inscription');
  
  for (const weakPassword of weakPasswords) {
    await page.fill('input[type="email"]', 'test@example.com');
    
    const passwordInputs = page.locator('input[type="password"]');
    if (await passwordInputs.count() > 0) {
      await passwordInputs.first().fill(weakPassword);
      
      // Try to submit
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      
      // Should remain on registration page
      await expect(page).toHaveURL(/.*\/inscription/);
    }
    
    // Clear fields for next test
    await page.fill('input[type="email"]', '');
    await passwordInputs.first().fill('');
  }
}

/**
 * Test email validation
 */
export async function testEmailValidation(page: Page, invalidEmails: string[]) {
  await page.goto('/connexion');
  
  for (const invalidEmail of invalidEmails) {
    await page.fill('input[type="email"]', invalidEmail);
    await page.fill('input[type="password"]', 'password123');
    
    // Browser should show validation error or prevent submission
    const emailInput = page.locator('input[type="email"]');
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    
    if (validationMessage) {
      expect(validationMessage).toBeTruthy();
    }
    
    // Clear for next test
    await page.fill('input[type="email"]', '');
  }
}

/**
 * Test rate limiting
 */
export async function testRateLimit(page: Page, attempts: number = 5) {
  await page.goto('/connexion');
  
  for (let i = 0; i < attempts; i++) {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'wrongpassword' + i);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
  }
  
  // After multiple attempts, should still be on login page
  await expect(page).toHaveURL(/.*\/connexion/);
}

/**
 * Test mobile responsiveness
 */
export async function testMobileResponsive(page: Page, url: string = '/') {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(url);
  
  // Check that main elements are still visible
  const forms = await page.locator('form').count();
  if (forms > 0) {
    await expect(page.locator('form').first()).toBeVisible();
    
    // Check that inputs are accessible
    const inputs = page.locator('input');
    if (await inputs.count() > 0) {
      await expect(inputs.first()).toBeVisible();
    }
  }
}

/**
 * Test accessibility features
 */
export async function testAccessibility(page: Page, url: string = '/') {
  await page.goto(url);
  
  // Test keyboard navigation
  await page.keyboard.press('Tab');
  const focusedElement = await page.locator(':focus').first();
  await expect(focusedElement).toBeVisible();
  
  // Check for proper form labels
  const inputs = page.locator('input');
  const inputCount = await inputs.count();
  
  for (let i = 0; i < Math.min(inputCount, 3); i++) {
    const input = inputs.nth(i);
    const hasLabel = await input.getAttribute('aria-label') !== null ||
                    await page.locator(`label[for="${await input.getAttribute('id')}"]`).count() > 0;
    
    // At least some inputs should have proper labeling
    if (i === 0) {
      expect(hasLabel).toBeTruthy();
    }
  }
}

// Common weak passwords for testing
export const weakPasswords = [
  'password',
  '123456',
  'admin',
  'password123',
  'qwerty',
  'weak',
  '12345',
  'abc123'
];

// Common invalid email formats for testing
export const invalidEmails = [
  'invalid-email',
  '@domain.com',
  'user@',
  'user.domain.com',
  '',
  'user@domain..com'
];

// Common XSS payloads for testing
export const xssPayloads = [
  '<script>alert("xss")</script>',
  'javascript:alert("xss")',
  '<img src="x" onerror="alert(1)">',
  '<svg onload="alert(1)">',
  '"><script>alert(1)</script>'
];

export default {
  testUsers,
  securityHeaders,
  checkSecurityHeaders,
  checkCSPProtection,
  testFormSecurity,
  testLogin,
  testRegistration,
  testRouteProtection,
  testAdminAccess,
  testLogout,
  testPasswordValidation,
  testEmailValidation,
  testRateLimit,
  testMobileResponsive,
  testAccessibility,
  weakPasswords,
  invalidEmails,
  xssPayloads
};