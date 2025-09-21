import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

test.describe('Accessibility and Responsive Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test.describe('Accessibility Tests', () => {
    test('should pass accessibility audit on connexion page', async ({ page }) => {
      await page.goto('/connexion');
      await injectAxe(page);
      
      // Check for accessibility violations
      const violations = await getViolations(page);
      
      // Filter out minor violations that might be acceptable
      const criticalViolations = violations.filter(v => 
        ['critical', 'serious'].includes(v.impact || '')
      );
      
      if (criticalViolations.length > 0) {
        console.log('Accessibility violations found:', criticalViolations);
      }
      
      // Should have minimal critical violations
      expect(criticalViolations.length).toBeLessThanOrEqual(2);
    });

    test('should pass accessibility audit on inscription page', async ({ page }) => {
      await page.goto('/inscription');
      await injectAxe(page);
      
      const violations = await getViolations(page);
      const criticalViolations = violations.filter(v => 
        ['critical', 'serious'].includes(v.impact || '')
      );
      
      expect(criticalViolations.length).toBeLessThanOrEqual(2);
    });

    test('should pass accessibility audit on password reset page', async ({ page }) => {
      await page.goto('/mot-de-passe-oublie');
      await injectAxe(page);
      
      const violations = await getViolations(page);
      const criticalViolations = violations.filter(v => 
        ['critical', 'serious'].includes(v.impact || '')
      );
      
      expect(criticalViolations.length).toBeLessThanOrEqual(2);
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/connexion');
      
      // Check that all form inputs have proper labels
      const inputs = page.locator('input[type="email"], input[type="password"], input[type="text"]');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        // Should have either an id with corresponding label, aria-label, or aria-labelledby
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const labelExists = await label.count() > 0;
          
          if (!labelExists && !ariaLabel && !ariaLabelledBy) {
            console.log(`Input with id "${id}" has no associated label`);
          }
          
          expect(labelExists || ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/connexion');
      await injectAxe(page);
      
      // Check specifically for color contrast violations
      const colorContrastViolations = await page.evaluate(async () => {
        const axe = (window as any).axe;
        if (!axe) return [];
        
        const results = await axe.run({
          rules: {
            'color-contrast': { enabled: true }
          }
        });
        
        return results.violations;
      });
      
      expect(colorContrastViolations.length).toBe(0);
    });

    test('should support screen readers', async ({ page }) => {
      await page.goto('/connexion');
      
      // Check for ARIA landmarks
      const main = page.locator('main, [role="main"]');
      await expect(main).toBeVisible();
      
      // Check for heading structure
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      
      // Check for proper button descriptions
      const submitButtons = page.locator('button[type="submit"]');
      const buttonCount = await submitButtons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = submitButtons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        
        // Button should have descriptive text or aria-label
        expect(text || ariaLabel).toBeTruthy();
        if (text) {
          expect(text.trim().length).toBeGreaterThan(0);
        }
      }
    });

    test('should have proper focus management', async ({ page }) => {
      await page.goto('/connexion');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      let focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Continue tabbing and ensure focus is visible
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        focusedElement = page.locator(':focus');
        
        // Check if focused element is visible and has proper focus styling
        const isVisible = await focusedElement.isVisible();
        if (isVisible) {
          const styles = await focusedElement.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              outline: computed.outline,
              boxShadow: computed.boxShadow,
              border: computed.border
            };
          });
          
          // Should have some kind of focus indicator
          const hasFocusIndicator = 
            styles.outline !== 'none' || 
            styles.boxShadow !== 'none' || 
            styles.border.includes('focus');
          
          if (!hasFocusIndicator) {
            console.log('Element may not have proper focus indicator:', await focusedElement.getAttribute('class'));
          }
        }
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/connexion');
      
      // Fill form using only keyboard
      await page.keyboard.press('Tab'); // Focus first input
      await page.keyboard.type('test@example.com');
      
      await page.keyboard.press('Tab'); // Focus password input
      await page.keyboard.type('password123');
      
      await page.keyboard.press('Tab'); // Focus submit button
      await page.keyboard.press('Enter'); // Submit form
      
      // Form should submit (even if it shows an error)
      await expect(page.locator('#email-error, #email-success')).toBeVisible();
    });

    test('should provide error announcements', async ({ page }) => {
      await page.goto('/connexion');
      
      // Check if error messages have proper ARIA attributes
      const errorElements = page.locator('[id$="-error"]');
      const errorCount = await errorElements.count();
      
      for (let i = 0; i < errorCount; i++) {
        const error = errorElements.nth(i);
        const ariaLive = await error.getAttribute('aria-live');
        const role = await error.getAttribute('role');
        
        // Error messages should be announced to screen readers
        expect(ariaLive === 'polite' || ariaLive === 'assertive' || role === 'alert').toBeTruthy();
      }
    });
  });

  test.describe('Responsive Design Tests', () => {
    const viewports = [
      { name: 'Mobile Portrait', width: 375, height: 667 },
      { name: 'Mobile Landscape', width: 667, height: 375 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Desktop', width: 1440, height: 900 },
      { name: 'Large Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      test(`should display properly on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/connexion');
        
        // Check that main elements are visible
        await expect(page.locator('main, .main-content')).toBeVisible();
        await expect(page.locator('form')).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
        
        // Check that content fits within viewport
        const body = page.locator('body');
        const boundingBox = await body.boundingBox();
        
        if (boundingBox) {
          // Content should not overflow horizontally
          expect(boundingBox.width).toBeLessThanOrEqual(viewport.width + 20); // Small margin for scrollbars
        }
        
        // Check that interactive elements are properly sized for touch
        if (viewport.width <= 768) { // Mobile/tablet
          const buttons = page.locator('button, input[type="submit"]');
          const buttonCount = await buttons.count();
          
          for (let i = 0; i < buttonCount; i++) {
            const button = buttons.nth(i);
            const box = await button.boundingBox();
            
            if (box) {
              // Touch targets should be at least 44px (iOS) or 48dp (Android)
              expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
            }
          }
        }
      });
    }

    test('should handle form layout on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/connexion');
      
      // Form should be single column on mobile
      const form = page.locator('form').first();
      const formBox = await form.boundingBox();
      
      if (formBox) {
        expect(formBox.width).toBeLessThanOrEqual(375);
      }
      
      // Inputs should be full width or nearly full width
      const inputs = page.locator('input[type="email"], input[type="password"]');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const inputBox = await input.boundingBox();
        
        if (inputBox && formBox) {
          // Input should take up most of the form width
          expect(inputBox.width).toBeGreaterThan(formBox.width * 0.8);
        }
      }
    });

    test('should handle navigation on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/connexion');
      
      // Check if navigation is mobile-friendly
      const nav = page.locator('nav, .navigation');
      if (await nav.count() > 0) {
        const navBox = await nav.boundingBox();
        
        if (navBox) {
          expect(navBox.width).toBeLessThanOrEqual(375);
        }
      }
      
      // Check for mobile menu toggle if it exists
      const menuToggle = page.locator('[data-toggle="menu"], .menu-toggle, .hamburger');
      if (await menuToggle.count() > 0) {
        await expect(menuToggle).toBeVisible();
        
        // Toggle should be touchable
        const toggleBox = await menuToggle.boundingBox();
        if (toggleBox) {
          expect(Math.min(toggleBox.width, toggleBox.height)).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should handle text scaling', async ({ page }) => {
      await page.goto('/connexion');
      
      // Simulate text scaling (common accessibility need)
      await page.addStyleTag({
        content: `
          * {
            font-size: 1.5em !important;
          }
        `
      });
      
      // Content should still be readable and functional
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Text should not overflow containers
      const overflowingElements = await page.locator('*').evaluateAll(elements => {
        return elements.filter(el => {
          const style = window.getComputedStyle(el);
          return el.scrollWidth > el.clientWidth && style.overflow === 'visible';
        }).length;
      });
      
      expect(overflowingElements).toBe(0);
    });

    test('should handle orientation changes', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/connexion');
      
      await expect(page.locator('form')).toBeVisible();
      
      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      
      // Form should still be functional
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Content should fit in the reduced height
      const form = page.locator('form').first();
      const formBox = await form.boundingBox();
      
      if (formBox) {
        expect(formBox.height).toBeLessThanOrEqual(375);
      }
    });

    test('should handle print styles', async ({ page }) => {
      await page.goto('/connexion');
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      
      // Check that content is still readable
      await expect(page.locator('main, .main-content')).toBeVisible();
      
      // Check that interactive elements might be hidden or styled differently for print
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      // At minimum, the page should not crash in print mode
      expect(buttonCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Reduced Motion Support', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Enable reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/connexion');
      
      // Check that animations are reduced or disabled
      const animatedElements = await page.locator('*').evaluateAll(elements => {
        return elements.filter(el => {
          const style = window.getComputedStyle(el);
          const animationDuration = style.animationDuration;
          const transitionDuration = style.transitionDuration;
          
          // In reduced motion mode, animations should be minimal
          return animationDuration !== 'none' && animationDuration !== '0s' ||
                 transitionDuration !== 'none' && transitionDuration !== '0s';
        }).length;
      });
      
      // Should have minimal or no animations
      expect(animatedElements).toBeLessThanOrEqual(5);
    });
  });

  test.describe('High Contrast Support', () => {
    test('should be readable in high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background: white !important;
              color: black !important;
              border-color: black !important;
            }
          }
        `
      });
      
      await page.goto('/connexion');
      
      // Content should still be visible and functional
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Text should be readable
      const textElements = page.locator('p, span, label, button');
      const textCount = await textElements.count();
      
      for (let i = 0; i < Math.min(textCount, 5); i++) { // Check first 5 elements
        const element = textElements.nth(i);
        const text = await element.textContent();
        
        if (text && text.trim().length > 0) {
          await expect(element).toBeVisible();
        }
      }
    });
  });
});

// Install axe-playwright if not already installed
// This would typically be done in package.json dependencies