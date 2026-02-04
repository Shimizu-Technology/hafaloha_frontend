import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and shows the Hafaloha branding', async ({ page }) => {
    await page.goto('/');

    // The page title should contain "Hafaloha"
    await expect(page).toHaveTitle(/Hafaloha/i);

    // The hero section or main content should be visible
    // The body should have meaningful content (not blank)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('shows navigation links', async ({ page }) => {
    await page.goto('/');

    // There should be a link/nav to the menu page
    const menuLink = page.locator('a[href="/menu"], a[href*="menu"]').first();
    await expect(menuLink).toBeVisible({ timeout: 10_000 });
  });

  test('hero section renders', async ({ page }) => {
    await page.goto('/');

    // The hero section should appear (it may be a background image container or text)
    // Look for a common hero indicator — either the "View Full Menu" link or "Popular Items"
    const heroContent = page.locator('text=/View Full Menu|Popular Items|Discover Our Menu/i').first();
    await expect(heroContent).toBeVisible({ timeout: 10_000 });
  });
});
