import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'jerry.shimizutechnology@gmail.com';
const TEST_PASSWORD = 'Clawdbot123!';

test.describe('Authentication', () => {
  test('login page loads with form fields', async ({ page }) => {
    await page.goto('/login');

    // Heading
    await expect(page.getByRole('heading', { name: /Welcome Back/i })).toBeVisible({ timeout: 10_000 });

    // Email + password fields
    await expect(page.getByPlaceholder(/you@example/i)).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();

    // Sign In button
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder(/you@example/i).fill('bad@example.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Should show an error
    await expect(page.getByText(/Invalid|incorrect|error/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('admin login succeeds and redirects away from /login', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder(/you@example/i).fill(TEST_EMAIL);
    await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Should navigate away from /login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
    expect(page.url()).not.toContain('/login');
  });

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup');

    // Should have a heading for creating account
    await expect(
      page.getByRole('heading', { name: /Create.*Account|Sign Up|Register/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
