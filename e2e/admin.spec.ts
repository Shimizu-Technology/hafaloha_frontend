import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = 'jerry.shimizutechnology@gmail.com';
const TEST_PASSWORD = 'Clawdbot123!';

/** Log in via the login form and wait until we leave /login. */
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder(/you@example/i).fill(TEST_EMAIL);
  await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

/** Navigate to admin after login and wait for heading. */
async function gotoAdmin(page: Page) {
  await loginAsAdmin(page);
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: /Admin Dashboard/i })
  ).toBeVisible({ timeout: 20_000 });
}

test.describe('Admin Dashboard', () => {
  test('admin can access /admin after login', async ({ page }) => {
    await gotoAdmin(page);
    // Heading is verified in gotoAdmin — just ensure we're on the right page
    expect(page.url()).toContain('/admin');
  });

  test('admin dashboard shows navigation tabs', async ({ page }) => {
    await gotoAdmin(page);

    // Check that the key tab buttons appear
    for (const tab of ['Analytics', 'Orders', 'Menu', 'Staff', 'Settings']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${tab}$`, 'i') })).toBeVisible();
    }
  });

  test('can click Orders tab', async ({ page }) => {
    await gotoAdmin(page);

    // Click the Orders tab
    await page.getByRole('button', { name: /^Orders$/i }).click();

    // Should see orders-related content (even if empty — the tab panel renders)
    // Use .first() because there are nested <main> elements in the layout
    await expect(page.locator('main').first()).toContainText(/order/i, { timeout: 10_000 });
  });

  test('unauthenticated users are redirected from /admin', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });
});
