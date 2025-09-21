import { test, expect } from '@playwright/test';

test.describe('Basic Authentication Tests', () => {
  
  test('should load connexion page successfully', async ({ page }) => {
    await page.goto('/connexion');
    
    // Basic elements should be present
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation message for empty form', async ({ page }) => {
    await page.goto('/connexion');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should trigger HTML5 validation or show custom error
    const emailInput = page.locator('input[type="email"]');
    const isRequired = await emailInput.getAttribute('required');
    
    expect(isRequired).not.toBeNull();
  });

  test('should have proper page title and meta', async ({ page }) => {
    await page.goto('/connexion');
    
    // Check page title
    const title = await page.title();
    expect(title).toContain('Connexion');
    
    // Check basic meta tags
    const description = page.locator('meta[name="description"]');
    await expect(description).toBeAttached();
  });
});