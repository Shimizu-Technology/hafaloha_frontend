import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = 'jerry.shimizutechnology@gmail.com';
const TEST_PASSWORD = 'Clawdbot123!';

/**
 * Helper: log in via the UI and wait for redirect.
 */
async function loginAsAdmin(page: Page) {
  await page.goto('/login');

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(TEST_EMAIL);
  await passwordInput.fill(TEST_PASSWORD);

  const submitBtn = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In")').first();
  await submitBtn.click();

  // Wait for navigation away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

test.describe('Admin Dashboard', () => {
  test('admin can access /admin after login', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to admin dashboard
    await page.goto('/admin');

    // The admin dashboard lazy-loads — wait for one of the tab labels to appear.
    // Tabs: Analytics, Orders, Menu, Wholesale, Merchandise, Promos, Reservations, Staff, Settings
    // Use getByRole to target visible button/link text and avoid hidden mobile-nav elements.
    const ordersTab = page.getByRole('button', { name: /Orders/i }).or(
      page.getByRole('tab', { name: /Orders/i })
    ).or(
      page.locator('button:visible:has-text("Orders"), [role="tab"]:visible:has-text("Orders")')
    ).first();
    await expect(ordersTab).toBeVisible({ timeout: 20_000 });
  });

  test('admin dashboard shows order management', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');

    // Look for the Orders tab or any visible admin content
    const ordersContent = page.locator(':visible:has-text("Orders")').first();
    await expect(ordersContent).toBeVisible({ timeout: 15_000 });
  });

  test('unauthenticated users are redirected from /admin', async ({ page }) => {
    // Try to access admin without logging in
    await page.goto('/admin');

    // Should redirect to login page
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });
});
