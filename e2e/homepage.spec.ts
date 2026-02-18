import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and shows the Hafaloha branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Hafaloha/i);
  });

  test('shows navigation with menu link', async ({ page }) => {
    await page.goto('/');
    // Desktop nav has a visible "Menu" link
    const menuLink = page.locator('a[href="/menu"]').first();
    await expect(menuLink).toBeAttached({ timeout: 10_000 });
  });

  test('hero section renders with CTA', async ({ page }) => {
    await page.goto('/');
    // The hero or home section should show "View Full Menu", "Popular Items", or "Discover Our Menu"
    const cta = page.getByText(/View Full Menu|Popular Items|Discover Our Menu/i).first();
    await expect(cta).toBeVisible({ timeout: 10_000 });
  });

  test('footer shows restaurant info', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer, [role="contentinfo"]');
    await expect(footer).toBeVisible({ timeout: 10_000 });
    await expect(footer).toContainText('Hafaloha');
  });
});
