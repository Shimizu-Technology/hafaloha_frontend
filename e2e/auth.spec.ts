import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'jerry.shimizutechnology@gmail.com';
const TEST_PASSWORD = 'Clawdbot123!';

test.describe('Authentication', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');

    // Should show the login form with email and password fields
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput).toBeVisible();

    // Should have a "Welcome Back" or login heading
    const heading = page.locator('text=/Welcome Back|Log In|Sign In/i').first();
    await expect(heading).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('bad@example.com');
    await passwordInput.fill('wrongpassword');

    // Submit the form
    const submitBtn = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In")').first();
    await submitBtn.click();

    // Should show an error message
    const errorMessage = page.locator('text=/Invalid|incorrect|error|failed/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 10_000 });
  });

  test('admin login succeeds and redirects', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);

    // Submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In")').first();
    await submitBtn.click();

    // After successful login, should redirect away from /login
    // Wait for navigation — either to homepage or admin
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });

    // Should no longer be on the login page
    expect(page.url()).not.toContain('/login');
  });

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup');

    // Should show sign-up form fields
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    // Should have first/last name fields or a heading
    const heading = page.locator('text=/Create.*Account|Sign Up|Register/i').first();
    await expect(heading).toBeVisible();
  });
});
